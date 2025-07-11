import React, { useState, useEffect } from 'react';

export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    // This is where you would make a real API call in the future.
    // For now, we leave it empty to remove mock data.
    setSuggestions([]);
  }, []);

  return (
    <div className="card">
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">AI Suggestions</h3>
        {suggestions.length > 0 ? (
            <ul className="space-y-2">
                {suggestions.map(s => (
                    <li key={s.id} className="p-3 bg-sky-50 dark:bg-sky-900/50 rounded-lg text-sm">
                        {s.text}
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm">
                No AI suggestions available at this time.
            </p>
        )}
    </div>
  );
}