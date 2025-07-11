import { useState, useEffect } from 'react';
import { getRecipes } from '../firebase';
import { mockRecipes } from '../mockData';

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  useEffect(() => {
    if (import.meta.env.DEV) setRecipes(mockRecipes);
    else getRecipes().then(setRecipes);
  }, []);
  return { recipes, setRecipes };
}