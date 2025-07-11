// src/hooks/useFeedingHistory.js
import { useState, useEffect } from 'react';
import { getHistory } from '../firebase';
import { mockHistory } from '../mockData';

export function useFeedingHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      setHistory(mockHistory);
    } else {
      getHistory().then(setHistory);
    }
  }, []);

  return { history, setHistory };
}
