// src/components/FeedingHistory.jsx
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';

/**
 * Props:
 * - history: Array<{ id, name, amount, type: 'eaten'|'wasted'|'recipe', timestamp: Date }>
 * - loading: boolean
 * - onDelete?: (id: string) => void
 */
export default function FeedingHistory({ history = [], loading, onDelete }) {
  const items = useMemo(() => {
    // Sort newest first (defensive in case context doesn't already)
    return [...history].sort((a, b) => {
      const at = new Date(a.timestamp || 0).getTime();
      const bt = new Date(b.timestamp || 0).getTime();
      return bt - at;
    });
  }, [history]);

  if (loading) {
    return <div className="card text-muted">Loading history…</div>;
  }

  if (!items.length) {
    return <div className="card text-muted">No feeding history yet.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((row) => {
        const ts = row.timestamp ? new Date(row.timestamp) : null;
        const when = ts && !isNaN(ts) ? format(ts, 'MMM d, h:mma') : '—';

        let badgeText = 'Fed';
        let badgeClass = 'bg-green-100 text-green-700 border-green-200';
        if (row.type === 'wasted') {
          badgeText = 'Wasted';
          badgeClass = 'bg-rose-100 text-rose-700 border-rose-200';
        } else if (row.type === 'recipe') {
          badgeText = 'Recipe';
          badgeClass = 'bg-sky-100 text-sky-700 border-sky-200';
        }

        return (
          <div
            key={row.id}
            className="card !p-3 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`badge border ${badgeClass}`}
                  aria-label={`Entry type: ${badgeText}`}
                >
                  {badgeText}
                </span>
                <span className="font-semibold truncate">{row.name}</span>
                {row.amount != null && (
                  <span className="text-xs text-muted">({row.amount})</span>
                )}
              </div>
              <div className="text-xs text-muted mt-1">{when}</div>
            </div>

            {onDelete && (
              <button
                aria-label={`Delete ${row.name} entry`}
                onClick={() => onDelete(row.id)}
                className="text-slate-400 hover:text-red-500 flex-shrink-0"
                title="Delete entry"
              >
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
