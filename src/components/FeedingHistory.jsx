// src/components/FeedingHistory.jsx
import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";

const toTitleCase = (s = "") =>
  String(s).trim().replace(/\s+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function formatDayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yday = new Date(); yday.setDate(today.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function typeChipClasses(t) {
  const tt = (t || '').toLowerCase();
  if (tt === 'wasted') return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
  if (tt === 'eaten' || tt === 'feeding') return "bg-[var(--accent-100)] text-[var(--accent-600)]";
  if (tt === 'recipe') return "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-200";
  return "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-200";
}

export default function FeedingHistory({ history = [], loading, onDelete }) {
  const grouped = useMemo(() => {
    const groups = new Map();
    (history || []).forEach((h) => {
      const ts = h.timestamp ? new Date(h.timestamp) : new Date();
      const key = `${ts.getFullYear()}-${ts.getMonth() + 1}-${ts.getDate()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(h);
    });
    for (const arr of groups.values()) {
      arr.sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp)));
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, arr]) => {
        const [y,m,d] = key.split("-").map(Number);
        const label = formatDayLabel(new Date(y, m - 1, d));
        return { label, items: arr };
      });
  }, [history]);

  if (loading) return <div>Loading…</div>;
  if (!history?.length) return <div className="opacity-70">No history yet.</div>;

  return (
    <div className="space-y-6">
      {grouped.map(({ label, items }) => (
        <div key={label}>
          <div className="sticky top-0 z-10 sticky-header text-sm font-semibold opacity-80 px-1 py-1">{label}</div>
          <ul className="divide-y rounded-2xl border surface">
            {items.map((h) => {
              const name = toTitleCase(h.name || "");
              const time = h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
              return (
                <li key={h.id || name + time} className="flex items-center justify-between p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-xs text-muted flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full ${typeChipClasses(h.type)}`}>
                        {h.type || "feeding"}
                      </span>
                      <span>{time}</span>
                      <span className="tabular-nums">{h.amount ?? 0}</span>
                    </div>
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(h.id)}
                      className="p-2 rounded-xl border hover:bg-black/5"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
