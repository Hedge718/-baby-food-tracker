import React, { useState } from 'react';
import { useRecipes } from '../hooks/useRecipes';
import { useInventory } from '../hooks/useInventory';

export default function RecipeForm() {
  const { recipes, setRecipes } = useRecipes();
  const { inventory } = useInventory();
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ itemId: '', cubesRequired: 0 }]);

  const addRow = () => setIngredients(prev => [...prev, { itemId: '', cubesRequired: 0 }]);
  const handle = (i, f, v) => { const newI = [...ingredients]; newI[i][f] = v; setIngredients(newI); };
  const submit = e => {
    e.preventDefault();
    const id = Date.now().toString();
    setRecipes(prev => [...prev, { id, name, ingredients }]);
    setName(''); setIngredients([{ itemId: '', cubesRequired: 0 }]);
  };

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 p-4 rounded shadow space-y-4">
      <h3 className="text-lg font-semibold">New Recipe</h3>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
             className="w-full p-2 border rounded" />
      {ingredients.map((ing,i) => (
        <div key={i} className="flex space-x-2">
          <select value={ing.itemId} onChange={e => handle(i,'itemId',e.target.value)}
                  className="flex-1 p-2 border rounded">
            <option value="">Item</option>
            {inventory.map(x=> <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <input type="number" value={ing.cubesRequired} onChange={e => handle(i,'cubesRequired',+e.target.value)}
                 placeholder="Cubes" className="w-20 p-2 border rounded" />
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-blue-600">+ Add</button>
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Save Recipe</button>
    </form>
  );
}