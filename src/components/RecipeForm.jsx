import React, { useState, useEffect } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';
import AddIngredientModal from './AddIngredientModal'; // Import the new modal

export default function RecipeForm({ onAddRecipe }) {
  const { fullInventory } = useData();
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const selectedNames = ingredients.map(ing => ing.name).filter(Boolean);
    if (selectedNames.length > 0) {
      const uniqueNames = [...new Set(selectedNames)];
      setName(uniqueNames.join(' & '));
    } else {
      setName('');
    }
  }, [ingredients]);

  const handleAddIngredient = (ingredient) => {
    setIngredients(prev => [...prev, ingredient]);
  };

  const removeIngredient = (itemId) => {
    setIngredients(prev => prev.filter(ing => ing.itemId !== itemId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && ingredients.length > 0) {
      onAddRecipe({ name, ingredients });
      setName('');
      setIngredients([]);
    } else {
      toast.error('Please provide a recipe name and at least one ingredient.');
    }
  };

  return (
    <>
      <div className="card">
        <h3 className="text-xl mb-4">Create a New Recipe</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recipeName" className="block text-sm font-bold text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mb-1">Recipe Name</label>
            <input 
              id="recipeName" 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Auto-suggested or enter custom" 
              className="input-field" 
              required 
            />
          </div>

          <div>
              <label className="block text-sm font-bold text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mb-1">Ingredients</label>
              <div className="space-y-2 min-h-[50px]">
                  {ingredients.map((ing) => (
                      <div key={ing.itemId} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <span className="font-semibold">{ing.name} ({ing.cubesRequired} cubes)</span>
                          <button type="button" onClick={() => removeIngredient(ing.itemId)} className="p-1 text-slate-400 hover:text-red-500 rounded-full">
                              <X size={16}/>
                          </button>
                      </div>
                  ))}
              </div>
              <button type="button" onClick={() => setIsModalOpen(true)} className="btn-secondary w-full !mt-3 text-sm !py-2">
                  <Plus size={16}/> Add Ingredient
              </button>
          </div>

          <button type="submit" className="btn-primary w-full !mt-6">
            <Save size={20} />
            <span>Save Recipe</span>
          </button>
        </form>
      </div>

      <AddIngredientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveIngredient={handleAddIngredient}
      />
    </>
  );
}