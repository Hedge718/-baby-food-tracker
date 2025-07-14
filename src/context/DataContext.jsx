import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as db from '../firebase'; // Import all firebase functions

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const DataProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      try {
        const [inv, hist, rec, pl, shop] = await Promise.all([
          db.getInventory(),
          db.getHistory(),
          db.getRecipes(),
          db.getMealPlans(),
          db.getShoppingList()
        ]);
        setInventory(inv || []);
        setHistory(hist || []);
        setRecipes(rec || []);
        setPlans(pl || []);
        setShoppingList(shop || []);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast.error("Could not load app data.");
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);

  // --- Handler Functions ---

  const handleAddFood = async (newItemData) => {
    const toastId = toast.loading('Checking inventory...');
    const formattedName = toTitleCase(newItemData.name.trim());
    const existingItem = inventory.find(item => item.name.toLowerCase() === formattedName.toLowerCase());

    if (existingItem) {
      const newCubesLeft = existingItem.cubesLeft + newItemData.cubesLeft;
      try {
        await db.updateExistingInventoryItem(existingItem.id, newCubesLeft);
        setInventory(prev => prev.map(item => item.id === existingItem.id ? { ...item, cubesLeft: newCubesLeft } : item));
        toast.success(`Added cubes to "${formattedName}"!`, { id: toastId });
      } catch (err) { toast.error('Failed to update item.', { id: toastId }); }
    } else {
      try {
        const itemToAdd = { name: formattedName, cubesLeft: newItemData.cubesLeft };
        const addedItem = await db.addNewInventoryItem(itemToAdd);
        setInventory(prev => [...prev, addedItem]);
        toast.success(`"${formattedName}" added!`, { id: toastId });
      } catch (err) { toast.error('Failed to add new item.', { id: toastId }); }
    }
  };

  const handleAddToShoppingList = async (itemName) => {
    const normalized = toTitleCase(itemName.trim());
    if (shoppingList.some(item => item.name.toLowerCase() === normalized.toLowerCase())) {
        toast.error(`"${normalized}" is already on the list.`);
        return;
    }
    const toastId = toast.loading(`Adding "${normalized}"...`);
    try {
        const newItem = await db.addItemToShoppingList(normalized);
        setShoppingList(prev => [...prev, newItem].sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds));
        toast.success(`"${normalized}" added!`, { id: toastId });
    } catch (err) { toast.error('Failed to add item.', { id: toastId }); }
  };
  
  const handleRemoveShoppingListItem = async (itemId) => {
    const originalList = [...shoppingList];
    setShoppingList(prev => prev.filter(item => item.id !== itemId));
    try {
        await db.removeItemFromShoppingList(itemId);
    } catch (err) {
        toast.error('Failed to remove item.');
        setShoppingList(originalList);
    }
  };

  const handleLogUsage = async (item, amountUsed, isTrash) => {
    const newCubesLeft = item.cubesLeft - amountUsed;
    const toastId = toast.loading('Saving usage...');

    if (newCubesLeft <= 0) {
      handleAddToShoppingList(item.name);
    }

    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, cubesLeft: newCubesLeft } : i).filter(i => i.cubesLeft > 0));
    const newHistoryEntry = { name: item.name, amount: amountUsed, type: isTrash ? 'wasted' : 'eaten', id: Date.now().toString(), timestamp: new Date() };
    setHistory(prev => [newHistoryEntry, ...prev]);
    
    try {
      await db.logUsageAndUpdateInventory(item, newCubesLeft, amountUsed, isTrash);
      toast.success('Usage logged!', { id: toastId });
    } catch (err) {
      console.error("Failed to log usage:", err);
      toast.error('Failed to save usage.', { id: toastId });
    }
  };

  const handleDeleteHistoryItem = async (historyId) => {
    const originalHistory = [...history];
    setHistory(prev => prev.filter(item => item.id !== historyId));
    try {
        await db.deleteHistoryItem(historyId);
        toast.success('History item deleted.');
    } catch (err) {
        toast.error('Failed to delete item.');
        setHistory(originalHistory);
    }
  };

  const handleCookRecipe = async (recipe) => {
    const toastId = toast.loading(`Cooking ${recipe.name}...`);
    try {
        await db.cookRecipeInDb(recipe, inventory);
        let tempInventory = [...inventory];
        for (const ingredient of recipe.ingredients) {
            tempInventory = tempInventory.map(invItem => 
              invItem.id === ingredient.itemId ? {...invItem, cubesLeft: invItem.cubesLeft - ingredient.cubesRequired} : invItem
            );
        }
        setInventory(tempInventory.filter(item => item.cubesLeft > 0));
        const newHistoryEntry = { name: recipe.name, amount: recipe.ingredients.reduce((acc, ing) => acc + ing.cubesRequired, 0), type: 'recipe', id: Date.now().toString(), timestamp: new Date() };
        setHistory(prev => [newHistoryEntry, ...prev]);
        toast.success(`${recipe.name} cooked and logged!`, { id: toastId });
    } catch (err) {
        console.error("Failed to cook recipe:", err);
        toast.error(`Failed to cook ${recipe.name}.`, { id: toastId });
    }
  };
  
  const handleAddPlan = async (planData) => { /* ... see previous versions ... */ };
  const handleDeletePlan = async (planId) => { /* ... see previous versions ... */ };
  const handleAddRecipe = async (recipeData) => { /* ... see previous versions ... */ };
  const handleDeleteRecipe = async (recipeId) => { /* ... see previous versions ... */ };


  const value = {
    inventory, history, recipes, plans, shoppingList, loading,
    handleAddFood,
    handleLogUsage,
    handleDeleteHistoryItem,
    handleAddToShoppingList,
    handleRemoveItem: handleRemoveShoppingListItem,
    handleCookRecipe,
    handleAddRecipe,
    handleDeleteRecipe,
    handleAddPlan,
    handleDeletePlan
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};