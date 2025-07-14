import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getHistory, deleteHistoryItem } from '../firebase';

export function useFeedingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        try {
            const data = await getHistory();
            setHistory(data);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const handleDeleteHistoryItem = async (historyId) => {
    const originalHistory = [...history];
    setHistory(prev => prev.filter(item => item.id !== historyId));

    try {
        await deleteHistoryItem(historyId);
        toast.success('History item deleted.');
    } catch (err) {
        toast.error('Failed to delete item.');
        setHistory(originalHistory);
    }
  };

  return { history, loading, setHistory, handleDeleteHistoryItem };
}