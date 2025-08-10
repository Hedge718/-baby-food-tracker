import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as db from '../firebase'; // make sure firebase exports all funcs used below

const DataContext = createContext();
export const useData = () => useContext(DataContext);

const toTitleCase = (str) =>
  String(str || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const DataProvider = ({ children }) => {
  const [fullInventory, setFullInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);

  // ------- initial load -------
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [inv, hist, rec, pl, shop] = await Promise.all([
          db.getInventory(),
          db.getHistory(),
          db.getRecipes(),
          db.getMealPlans(),
          db.getShoppingList(),
        ]);
        setFullInventory(inv || []);
        setHistory(hist || []);
        setRecipes(rec || []);
        setPlans(pl || []);
        setShoppingList(shop || []);
      } catch (e) {
        console.error('Failed to fetch initial data:', e);
        toast.error('Could not load app data. Check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ------- derived: available inventory with reserved counts -------
  const availableOnly = useMemo(
    () => (fullInventory || []).filter((i) => Number(i.cubesLeft || 0) > 0),
    [fullInventory]
  );

  const inventoryWithReserved = useMemo(() => {
    // base over FULL inventory so we can compute reserved against everything
    const base = fullInventory || [];
    const reservedMap = base.reduce((acc, i) => {
      acc[i.id] = 0;
      return acc;
    }, {});

    for (const plan of plans || []) {
      if (plan.isRecipe) {
        const recipeDetails = (recipes || []).find((r) => r.id === plan.itemId);
        for (const ing of recipeDetails?.ingredients || []) {
          if (reservedMap[ing.itemId] != null) {
            reservedMap[ing.itemId] += Number(ing.cubesRequired || 0);
          }
        }
      } else {
        if (reservedMap[plan.itemId] != null) {
          reservedMap[plan.itemId] += Number(plan.amount || 0);
        }
      }
    }

    return base.map((i) => {
      const reserved = reservedMap[i.id] || 0;
      const cubesAvailable = Number(i.cubesLeft || 0) - reserved;
      return { ...i, reserved, cubesAvailable, hasShortfall: cubesAvailable < 0 };
    });
  }, [fullInventory, plans, recipes]);

  // what pages should consume:
  // - Dashboard/Quick Use: use *availableOnly* or *inventoryWithReserved* and filter >0
  // - InventoryPage: should use *fullInventory* (we’ll fix that page below)
  const inventory = useMemo(
    () => inventoryWithReserved.filter((i) => Number(i.cubesLeft || 0) > 0),
    [inventoryWithReserved]
  );

  // ------- inventory updates -------
  const handleUpdateItemStatus = async (itemId, status) => {
    const prev = fullInventory;
    setFullInventory((p) => p.map((i) => (i.id === itemId ? { ...i, status } : i)));
    try {
      await db.updateInventoryItemStatus(itemId, status);
      toast.success('Status updated');
    } catch (e) {
      setFullInventory(prev);
      toast.error('Failed to update status');
    }
  };

  const handleSetPortions = async (itemId, newCubesLeft) => {
    const n = Math.max(0, Number(newCubesLeft) || 0);
    const prev = fullInventory;
    setFullInventory((p) => p.map((i) => (i.id === itemId ? { ...i, cubesLeft: n } : i)));
    try {
      await db.updateExistingInventoryItem(itemId, n);
      toast.success('Portions updated');
    } catch (e) {
      setFullInventory(prev);
      toast.error('Failed to set portions');
    }
  };

  const handleSetAging = async (itemId, dateYMD) => {
    const date = new Date(`${dateYMD}T00:00:00`);
    const prev = fullInventory;
    setFullInventory((p) => p.map((i) => (i.id === itemId ? { ...i, madeOn: date } : i)));
    try {
      await db.updateInventoryMadeOn(itemId, date);
      toast.success('Date updated');
    } catch (e) {
      setFullInventory(prev);
      toast.error('Failed to update date');
    }
  };

  const handleToggleHidden = async (itemId, hidden) => {
    const prev = fullInventory;
    setFullInventory((p) => p.map((i) => (i.id === itemId ? { ...i, hidden: !!hidden } : i)));
    try {
      await db.setInventoryHidden(itemId, !!hidden);
      toast.success(hidden ? 'Hidden' : 'Unhidden');
    } catch (e) {
      setFullInventory(prev);
      toast.error('Failed to change visibility');
    }
  };

  const handleAddToShoppingList = async (itemName, showToast = true) => {
    const normalized = toTitleCase(itemName);
    if (shoppingList.some((s) => String(s.name || '').toLowerCase() === normalized.toLowerCase())) {
      if (showToast) toast('Already on your list');
      return;
    }
    const tid = showToast ? toast.loading(`Adding "${normalized}"…`) : null;
    try {
      const res = await db.addItemToShoppingList(normalized);
      setShoppingList((p) => [...p, res]);
      if (showToast) toast.success(`"${normalized}" added`, { id: tid });
    } catch {
      if (showToast) toast.error('Failed to add', { id: tid });
    }
  };
  // alias so AIShoppingRecs can find it no matter what it expects
  const handleAddShoppingItem = handleAddToShoppingList;

  const handleAddFood = async (newItemData) => {
    // allow “send to shopping list”
    if (newItemData.isForShoppingList) {
      await handleAddToShoppingList(newItemData.name);
      return;
    }

    const name = toTitleCase(newItemData.name);
    const cubes = Math.max(0, Number(newItemData.cubesLeft) || 0);
    const status = newItemData.status || 'Frozen';
    const madeOn =
      newItemData.madeOn ? new Date(`${newItemData.madeOn}T00:00:00`) : undefined;

    const tid = toast.loading('Checking inventory…');

    // see if it exists (by Title Case)
    const existing = fullInventory.find(
      (i) => String(i.name || '').toLowerCase() === name.toLowerCase()
    );
    try {
      if (existing) {
        const next = (Number(existing.cubesLeft) || 0) + cubes;
        await db.updateExistingInventoryItem(existing.id, next);
        setFullInventory((p) =>
          p.map((i) => (i.id === existing.id ? { ...i, cubesLeft: next } : i))
        );
        toast.success(`Added cubes to "${name}"`, { id: tid });
      } else {
        const added = await db.addNewInventoryItem({ name, cubesLeft: cubes, status, madeOn });
        setFullInventory((p) => [...p, added]);
        toast.success(`"${name}" added`, { id: tid });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to add/update item', { id: tid });
    }
  };

  const handleRemoveShoppingListItem = async (itemId) => {
    const prev = shoppingList;
    setShoppingList((p) => p.filter((s) => s.id !== itemId));
    try {
      await db.removeItemFromShoppingList(itemId);
      toast.success('Removed from shopping list');
    } catch {
      setShoppingList(prev);
      toast.error('Failed to remove');
    }
  };

  const handleLogUsage = async (item, amountUsed, isTrash) => {
    const next = (Number(item.cubesLeft) || 0) - Number(amountUsed || 0);
    const tid = toast.loading('Saving usage…');
    try {
      const entry = await db.logUsageAndUpdateInventory(item, next, amountUsed, isTrash);
      setFullInventory((p) => p.map((i) => (i.id === item.id ? { ...i, cubesLeft: next } : i)));
      setHistory((p) => [entry, ...p]);

      if (next <= 0) {
        await handleAddToShoppingList(item.name, false);
        toast.success(`Logged & added "${item.name}" to shopping list`, { id: tid });
      } else {
        toast.success('Usage logged', { id: tid });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to log usage', { id: tid });
    }
  };

  const handleDeleteHistoryItem = async (historyId) => {
    const prev = history;
    setHistory((p) => p.filter((h) => h.id !== historyId));
    try {
      await db.deleteHistoryItem(historyId);
      toast.success('History removed');
    } catch {
      setHistory(prev);
      toast.error('Failed to delete history');
    }
  };

  const handleAddRecipe = async (recipeData) => {
    const tid = toast.loading('Saving recipe…');
    try {
      const r = await db.addRecipe(recipeData);
      setRecipes((p) => [r, ...p]);
      toast.success('Recipe saved', { id: tid });
    } catch {
      toast.error('Failed to save recipe', { id: tid });
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    const prev = recipes;
    setRecipes((p) => p.filter((r) => r.id !== recipeId));
    try {
      await db.deleteRecipe(recipeId);
      toast.success('Recipe deleted');
    } catch {
      setRecipes(prev);
      toast.error('Failed to delete recipe');
    }
  };

  const handleCookRecipe = async (recipe) => {
    const tid = toast.loading(`Cooking ${recipe.name}…`);
    try {
      const { newHistoryEntry, updatedInventoryItems } = await db.cookRecipeInDb(
        recipe,
        fullInventory
      );
      let tmp = [...fullInventory];
      for (const u of updatedInventoryItems) {
        tmp = tmp.map((i) => (i.id === u.id ? { ...i, cubesLeft: u.newCubesLeft } : i));
      }
      setFullInventory(tmp);
      setHistory((p) => [newHistoryEntry, ...p]);
      toast.success('Cooked & logged', { id: tid });
    } catch (e) {
      console.error(e);
      toast.error('Failed to cook recipe', { id: tid });
    }
  };

  const handleAddPlan = async (planData) => {
    const tid = toast.loading('Saving plan…');
    try {
      const p = await db.addMealPlan(planData);
      setPlans((prev) => [...prev, p]);
      toast.success('Plan saved', { id: tid });
    } catch (e) {
      toast.error('Failed to save plan', { id: tid });
    }
  };

  const handleDeletePlan = async (planId) => {
    const prev = plans;
    setPlans((p) => p.filter((x) => x.id !== planId));
    try {
      await db.deleteMealPlan(planId);
      toast.success('Plan removed');
    } catch {
      setPlans(prev);
      toast.error('Failed to remove plan');
    }
  };

  const value = {
    // lists
    inventory,              // >0 with reserved info
    fullInventory,          // everything (InventoryPage should use this)
    history,
    recipes,
    plans,
    shoppingList,
    loading,

    // setters
    setFullInventory,
    setHistory,

    // inventory ops
    handleAddFood,
    handleLogUsage,
    handleUpdateItemStatus,
    handleSetPortions,
    handleSetAging,
    handleToggleHidden,

    // shopping ops
    handleAddToShoppingList,
    handleAddShoppingItem,          // alias for components
    handleRemoveItem: handleRemoveShoppingListItem,

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
