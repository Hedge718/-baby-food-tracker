import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePortions } from "../services/actions";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

/**
 * Shows an inventory item with "Use 1" / "Use N" controls.
 * - Disables use when cubesLeft <= 0
 * - Tiny pulse animation on decrement
 * - If parent passes onLogUsage/onUpdateStatus (DataContext), we call those too.
 */
export default function FoodInventoryItem({ item, onLogUsage, onUpdateStatus }) {
  const [n, setN] = useState(2);
  const [localLeft, setLocalLeft] = useState(Number(item.cubesLeft || 0));
  const prevLeftRef = useRef(localLeft);

  useEffect(() => {
    setLocalLeft(Number(item.cubesLeft || 0));
  }, [item.cubesLeft]);

  const mut = useMutation({
    mutationFn: async (qty) => {
      if (onLogUsage) {
        // Update via parent handler (keeps your DataContext in sync)
        const next = Math.max(0, Number(item.cubesLeft || 0) - Number(qty || 0));
        await onLogUsage({ id: item.id, name: item.name }, next, Number(qty || 0), false);
      } else {
        // Fallback: hit Firestore directly
        await usePortions(item.id, qty);
      }
    },
    onMutate: (qty) => {
      // optimistic local pulse
      prevLeftRef.current = localLeft;
      setLocalLeft((v) => Math.max(0, Number(v || 0) - Number(qty || 0)));
      navigator.vibrate && navigator.vibrate(8);
    },
    onError: () => {
      setLocalLeft(prevLeftRef.current);
      toast.error("Couldn’t update item");
    },
    onSuccess: () => {
      toast.success("Updated");
    },
  });

  const disabled = localLeft <= 0 || mut.isPending;
  const useOne = () => !disabled && mut.mutate(1);
  const useN = (e) => {
    e.preventDefault();
    const qty = Math.max(1, Number(n || 0));
    if (!disabled) mut.mutate(qty);
  };

  return (
    <div className="p-4 rounded-2xl border bg-white/70 dark:bg-[#1f2937]/50 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-semibold truncate">{item.name}</div>
        <div className="text-xs opacity-70">{item.status || "—"}</div>
      </div>

      <div className="flex items-center gap-3">
        <motion.span
          key={localLeft} // re-trigger animation when number changes
          initial={{ scale: 1.0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.25 }}
          className="text-lg tabular-nums w-10 text-right"
        >
          {localLeft}
        </motion.span>

        <button
          onClick={useOne}
          disabled={disabled}
          className={`h-10 px-3 rounded-xl border active:scale-[0.98] ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label={`Use 1 from ${item.name}`}
        >
          Use 1
        </button>

        <form onSubmit={useN} className="flex items-center gap-2">
          <input
            value={n}
            onChange={(e) => setN(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-10 w-16 rounded-xl border px-2 text-center"
            aria-label="Quantity to use"
          />
          <button
            type="submit"
            disabled={disabled}
            className={`h-10 px-3 rounded-xl border active:scale-[0.98] ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Use N
          </button>
        </form>
      </div>
    </div>
  );
}
