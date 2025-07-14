import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Plus, Save } from 'lucide-react';
import { useData } from '../context/DataContext'; // Import useData

export default function RecipeForm({ onAddRecipe }) {
  const { inventory } = useData(); // Get inventory directly from context
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ itemId: null, cubesRequired: 1 }]);

  const availableInventory = (inventory || [])
    .filter(item => item.cubesLeft > 0)
    .map(item => ({ value: item.id, label: item.name }));

  useEffect(() => {
    const selectedNames = ingredients.map(ing => ing.itemId?.label).filter(Boolean);
    if (selectedNames.length > 0) {
      setName(selectedNames.join(' & '));
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
    newIngredients[index].cubesRequired = Number(value);
    setIngredients(newIngredients);
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { itemId: null, cubesRequired: 1 }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const recipeIngredients = ingredients
      .filter(ing => ing.itemId)
      .map(ing => ({ itemId: ing.itemId.value, cubesRequired: ing.cubesRequired }));
      
    if (name.trim() && recipeIngredients.length > 0) {
      onAddRecipe({ name, ingredients: recipeIngredients });
      setName('');
      setIngredients([{ itemId: null, cubesRequired: 1 }]);
    } else {
      alert('Please provide a recipe name and at least one valid ingredient.');
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl mb-4">Create a New Recipe</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ... form JSX remains the same ... */}
      </form>
    </div>
  );
}