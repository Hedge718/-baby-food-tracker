import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  // fetchers
  getInventory,
  getHistory,
  getRecipes,
  getMealPlans,
  getShoppingList,
  // shopping list
  addItemToShoppingList,
  removeItemFromShoppingList,
  // inventory ops
  addNewInventoryItem,
  updateExistingInventoryItem,
  updateInventoryItemStatus,
  updateInventoryMadeOn,
  setInventoryHidden,
  logUsageAndUpdateInventory,
  // history
  deleteHistoryItem,
  // recipes
  addRecipe,
  deleteRecipe,
  cookRecipeInDb,
  // planner
  addMealPlan,
  deleteMealPlan,
} from '../firebase';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

// Keep your title-case helper
const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const DataProvider = ({ children }) => {
  const [fullInventory, setFullInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const [inv, hist, rec, pl, shop] = await Promise.all([
          getInventory(),
          getHistory(),
          getRecipes(),
          getMealPlans(),
          getShoppingList(),
        ]);
        setFullInventory(inv || []);
        setHistory(hist || []);
        setRecipes(rec || []);
        setPlans(pl || []);
        setShoppingList(shop || []);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        toast.error('Could not load app data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);

  // Derived: non-zero inventory
  const inventory = useMemo(
    () => (fullInventory || []).filter((item) => (item.cubesLeft ?? 0) > 0),
    [fullInventory]
  );

  // Derived: inventory with reservations from plans
  const inventoryWithReserved = useMemo(() => {
    const inventoryToProcess = inventory.length > 0 ? inventory : fullInventory;
    const reservedMap = inventoryToProcess.reduce((acc, item) => {
      acc[item.id] = 0;
      return acc;
    }, {});

    for (const plan of plans || []) {
      if (plan.isRecipe) {
        const recipeDetails = (recipes || []).find((r) => r.id === plan.itemId);
        if (recipeDetails?.ingredients) {
          for (const ingredient of recipeDetails.ingredients) {
            if (Object.prototype.hasOwnProperty.call(reservedMap, ingredient.itemId)) {
              reservedMap[ingredient.itemId] += Number(ingredient.cubesRequired || 0);
            }
          }
        }
      } else {
        if (Object.prototype.hasOwnProperty.call(reservedMap, plan.itemId)) {
          reservedMap[plan.itemId] += Number(plan.amount || 0);
        }
      }
    }

    return (inventory || []).map((item) => {
      const reserved = reservedMap[item.id] || 0;
      const cubesAvailable = (item.cubesLeft ?? 0) - reserved;
      return {
        ...item,
        reserved,
        cubesAvailable,
        hasShortfall: cubesAvailable < 0,
      };
    });
  }, [inventory, fullInventory, plans, recipes]);

  // ---------- Inventory ----------
  const handleUpdateItemStatus = async (itemId, status) => {
    setFullInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, status } : i)));
    try {
      await updateInventoryItemStatus(itemId, status);
      toast.success('Status updated!');
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  // New: set portions quickly
  const handleSetPortions = async (itemId, newCubesLeft) => {
    const n = Math.max(0, Number(newCubesLeft || 0));
    setFullInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, cubesLeft: n } : i)));
    try {
      await updateExistingInventoryItem(itemId, n);
      toast.success('Portions updated');
    } catch (err) {
      toast.error('Failed to update portions.');
    }
  };

  // New: set/adjust "Made On" date (YYYY-MM-DD)
  const handleSetAging = async (itemId, ymd) => {
    try {
      await updateInventoryMadeOn(itemId, ymd);
      setFullInventory((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, madeOn: new Date(`${ymd}T00:00:00`) } : i))
      );
      toast.success('Date updated');
    } catch (err) {
      toast.error('Failed to update date.');
    }
  };

  // New: hide/unhide
  const handleToggleHidden = async (itemId, hidden) => {
    setFullInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, hidden: !!hidden } : i)));
    try {
      await setInventoryHidden(itemId, hidden);
      toast.success(hidden ? 'Item hidden' : 'Item unhidden');
    } catch (err) {
      toast.error('Failed to change visibility.');
    }
  };

  // Updated: add food — let Firestore do merge-by-name and accept madeOn
  const handleAddFood = async (newItemData) => {
    if (newItemData?.isForShoppingList) {
      await handleAddToShoppingList(newItemData.name);
      return;
    }
    const name = toTitleCase(String(newItemData?.name || '').trim());
    if (!name) return;

    const toastId = toast.loading('Checking inventory...');
    try {
      // Use addNewInventoryItem so it can merge by normalized name and accept madeOn
      await addNewInventoryItem({
        name,
        cubesLeft: Number(newItemData?.cubesLeft || 0),
        status: newItemData?.status || 'Frozen',
        madeOn: newItemData?.madeOn, // may be undefined or "YYYY-MM-DD"
      });
      const fresh = await getInventory();
      setFullInventory(fresh || []);
      toast.success(`"${name}" added!`, { id: toastId });
    } catch (err) {
      console.error('Failed to add food:', err);
      toast.error('Failed to add item.', { id: toastId });
    }
  };

  const handleLogUsage = async (item, amountUsed, isTrash) => {
    const newCubesLeft = Math.max(0, Number(item.cubesLeft || 0) - Number(amountUsed || 0));
    const toastId = toast.loading('Saving usage...');
    try {
      const newHistoryEntry = await logUsageAndUpdateInventory(item, newCubesLeft, amountUsed, isTrash);

      setFullInventory((prev) => prev.map((i) => (i.id === item.id ? { ...i, cubesLeft: newCubesLeft } : i)));
      setHistory((prev) => [newHistoryEntry, ...prev]);

      if (newCubesLeft <= 0) {
        await handleAddToShoppingList(item.name, false);
        toast.success(`Usage logged! "${item.name}" was added to your shopping list.`, { id: toastId });
      } else {
        toast.success('Usage logged!', { id: toastId });
      }
    } catch (err) {
      console.error('Failed to log usage:', err);
      toast.error('Failed to save usage.', { id: toastId });
    }
  };

  // ---------- Shopping List ----------
  const handleAddToShoppingList = async (itemName, showToast = true) => {
    const normalized = toTitleCase(String(itemName || '').trim());
    if (!normalized) return;

    if ((shoppingList || []).some((it) => String(it.name || '').toLowerCase() === normalized.toLowerCase())) {
      if (showToast) toast.error(`"${normalized}" is already on the list.`);
      return;
    }

    const toastId = showToast ? toast.loading(`Adding "${normalized}"...`) : null;
    try {
      const newItem = await addItemToShoppingList(normalized);
      setShoppingList((prev) => [...prev, newItem]);
      if (showToast) toast.success(`"${normalized}" added!`, { id: toastId });
    } catch (err) {
      if (showToast) toast.error('Failed to add item.', { id: toastId });
    }
  };

  const handleRemoveShoppingListItem = async (itemId) => {
    const original = [...shoppingList];
    setShoppingList((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await removeItemFromShoppingList(itemId);
      toast.success('Item removed from shopping list.');
    } catch (err) {
      toast.error('Failed to remove item.');
      setShoppingList(original);
    }
  };

  // ---------- History ----------
  const handleDeleteHistoryItem = async (historyId) => {
    const original = [...history];
    setHistory((prev) => prev.filter((h) => h.id !== historyId));
    try {
      await deleteHistoryItem(historyId);
      toast.success('History item deleted.');
    } catch (err) {
      toast.error('Failed to delete item.');
      setHistory(original);
    }
  };

  // ---------- Recipes ----------
  const handleAddRecipe = async (recipeData) => {
    const toastId = toast.loading('Saving recipe...');
    try {
      const newRecipe = await addRecipe(recipeData);
      setRecipes((prev) => [newRecipe, ...prev]);
      toast.success('Recipe saved!', { id: toastId });
    } catch (err) {
      console.error('Failed to save recipe:', err);
      toast.error('Failed to save recipe.', { id: toastId });
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    const original = [...recipes];
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    try {
      await deleteRecipe(recipeId);
      toast.success('Recipe deleted.');
    } catch (err) {
      toast.error('Failed to delete recipe.');
      setRecipes(original);
    }
  };

  const handleCookRecipe = async (recipe) => {
    const toastId = toast.loading(`Cooking ${recipe?.name || 'recipe'}...`);
    try {
      const { newHistoryEntry, updatedInventoryItems } = await cookRecipeInDb(recipe, fullInventory);

      let temp = [...fullInventory];
      for (const u of updatedInventoryItems || []) {
        temp = temp.map((inv) => (inv.id === u.id ? { ...inv, cubesLeft: u.newCubesLeft } : inv));
      }
      setFullInventory(temp);
      setHistory((prev) => [newHistoryEntry, ...prev]);

      toast.success(`${recipe.name} cooked and logged!`, { id: toastId });
    } catch (err) {
      console.error('Failed to cook recipe:', err);
      toast.error(`Failed to cook ${recipe?.name || 'recipe'}.`, { id: toastId });
    }
  };

  // ---------- Planner ----------
  const handleAddPlan = async (planData) => {
    const toastId = toast.loading('Saving plan...');
    try {
      const newPlan = await addMealPlan(planData);
      setPlans((prev) => [...prev, newPlan]);
      toast.success('Meal plan saved!', { id: toastId });
    } catch (err) {
      toast.error('Failed to save plan.', { id: toastId });
    }
  };

  const handleDeletePlan = async (planId) => {
    const original = [...plans];
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    try {
      await deleteMealPlan(planId);
      toast.success('Plan removed.');
    } catch (err) {
      toast.error('Failed to remove plan.');
      setPlans(original);
    }
  };

  const value = {
    // data
    inventory: inventoryWithReserved,
    fullInventory,
    history,
    recipes,
    plans,
    shoppingList,
    loading,

    // exposed setters (you had these)
    setFullInventory,
    setHistory,

    // inventory ops
    handleAddFood,
    handleLogUsage,
    handleUpdateItemStatus,
    handleSetPortions,  // NEW
    handleSetAging,     // NEW
    handleToggleHidden, // NEW

    // shopping list
    handleAddToShoppingList,
    handleRemoveItem: handleRemoveShoppingListItem,

    // history
    handleDeleteHistoryItem,

    // recipes
    handleAddRecipe,
    handleDeleteRecipe,
    handleCookRecipe,

    // planner
    handleAddPlan,
    handleDeletePlan,
  };

  return <DataContext.Provider value={value}>{!loading && children}</DataContext.Provider>;
};
