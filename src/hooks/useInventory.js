import { useState, useEffect } from 'react';
import { getInventory, addInventoryItem } from '../firebase';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getInventory();
        setInventory(data);
      } catch (err) {
        setError(err);
        console.error("Failed to fetch inventory:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Expose the add function
  return { inventory, loading, error, setInventory, addInventoryItem };
}