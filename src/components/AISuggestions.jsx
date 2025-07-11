import React, { useState, useEffect } from 'react';
import { mockSuggestions } from '../mockData';

export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (import.meta.env.DEV) setSuggestions(mockSuggestions);
    else setSuggestions([]); // replace with real API call later
  }, []);
  if (!suggestions.length) return <p>No suggestions.</p>;
  return (
    <ul className="space-y-2">
      {suggestions.map(s => (
        <li key={s.id} className="p-2 bg-white dark:bg-gray-700 rounded">{s.text}</li>
      ))}
    </ul>
  );
}