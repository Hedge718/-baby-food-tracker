// src/components/FoodInventoryItem.jsx
import React, { useMemo, useState } from 'react';
import { Minus, Plus, Calendar, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Props it will happily accept (others are ignored):
 * - item: { id, name, cubesLeft, status, madeOn|createdAt, hidden? }
 * - onLogUsage(item, amount, isTrash)
 * - onUpdateStatus(itemId, status)
 * - onSetPortions(itemId, newCubesLeft)
 * - onSetAging(itemId, dateStringYYYYMMDD)
 * - onToggleHidden(itemId, hidden)   // NEW (optional)
 * - onRestock(item)                  // optional – if provided, show a Restock button
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
  onToggleHidden, // NEW
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

  const portionsLeft = Number(item?.cubesLeft || 0);
  const maxTrack = Math.max(portionsLeft, 12); // keep a sensible track length

  const useNow = async () => {
    const n = Math.max(1, Math.min(Number(qty) || 1, portionsLeft));
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

  const toggleHidden = async () => {
    if (!onToggleHidden) return;
    await onToggleHidden(item.id, !item.hidden);
  };

  const progressPct = useMemo(() => {
    const left = portionsLeft;
    const max = maxTrack;
    return Math.max(0, Math.min(100, Math.round((left / max) * 100)));
  }, [portionsLeft, maxTrack]);

  // id for the collapsible region (for accessibility)
  const detailsId = `inv-more-${item?.id}`;

  return (
    <div className="rounded-2xl border border-[var(--border-light)] dark:border-[var(--border-dark)] bg-white dark:bg-[var(--card-dark)] p-3 sm:p-4">
      {/* Row 1: name + chips + status + hide */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[15px] clamp-2">{item?.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="badge" aria-label={`${portionsLeft} portions left`}>
              {portionsLeft} portions
            </span>
            {madeOnDate && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`Made on ${format(new Date(madeOnDate), 'MM/dd/yyyy')}`}
              >
                <Calendar size={12} /> {format(new Date(madeOnDate), 'MM/dd')}
              </span>
            )}
            {item?.hidden && <span className="badge">Hidden</span>}
          </div>
        </div>

        {/* Status */}
        <select
          className="rounded-xl border bg-transparent px-2 py-1 text-sm"
          value={item?.status || 'Frozen'}
          onChange={(e) => onUpdateStatus && onUpdateStatus(item.id, e.target.value)}
          aria-label={`Storage status for ${item?.name || 'item'}`}
        >
          <option>Frozen</option>
          <option>Fridge</option>
          <option>Pantry</option>
        </select>

        {/* Hide / Unhide (optional) */}
        {onToggleHidden && (
          <button
            className="ml-1 w-9 h-9 rounded-xl border flex items-center justify-center"
            onClick={toggleHidden}
            title={item.hidden ? 'Unhide' : 'Hide'}
            aria-label={item.hidden ? 'Unhide' : 'Hide'}
          >
            {item.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        )}
      </div>

      {/* Row 2: progress */}
      <div
        className="mt-3 h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/70"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxTrack}
        aria-valuenow={portionsLeft}
        aria-label={`${item?.name || 'Item'} portions remaining`}
        aria-describedby={detailsId}
      >
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
            className="w-24 h-9 text-sm rounded-xl border bg-transparent px-3"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="0"
            step="1"
            value={editPortions}
            onChange={(e) => setEditPortions(e.target.value)}
            aria-label={`Set portions for ${item?.name || 'item'}`}
            placeholder="Set…"
          />
          <button
            className="pill"
            onClick={savePortions}
            aria-label={`Confirm portions for ${item?.name || 'item'}`}
          >
            Set
          </button>
        </div>

        {/* Use stepper */}
        <div className="ml-auto flex items-center gap-2">
          <button
            className="w-10 h-10 rounded-xl border flex items-center justify-center"
            onClick={() => setQty((q) => Math.max(1, Number(q || 1) - 1))}
            aria-label={`Decrease ${item?.name || 'item'} quantity by 1`}
            title="Decrease"
          >
            <Minus size={16} />
          </button>
          <input
            className="w-14 h-10 text-center rounded-xl border bg-transparent"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || '1', 10) || 1)}
            aria-label={`Quantity to use for ${item?.name || 'item'}`}
          />
          <button
            className="w-10 h-10 rounded-xl border flex items-center justify-center"
            onClick={() =>
              setQty((q) => Math.min(portionsLeft || 1, Number(q || 1) + 1))
            }
            aria-label={`Increase ${item?.name || 'item'} quantity by 1`}
            title="Increase"
          >
            <Plus size={16} />
          </button>
          <button
            className="pill"
            onClick={useNow}
            aria-label={`Use ${qty} portion${qty > 1 ? 's' : ''} of ${item?.name || 'item'} now`}
          >
            Use
          </button>
        </div>
      </div>

      {/* Row 4: collapsible extras */}
      <div className="mt-2">
        <button
          className="text-xs text-muted inline-flex items-center gap-1"
          onClick={() => setOpenMore((v) => !v)}
          aria-expanded={openMore}
          aria-controls={detailsId}
        >
          {openMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          More
        </button>

        {openMore && (
          <div id={detailsId} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Aging */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input h-9"
                value={aging}
                onChange={(e) => setAging(e.target.value)}
                aria-label={`Set made-on date for ${item?.name || 'item'}`}
              />
              <button
                className="pill"
                onClick={saveAging}
                aria-label={`Confirm made-on date for ${item?.name || 'item'}`}
              >
                Set
              </button>
              <button
                className="pill"
                onClick={() => {
                  const ymd = toYMD(new Date());
                  setAging(ymd);
                }}
                aria-label={`Set made-on date for ${item?.name || 'item'} to today`}
              >
                Today
              </button>
            </div>

            {/* Optional: Restock */}
            {onRestock && (
              <div className="flex items-center">
                <button
                  className="pill"
                  onClick={() => onRestock(item)}
                  aria-label={`Restock ${item?.name || 'item'}`}
                >
                  Restock
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
