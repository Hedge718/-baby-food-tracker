import React, { useState, useMemo } from 'react';
import RecipeCard from './RecipeCard';
import { Search } from 'lucide-react';

export default function RecipeList({ recipes, inventory, fullInventory, onDeleteRecipe, onCookRecipe }) {
  const [searchTerm, setSearchTerm] = useState('');

  const recipesWithCookability = useMemo(() => {
    return recipes.map(recipe => {
      let possibleCooks = Infinity;
      const canCook = recipe.ingredients.every(ingredient => {
        const inventoryItem = (inventory || []).find(item => item.id === ingredient.itemId);
        if (!inventoryItem || inventoryItem.cubesLeft < ingredient.cubesRequired) {
          possibleCooks = 0;
          return false;
        }
        possibleCooks = Math.min(possibleCooks, Math.floor(inventoryItem.cubesLeft / ingredient.cubesRequired));
        return true;
      });
      return { ...recipe, canCook, possibleCooks };
    });
  }, [recipes, inventory]);

  const filteredAndSortedRecipes = recipesWithCookability
    .filter(recipe => recipe.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.possibleCooks - a.possibleCooks);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl">Saved Recipes</h3>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input type="text" placeholder="Search recipes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-9 !py-1.5 text-sm" />
        </div>
      </div>
      {filteredAndSortedRecipes.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedRecipes.map(recipe => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe}
              fullInventory={fullInventory}
              onDelete={onDeleteRecipe}
              onCook={onCookRecipe}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">
          No matching recipes found.
        </p>
      )}
    </div>
  );
}