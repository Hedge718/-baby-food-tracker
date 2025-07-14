import React from 'react';
import { Utensils, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecipeCard({ recipe, fullInventory, onDelete, onCook }) {
  const handleCookClick = () => {
    if (recipe.canCook) {
      onCook(recipe);
    } else {
      toast.error("Not enough ingredients to cook this recipe.");
    }
  };

  const getIngredientName = (id) => {
    const item = (fullInventory || []).find(i => i.id === id);
    return item ? item.name : 'Unknown Food';
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)]">
      <div className="flex justify-between items-start">
        <h4 className="text-lg font-bold">{recipe.name}</h4>
        <button onClick={() => onDelete(recipe.id)} className="text-slate-400 hover:text-red-500 transition-colors">
          <X size={18} />
        </button>
      </div>
      <ul className="mt-2 text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">
        {recipe.ingredients.map((ing, index) => (
          <li key={index}>• {ing.cubesRequired} cubes of {getIngredientName(ing.itemId)}</li>
        ))}
      </ul>
      <button 
        onClick={handleCookClick}
        disabled={!recipe.canCook}
        className="btn-primary w-full text-sm !py-1.5 mt-4 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
      >
        <Utensils size={16}/> Cook This
      </button>
    </div>
  );
}