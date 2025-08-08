// src/components/InventoryQuickList.jsx
import React, { useMemo, useState } from 'react';
import { Minus, Plus, Clock } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';

function daysOld(item) {
  const d = item.madeOn instanceof Date
    ? item.madeOn
    : item.madeOn ? new Date(item.madeOn) : (item.createdAt ? new Date(item.createdAt) : null);
  if (!d || !isValid(d)) return 'new';
  return formatDistanceToNowStrict(d, { unit: 'day', addSuffix: false }); // e.g., "13 days"
}

export default function InventoryQuickList() {
  const { inventory, handleLogUsage } = useData();
  const [search, setSearch] = useState('');
  const [qtyMap, setQtyMap] = useState({}); // {id: number}

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (inventory || [])
      .filter(i => (i.cubesLeft ?? 0) > 0)
      .filter(i => !q || i.name.toLowerCase().includes(q))
      .sort((a, b) => (a.madeOn || a.createdAt || 0) - (b.madeOn || b.createdAt || 0)); // oldest first
  }, [inventory, search]);

  const setQty = (id, v) => setQtyMap(s => ({ ...s, [id]: Math.max(1, v) }));
  const dec = (id) => setQty(id, (qtyMap[id] ?? 1) - 1);
  const inc = (id, max) => setQty(id, Math.min(max, (qtyMap[id] ?? 1) + 1));

  const useNow = async (item, amount) => {
    const n = Math.max(1, Math.min(item.cubesLeft, amount ?? 1));
    await handleLogUsage(item, n, false);
    setQtyMap(s => ({ ...s, [item.id]: 1 }));
  };

  return (
    <section className="card">
      <h3 className="text-xl font-bold mb-3">Quick Use</h3>

      <div className="mb-3">
        <input
          className="input"
          placeholder="Search inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputMode="search"
        />
      </div>

      <ul className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
        {items.map((it) => {
          const qty = qtyMap[it.id] ?? 1;
          const days = daysOld(it);
          return (
            <li key={it.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] clamp-2">{it.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="badge">{/^\d+/.test(days) ? days.replace(' days', 'd') : 'new'}</span>
                  <span className="text-muted text-xs">{it.cubesLeft} portions</span>
                </div>
              </div>

              {/* stepper */}
              <div className="flex items-center gap-2">
                <button
                  className="w-9 h-9 rounded-xl border flex items-center justify-center"
                  onClick={() => dec(it.id)}
                  aria-label="decrease"
                >
                  <Minus size={16} />
                </button>
                <input
                  value={qty}
                  onChange={(e) => setQty(it.id, parseInt(e.target.value || '1', 10) || 1)}
                  className="w-12 h-9 text-center rounded-xl border bg-transparent"
                  inputMode="numeric"
                />
                <button
                  className="w-9 h-9 rounded-xl border flex items-center justify-center"
                  onClick={() => inc(it.id, it.cubesLeft)}
                  aria-label="increase"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                className="ml-2 shrink-0 pill"
                onClick={() => useNow(it, qty)}
              >
                Use
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="py-6 text-center text-muted">Nothing available. Add food above to get started.</li>
        )}
      </ul>
    </section>
  );
}
