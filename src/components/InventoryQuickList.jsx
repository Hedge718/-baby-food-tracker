// src/components/InventoryQuickList.jsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInventory } from "../services/inventory";
import { usePortions } from "../services/actions";
import { toast } from "react-hot-toast";

const DAY = 24 * 60 * 60 * 1000;
const ageInDays = (it) => {
  const d = it?.madeOn || it?.createdAt;
  const dt = d instanceof Date ? d : d ? new Date(d) : null;
  if (!dt || isNaN(dt.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - dt.getTime()) / DAY));
};

export default function InventoryQuickList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["inventory"],
    queryFn: listInventory,
  });

  // hide zeroes
  const nonEmpty = useMemo(
    () => (items || []).filter((it) => Number(it.cubesLeft ?? 0) > 0),
    [items]
  );

  // filter + sort: low stock first, then oldest
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = nonEmpty;
    if (q) arr = arr.filter((it) => (it.name || "").toLowerCase().includes(q));
    return [...arr].sort((a, b) => {
      const aLeft = Number(a.cubesLeft ?? 0), bLeft = Number(b.cubesLeft ?? 0);
      if (aLeft !== bLeft) return aLeft - bLeft; // fewer first
      const A = ageInDays(a), B = ageInDays(b);
      if (A == null && B == null) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      return B - A; // older first
    });
  }, [nonEmpty, search]);

  const useMut = useMutation({
    mutationFn: ({ id, qty }) => usePortions(id, qty),
    onMutate: async ({ id, qty }) => {
      await qc.cancelQueries({ queryKey: ["inventory"] });
      const prev = qc.getQueryData(["inventory"]);
      qc.setQueryData(["inventory"], (old) =>
        (old || []).map((it) =>
          it.id === id
            ? { ...it, cubesLeft: Math.max(0, Number(it.cubesLeft || 0) - Number(qty || 0)) }
            : it
        )
      );
      navigator.vibrate && navigator.vibrate(8);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["inventory"], ctx.prev);
      toast.error("Couldn’t update item");
    },
    onSuccess: () => toast.success("Updated"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const handleUse = (id, qty = 1) => useMut.mutate({ id, qty });

  return (
    <div className="rounded-2xl border p-4 surface">
      <div className="flex items-center gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory…"
          className="input"
        />
      </div>

      {isLoading && <div className="p-3">Loading inventory…</div>}
      {isError && <div className="p-3 text-red-600">Failed to load inventory.</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="p-3 text-sm opacity-70">No items with portions left.</div>
      )}

      <ul className="divide-y">
        {filtered.map((it) => {
          const age = ageInDays(it);
          return (
            <li key={it.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs text-muted">{it.status || "—"}</div>
              </div>

              <div className="flex items-center gap-3">
                {age != null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      age >= 90
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                        : age >= 30
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
                    }`}
                    title="Age"
                  >
                    {age}d
                  </span>
                )}

                <span className="text-lg tabular-nums w-10 text-right">{it.cubesLeft ?? 0}</span>

                <button
                  onClick={() => handleUse(it.id, 1)}
                  disabled={useMut.isPending}
                  className="h-10 px-3 rounded-xl border active:scale-[0.98]"
                  aria-label={`Use 1 from ${it.name}`}
                >
                  Use 1
                </button>

                <UseN onUse={(qty) => handleUse(it.id, qty)} disabled={useMut.isPending} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UseN({ onUse, disabled }) {
  const [n, setN] = useState(2);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const qty = Math.max(1, Number(n || 0));
        onUse(qty);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={n}
        onChange={(e) => setN(e.target.value)}
        inputMode="numeric"
        pattern="[0-9]*"
        className="h-10 w-16 rounded-xl border px-2 text-center"
        aria-label="Quantity to use"
      />
      <button type="submit" disabled={disabled} className="h-10 px-3 rounded-xl border active:scale-[0.98]">
        Use N
      </button>
    </form>
  );
}
