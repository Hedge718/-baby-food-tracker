import { useState, useEffect } from 'react';
import { getMealPlans } from '../firebase';

export function useMealPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        let data;
        if (import.meta.env.DEV) {
          data = mockPlans;
        } else {
          data = await getMealPlans();
        }
        setPlans(data);
      } catch (err) {
        setError(err);
        console.error("Failed to fetch meal plans:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { plans, loading, error, setPlans };
}