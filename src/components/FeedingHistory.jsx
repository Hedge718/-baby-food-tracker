// src/components/FeedingHistory.jsx
import React from 'react';
import { useFeedingHistory } from '../hooks/useFeedingHistory';
import { format } from 'date-fns';

export default function FeedingHistory() {
  const { history } = useFeedingHistory();
  if (!history.length) return <p>No feeding history.</p>;
  return (
    <ul className="space-y-2">
      {history.map(h => (
        <li
          key={h.id}
          className="p-2 bg-white dark:bg-gray-700 rounded flex justify-between"
        >
          <span>
            {h.name} — {h.amount}c
          </span>
          <span className="text-sm text-gray-500">
            {format(new Date(h.timestamp), 'PP p')}
          </span>
        </li>
      ))}
    </ul>
  );
}
