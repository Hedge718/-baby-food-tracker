// src/components/FoodInventoryItem.jsx
import React, { useMemo, useState } from 'react';
import { Minus, Plus, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Props it will happily accept (others are ignored):
 * - item: { id, name, cubesLeft, status, madeOn|createdAt }
 * - onLogUsage(item, amount, isTrash)
 * - onUpdateStatus(itemId, status)
 * - onSetPortions(itemId, newCubesLeft)
 * - onSetAging(itemId, dateStringYYYYMMDD)
 * - onRestock(item)   // optional – if provided, show a Restock button
 *
 * This component is resilient: all handlers are optional.
 */

function toYMD(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (isNaN(x)) return '';
  return x.toISOString().slice(0, 10);
}

export default function FoodInventoryItem({
  item,
  onLogUsage,
  onUpdateStatus,
  onSetPortions,
  onSetAging,
  onRestock,
}) {
  const [qty, setQty] = useState(1);
  const [editPortions, setEditPortions] = useState(item?.cubesLeft ?? 0);
  const [openMore, setOpenMore] = useState(false);

  const madeOnDate = useMemo(
    () => toYMD(item?.madeOn || item?.createdAt),
    [item?.madeOn, item?.createdAt]
  );
  const [aging, setAging] = useState(madeOnDate);

  const useNow = async () => {
    const n = Math.max(1, Math.min(Number(qty) || 1, Number(item?.cubesLeft || 0)));
    if (onLogUsage) await onLogUsage(item, n, false);
    setQty(1);
  };

  const savePortions = async () => {
    const n = Math.max(0, Number(editPortions) || 0);
    if (onSetPortions) await onSetPortions(item.id, n);
  };

  const saveAging = async () => {
    if (!aging) return;
    if (onSetAging) await onSetAging(item.id, aging);
  };

  const progressPct = useMemo(() => {
    const left = Number(item?.cubesLeft || 0);
    const max = Math.max(left, 12); // keep a sensible track length
    return Math.max(0, Math.min(100, Math.round((left / max) * 100)));
  }, [item?.cubesLeft]);

  return (
    <div className="rounded-2xl border border-[var(--border-light)] dark:border-[var(--border-dark)] bg-white dark:bg-[var(--card-dark)] p-3 sm:p-4">
      {/* Row 1: name + age + status */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[15px] clamp-2">{item?.name}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className="badge">{item?.cubesLeft ?? 0} portions</span>
            {madeOnDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} /> {format(new Date(madeOnDate), 'MM/dd')}
              </span>
            )}
          </div>
        </div>

        {/* Compact status select */}
        <select
          className="rounded-xl border bg-transparent px-2 py-1 text-sm"
          value={item?.status || 'Frozen'}
          onChange={(e) => onUpdateStatus && onUpdateStatus(item.id, e.target.value)}
        >
          <option>Frozen</option>
          <option>Fridge</option>
          <option>Pantry</option>
        </select>
      </div>

      {/* Row 2: progress */}
      <div className="mt-3 h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/70">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #c084fc, #7c3aed)',
          }}
        />
      </div>

      {/* Row 3: quick actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Portions setter */}
        <div className="flex items-center gap-2">
          <input
            className="w-20 h-9 text-sm rounded-xl border bg-transparent px-3"
            inputMode="numeric"
            value={editPortions}
            onChange={(e) => setEditPortions(e.target.value)}
            aria-label="Set portions"
            placeholder="Set…"
          />
          <button className="pill" onClick={savePortions}>Set</button>
        </div>

        {/* Use stepper */}
        <div className="ml-auto flex items-center gap-2">
          <button
            className="w-9 h-9 rounded-xl border flex items-center justify-center"
            onClick={() => setQty((q) => Math.max(1, Number(q || 1) - 1))}
            aria-label="decrease"
          >
            <Minus size={16} />
          </button>
          <input
            className="w-12 h-9 text-center rounded-xl border bg-transparent"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || '1', 10) || 1)}
            aria-label="quantity"
          />
          <button
            className="w-9 h-9 rounded-xl border flex items-center justify-center"
            onClick={() => setQty((q) => Math.min(Number(item?.cubesLeft || 1), Number(q || 1) + 1))}
            aria-label="increase"
          >
            <Plus size={16} />
          </button>
          <button className="pill" onClick={useNow}>Use</button>
        </div>
      </div>

      {/* Row 4: collapsible extras */}
      <div className="mt-2">
        <button
          className="text-xs text-muted inline-flex items-center gap-1"
          onClick={() => setOpenMore((v) => !v)}
        >
          {openMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          More
        </button>

        {openMore && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Aging */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input h-9"
                value={aging}
                onChange={(e) => setAging(e.target.value)}
              />
              <button className="pill" onClick={saveAging}>Set</button>
              <button
                className="pill"
                onClick={() => {
                  const ymd = toYMD(new Date());
                  setAging(ymd);
                }}
              >
                Today
              </button>
            </div>

            {/* Optional: Restock */}
            {onRestock && (
              <div className="flex items-center">
                <button className="pill" onClick={() => onRestock(item)}>Restock</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
