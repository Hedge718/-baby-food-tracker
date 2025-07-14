import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as db from '../firebase'; // Import all firebase functions

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const DataProvider = ({ children }) => {
  const [fullInventory, setFullInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const [inv, hist, rec, pl, shop] = await Promise.all([
          db.getInventory(),
          db.getHistory(),
          db.getRecipes(),
          db.getMealPlans(),
          db.getShoppingList()
        ]);
        setFullInventory(inv || []);
        setHistory(hist || []);
        setRecipes(rec || []);
        setPlans(pl || []);
        setShoppingList(shop || []);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast.error("Could not load app data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);
  
  const inventory = useMemo(() => fullInventory.filter(item => item.cubesLeft > 0), [fullInventory]);

  const inventoryWithReserved = useMemo(() => {
    const inventoryToProcess = inventory.length > 0 ? inventory : fullInventory;
    const reservedMap = inventoryToProcess.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
    }, {});

    for (const plan of plans) {
        if (plan.isRecipe) {
            const recipeDetails = recipes.find(r => r.id === plan.itemId);
            if (recipeDetails?.ingredients) {
                for (const ingredient of recipeDetails.ingredients) {
                    if (reservedMap.hasOwnProperty(ingredient.itemId)) {
                        reservedMap[ingredient.itemId] += ingredient.cubesRequired;
                    }
                }
            }
        } else {
            if (reservedMap.hasOwnProperty(plan.itemId)) {
                reservedMap[plan.itemId] += plan.amount || 0;
            }
        }
    }

    return inventory.map(item => {
        const reserved = reservedMap[item.id] || 0;
        const cubesAvailable = item.cubesLeft - reserved;
        return {
            ...item,
            reserved: reserved,
            cubesAvailable: cubesAvailable,
            hasShortfall: cubesAvailable < 0,
        };
    });
  }, [inventory, fullInventory, plans, recipes]);

  const handleUpdateItemStatus = async (itemId, status) => {
    setFullInventory(prev => prev.map(item => item.id === itemId ? { ...item, status } : item));
    try {
        await db.updateInventoryItemStatus(itemId, status);
        toast.success('Status updated!');
    } catch (err) {
        toast.error('Failed to update status.');
        // Revert on error if needed
    }
  };
  
  const handleAddToShoppingList = async (itemName, showToast = true) => {
    const normalized = toTitleCase(itemName.trim());
    if (shoppingList.some(item => item.name.toLowerCase() === normalized.toLowerCase())) {
      if (showToast) toast.error(`"${normalized}" is already on the list.`);
      return;
    }
    const toastId = showToast ? toast.loading(`Adding "${normalized}"...`) : null;
    try {
      const newItem = await db.addItemToShoppingList(normalized);
      setShoppingList(prev => [...prev, newItem].sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds));
      if (showToast) toast.success(`"${normalized}" added!`, { id: toastId });
    } catch (err) {
      if (showToast) toast.error('Failed to add item.', { id: toastId });
    }
  };

  const handleAddFood = async (newItemData) => {
    if (newItemData.isForShoppingList) {
      await handleAddToShoppingList(newItemData.name);
      return;
    }

    const toastId = toast.loading('Checking inventory...');
    const formattedName = toTitleCase(newItemData.name.trim());
    const existingItem = fullInventory.find(item => item.name.toLowerCase() === formattedName.toLowerCase());

    if (existingItem) {
      const newCubesLeft = existingItem.cubesLeft + newItemData.cubesLeft;
      try {
        await db.updateExistingInventoryItem(existingItem.id, newCubesLeft);
        setFullInventory(prev => prev.map(item => item.id === existingItem.id ? { ...item, cubesLeft: newCubesLeft } : item));
        toast.success(`Added cubes to "${formattedName}"!`, { id: toastId });
      } catch (err) {
        toast.error('Failed to update item.', { id: toastId });
      }
    } else {
      try {
        const itemToAdd = { name: formattedName, cubesLeft: newItemData.cubesLeft, status: newItemData.status };
        const addedItem = await db.addNewInventoryItem(itemToAdd);
        setFullInventory(prev => [...prev, addedItem]);
        toast.success(`"${formattedName}" added!`, { id: toastId });
      } catch (err) {
        toast.error('Failed to add new item.', { id: toastId });
      }
    }
  };

  const handleRemoveShoppingListItem = async (itemId) => {
    const originalList = [...shoppingList];
    setShoppingList(prev => prev.filter(item => item.id !== itemId));
    try {
      await db.removeItemFromShoppingList(itemId);
      toast.success("Item removed from shopping list.");
    } catch (err) {
      toast.error('Failed to remove item.');
      setShoppingList(originalList);
    }
  };

  const handleLogUsage = async (item, amountUsed, isTrash) => {
    const newCubesLeft = item.cubesLeft - amountUsed;
    const toastId = toast.loading('Saving usage...');
    
    try {
        const newHistoryEntry = await db.logUsageAndUpdateInventory(item, newCubesLeft, amountUsed, isTrash);
        
        setFullInventory(prev => prev.map(i => i.id === item.id ? { ...i, cubesLeft: newCubesLeft } : i));
        setHistory(prev => [newHistoryEntry, ...prev]);

        if (newCubesLeft <= 0) {
            await handleAddToShoppingList(item.name, false); // No toast for auto-add
            toast.success(`Usage logged! "${item.name}" was added to your shopping list.`, { id: toastId });
        } else {
            toast.success('Usage logged!', { id: toastId });
        }
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

  const handleAddRecipe = async (recipeData) => {
    const toastId = toast.loading('Saving recipe...');
    try {
      const newRecipe = await db.addRecipe(recipeData);
      setRecipes(prev => [newRecipe, ...prev]);
      toast.success('Recipe saved!', { id: toastId });
    } catch (err) {
      console.error("Failed to save recipe:", err);
      toast.error('Failed to save recipe.', { id: toastId });
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    const originalRecipes = [...recipes];
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    try {
      await db.deleteRecipe(recipeId);
      toast.success('Recipe deleted.');
    } catch (err) {
      toast.error('Failed to delete recipe.');
      setRecipes(originalRecipes);
    }
  };

  const handleCookRecipe = async (recipe) => {
    const toastId = toast.loading(`Cooking ${recipe.name}...`);
    try {
      const { newHistoryEntry, updatedInventoryItems } = await db.cookRecipeInDb(recipe, fullInventory);
      
      let tempInventory = [...fullInventory];
      updatedInventoryItems.forEach(updatedItem => {
          tempInventory = tempInventory.map(invItem => 
            invItem.id === updatedItem.id ? {...invItem, cubesLeft: updatedItem.newCubesLeft} : invItem
          );
      });

      setFullInventory(tempInventory);
      setHistory(prev => [newHistoryEntry, ...prev]);
      
      toast.success(`${recipe.name} cooked and logged!`, { id: toastId });
    } catch (err) {
      console.error("Failed to cook recipe:", err);
      toast.error(`Failed to cook ${recipe.name}.`, { id: toastId });
    }
  };

  const handleAddPlan = async (planData) => {
    const toastId = toast.loading('Saving plan...');
    try {
      const newPlan = await db.addMealPlan(planData);
      setPlans(prev => [...prev, newPlan]);
      toast.success('Meal plan saved!', { id: toastId });
    } catch (err) {
      toast.error('Failed to save plan.', { id: toastId });
    }
  };

  const handleDeletePlan = async (planId) => {
    const originalPlans = [...plans];
    setPlans(prev => prev.filter(p => p.id !== planId));
    try {
        await db.deleteMealPlan(planId);
        toast.success('Plan removed.');
    } catch (err) {
        toast.error('Failed to remove plan.');
        setPlans(originalPlans);
    }
  };

  const value = {
    inventory: inventoryWithReserved, 
    fullInventory,
    history, 
    recipes, 
    plans, 
    shoppingList, 
    loading,
    setFullInventory,
    setHistory,
    handleAddFood,
    handleLogUsage,
    handleDeleteHistoryItem,
    handleUpdateItemStatus,
    handleAddToShoppingList, 
    handleRemoveItem: handleRemoveShoppingListItem,
    handleAddRecipe,
    handleDeleteRecipe,
    handleCookRecipe,
    handleAddPlan,
    handleDeletePlan,
  };

  return <DataContext.Provider value={value}>{!loading && children}</DataContext.Provider>;
};
