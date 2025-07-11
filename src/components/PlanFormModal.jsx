import React, { useState } from 'react';
import { useMealPlans } from '../hooks/useMealPlans';
import { useRecipes } from '../hooks/useRecipes';
import { useInventory } from '../hooks/useInventory';
import { format } from 'date-fns';

export default function PlanFormModal({ date, onClose }) {
  const { plans, setPlans } = useMealPlans();
  const { recipes } = useRecipes();
  const { inventory } = useInventory();
  const [mealType, setMealType] = useState('breakfast');
  const [isRecipe, setIsRecipe] = useState(false);
  const [itemId, setItemId] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    const newPlan = { id: Date.now().toString(), date: { toDate: () => date }, mealType, itemId, isRecipe };
    setPlans(prev => [...prev, newPlan]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded w-80">
        <h3 className="text-lg font-semibold mb-4">Plan for {format(date, 'PPP')}</h3>
        <label className="block mb-2">Meal Type
          <select value={mealType} onChange={e => setMealType(e.target.value)}
                  className="w-full p-2 border rounded">
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </label>
        <label className="flex items-center mb-2">
          <input type="checkbox" checked={isRecipe} onChange={e => setIsRecipe(e.target.checked)}
                 className="mr-2" /> Use Recipe
        </label>
        <label className="block mb-4">{isRecipe ? 'Recipe' : 'Food Item'}
          <select value={itemId} onChange={e => setItemId(e.target.value)}
                  className="w-full p-2 border rounded">
            <option value="">Select...</option>
            {(isRecipe ? recipes : inventory).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </form>
    </div>
  );
}