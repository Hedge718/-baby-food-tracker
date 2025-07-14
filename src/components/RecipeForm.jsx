import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';

export default function RecipeForm({ onAddRecipe }) {
  const { inventory } = useData();
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ itemId: null, cubesRequired: 1 }]);

  const availableInventory = (inventory || [])
    .filter(item => item.cubesLeft > 0)
    .map(item => ({ value: item.id, label: item.name }));

  useEffect(() => {
    const selectedNames = ingredients
      .map(ing => ing.itemId?.label)
      .filter(Boolean);
    
    if (selectedNames.length > 0) {
      const uniqueNames = [...new Set(selectedNames)];
      setName(uniqueNames.join(' & '));
    } else {
      setName('');
    }
  }, [ingredients]);

  const handleIngredientChange = (index, selectedOption) => {
    const newIngredients = [...ingredients];
    newIngredients[index].itemId = selectedOption;
    setIngredients(newIngredients);
  };

  const handleCubesChange = (index, value) => {
    const newIngredients = [...ingredients];
    const cubes = Math.max(1, Number(value)); // Ensure cubes are at least 1
    newIngredients[index].cubesRequired = cubes;
    setIngredients(newIngredients);
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { itemId: null, cubesRequired: 1 }]);
  };

  const removeIngredientRow = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const recipeIngredients = ingredients
      .filter(ing => ing.itemId && ing.cubesRequired > 0)
      .map(ing => ({ itemId: ing.itemId.value, cubesRequired: ing.cubesRequired }));
      
    if (name.trim() && recipeIngredients.length > 0) {
      onAddRecipe({ name, ingredients: recipeIngredients });
      setName('');
      setIngredients([{ itemId: null, cubesRequired: 1 }]);
    } else {
      toast.error('Please provide a recipe name and at least one valid ingredient.');
    }
  };

  return (
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
            <div className="space-y-2">
            {ingredients.map((ing, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Select
                        options={availableInventory}
                        value={ing.itemId}
                        onChange={(option) => handleIngredientChange(index, option)}
                        className="flex-grow"
                        placeholder="Select Food..."
                        styles={{ control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.15rem' }) }}
                    />
                    <input 
                        type="number" 
                        value={ing.cubesRequired} 
                        onChange={(e) => handleCubesChange(index, e.target.value)}
                        className="input-field w-20 text-center"
                        min="1"
                    />
                    <button type="button" onClick={() => removeIngredientRow(index)} className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                        <Trash2 size={18}/>
                    </button>
                </div>
            ))}
            </div>
            <button type="button" onClick={addIngredientRow} className="btn-secondary w-full !mt-3 text-xs !py-1.5">
                <Plus size={16}/> Add Ingredient
            </button>
        </div>

        <button type="submit" className="btn-primary w-full !mt-6">
          <Save size={20} />
          <span>Save Recipe</span>
        </button>
      </form>
    </div>
  );
}