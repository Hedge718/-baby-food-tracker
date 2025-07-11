import React from 'react';
import { useRecipes } from '../hooks/useRecipes';

export default function RecipeList() {
  const { recipes, setRecipes } = useRecipes();
  return (
    <ul className="space-y-2">
      {recipes.map(r => (
        <li key={r.id} className="p-2 bg-white dark:bg-gray-700 rounded flex justify-between">
          <span>{r.name}</span>
          <button onClick={() => setRecipes(prev => prev.filter(x=>x.id !== r.id))}
                  className="text-red-600">Delete</button>
        </li>
      ))}
    </ul>
  );
}