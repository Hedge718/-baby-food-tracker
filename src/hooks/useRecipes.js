import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getRecipes, addRecipe, deleteRecipe, cookRecipeInDb } from '../firebase';

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getRecipes();
        setRecipes(data);
      } catch (err) {
        console.error("Failed to fetch recipes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAddRecipe = async (recipeData) => {
    const toastId = toast.loading('Saving recipe...');
    try {
      const newRecipe = await addRecipe(recipeData);
      setRecipes(prev => [...prev, newRecipe]);
      toast.success('Recipe saved!', { id: toastId });
    } catch (err) {
      toast.error('Failed to save recipe.', { id: toastId });
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    const originalRecipes = [...recipes];
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    try {
      await deleteRecipe(recipeId);
      toast.success('Recipe deleted.');
    } catch (err) {
      toast.error('Failed to delete recipe.');
      setRecipes(originalRecipes);
    }
  };

  const handleCookRecipe = async (recipe, inventory, setInventory, setHistory) => {
    const toastId = toast.loading(`Cooking ${recipe.name}...`);
    try {
        await cookRecipeInDb(recipe, inventory);

        let updatedInventory = [...inventory];
        for (const ingredient of recipe.ingredients) {
            updatedInventory = updatedInventory.map(invItem => 
              invItem.id === ingredient.itemId 
                ? {...invItem, cubesLeft: invItem.cubesLeft - ingredient.cubesRequired}
                : invItem
            );
        }
        setInventory(updatedInventory.filter(item => item.cubesLeft > 0));
        
        const newHistoryEntry = {
            name: recipe.name,
            amount: recipe.ingredients.reduce((acc, ing) => acc + ing.cubesRequired, 0),
            type: 'recipe',
            id: Date.now().toString(),
            timestamp: new Date()
        };
        setHistory(prev => [newHistoryEntry, ...prev]);

        toast.success(`${recipe.name} cooked and logged!`, { id: toastId });

    } catch (err) {
        console.error("Failed to cook recipe:", err);
        toast.error(`Failed to cook ${recipe.name}.`, { id: toastId });
    }
  };

  return { recipes, loading, handleAddRecipe, handleDeleteRecipe, handleCookRecipe };
}