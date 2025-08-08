import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  logFeedingAndConsume as logFeeding,
  undoFeeding,
  addInventoryItem,
  addShoppingItem,
} from "../services/actions";

// Numeric input helper (mobile-friendly)
const Numeric = (props) => (
  <input
    {...props}
    inputMode="numeric"
    pattern="[0-9]*"
    enterKeyHint="done"
    className={`input ${props.className || ""}`}
  />
);

// Local storage keys for defaults
const LS = {
  type: "bf_last_feed_type",
  food: "bf_last_feed_food",
  qty: "bf_last_feed_qty",
};

/* -------------------- Feeding -------------------- */
function FeedingForm({ onDone }) {
  // optional: use inventory names for suggestions
  let invNames = [];
  try {
    const { useData } = require("../context/DataContext");
    const data = useData?.();
    invNames = (data?.inventory || data?.items || []).map((i) => i.name).filter(Boolean);
  } catch (_) {}

  const suggestions = useMemo(() => {
    const staticOpts = ["Pea purée", "Carrot purée", "Banana mash", "Yogurt", "Oatmeal"];
    return Array.from(new Set([...(invNames || []), ...staticOpts])).slice(0, 30);
  }, [invNames]);

  const qc = useQueryClient();

  // Defaults from localStorage
  const [type, setType] = useState(() => localStorage.getItem(LS.type) || "Puree");
  const [food, setFood] = useState(() => localStorage.getItem(LS.food) || "");
  const [qty, setQty] = useState(() => Number(localStorage.getItem(LS.qty) || 2));

  useEffect(() => localStorage.setItem(LS.type, type), [type]);
  useEffect(() => localStorage.setItem(LS.food, food), [food]);
  useEffect(() => localStorage.setItem(LS.qty, String(qty)), [qty]);

  const buzz = () => navigator.vibrate && navigator.vibrate(8);

  const addFeed = useMutation({
    mutationFn: (payload) => logFeeding(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["inventory"] }); // in case we consumed
      const tId = toast((t) => (
        <div className="text-sm">
          Feeding logged.
          <button
            className="ml-3 underline"
            onClick={async () => {
              try {
                await undoFeeding({
                  historyId: res?.historyId,
                  invItemId: res?.invItemId,
                  amount: res?.amount,
                });
                qc.invalidateQueries({ queryKey: ["history"] });
                qc.invalidateQueries({ queryKey: ["inventory"] });
                toast.success("Undone");
              } catch (e) {
                toast.error(e?.message || "Undo failed");
              } finally {
                toast.dismiss(t.id);
              }
            }}
          >
            Undo
          </button>
        </div>
      ), { duration: 10000 });
      if (res?.consumed) {
        toast.success(`Consumed ${res.amount} from ${res.itemName} (left: ${res.newCubesLeft})`);
      }
      onDone();
      buzz();
    },
    onError: (e) => toast.error(e?.message || "Failed to log feeding"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addFeed.mutate({ type, food: food.trim(), qty: Number(qty || 0), when: new Date() });
      }}
    >
      <label className="block mb-1">Type</label>
      <div className="flex gap-2 mb-3">
        {["Puree", "Finger Food", "Formula"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-3 py-2 rounded-full border text-sm ${
              type === t ? "bg-black text-white dark:bg-white dark:text-black" : ""
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="block mb-1">Food (what was fed)</label>
      <input
        list="feeding-food-suggestions"
        value={food}
        onChange={(e) => setFood(e.target.value)}
        className="input mb-3"
        placeholder="e.g., Pea purée"
      />
      <datalist id="feeding-food-suggestions">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <label className="block mb-1">Quantity (cubes/oz)</label>
      <Numeric value={qty} onChange={(e) => setQty(e.target.value)} className="mb-4" />

      <button className="btn-primary w-full h-12 rounded-xl" disabled={addFeed.isPending}>
        {addFeed.isPending ? "Saving…" : "Log feeding"}
      </button>
    </form>
  );
}

/* -------------------- Inventory -------------------- */
function InventoryForm({ onDone }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [cubes, setCubes] = useState(6);
  const [status, setStatus] = useState("Frozen");

  const buzz = () => navigator.vibrate && navigator.vibrate(8);

  const addInv = useMutation({
    mutationFn: (payload) => addInventoryItem(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Added to inventory");
      onDone();
      buzz();
    },
    onError: (e) => toast.error(e?.message || "Failed to add"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addInv.mutate({
          name: name.trim(),
          cubesLeft: Number(cubes || 0),
          status,
          madeOn: new Date(),
        });
      }}
    >
      <label className="block mb-1">Item</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input mb-3"
        placeholder="Pea purée"
        enterKeyHint="next"
      />

      <label className="block mb-1">Portions</label>
      <Numeric value={cubes} onChange={(e) => setCubes(e.target.value)} className="mb-3" />

      <label className="block mb-1">Status</label>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="select mb-4">
        <option>Frozen</option>
        <option>Fresh</option>
      </select>

      <button className="btn-primary w-full h-12 rounded-xl" disabled={addInv.isPending}>
        {addInv.isPending ? "Saving…" : "Add to inventory"}
      </button>
    </form>
  );
}

/* -------------------- Shopping -------------------- */
function ShoppingForm({ onDone }) {
  const qc = useQueryClient();
  const [item, setItem] = useState("");

  const buzz = () => navigator.vibrate && navigator.vibrate(8);

  const addShop = useMutation({
    mutationFn: (payload) => addShoppingItem(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shoppingList"] });
      toast.success("Added to shopping list");
      onDone();
      buzz();
    },
    onError: (e) => toast.error(e?.message || "Failed to add"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addShop.mutate({ text: item.trim(), done: false, createdAt: new Date() });
      }}
    >
      <label className="block mb-1">Item</label>
      <input
        value={item}
        onChange={(e) => setItem(e.target.value)}
        className="input mb-3"
        placeholder="Spinach, yogurt…"
      />

      <button className="btn-primary w-full h-12 rounded-xl" disabled={addShop.isPending}>
        {addShop.isPending ? "Saving…" : "Add to list"}
      </button>
    </form>
  );
}

export default function QuickAddForms({ tab, onDone }) {
  if (tab === "Feeding") return <FeedingForm onDone={onDone} />;
  if (tab === "Inventory") return <InventoryForm onDone={onDone} />;
  return <ShoppingForm onDone={onDone} />;
}
