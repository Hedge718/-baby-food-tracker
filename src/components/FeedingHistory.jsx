import React from 'react';
import { format } from 'date-fns';

export default function FeedingHistory({ history, loading, error }) {
  if (loading) return <p className="text-slate-500">Loading history...</p>;
  if (error) return <p className="text-red-500">Could not load feeding history.</p>;
  if (!history.length) return <p className="text-slate-500">No feeding history recorded yet.</p>;

  return (
    <div className="card">
      <ul className="space-y-3">
        {history.map(h => (
          <li key={h.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex justify-between items-center">
            <div>
              <span className="font-semibold">{h.name}</span> — {h.amount} cubes
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {format(new Date(h.timestamp), 'MMM d, h:mm a')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}