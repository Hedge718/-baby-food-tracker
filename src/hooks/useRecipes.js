import { useState, useEffect } from 'react';
import { getRecipes } from '../firebase';

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        let data;
        if (import.meta.env.DEV) {
          data = mockRecipes;
        } else {
          data = await getRecipes();
        }
        setRecipes(data);
      } catch (err) {
        setError(err);
        console.error("Failed to fetch recipes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { recipes, loading, error, setRecipes };
}