// Example for: src/hooks/useFeedingHistory.js
// Apply the same pattern to useMealPlans.js and useRecipes.js
import { useState, useEffect } from 'react';
import { getHistory } from '../firebase'; // or getMealPlans, getRecipes

export function useFeedingHistory() { // or useMealPlans, useRecipes
  const [history, setHistory] = useState([]); // or plans, recipes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getHistory(); // or getMealPlans(), getRecipes()
        setHistory(data); // or setPlans(data), setRecipes(data)
      } catch (err) {
        setError(err);
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { history, loading, error, setHistory }; // or plans, recipes
}