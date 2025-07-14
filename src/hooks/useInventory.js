import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getInventory, addNewInventoryItem, updateExistingInventoryItem, logUsageAndUpdateInventory } from '../firebase';

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        try {
            const data = await getInventory();
            setInventory(data || []);
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const handleAddFood = async (newItemData) => {
    const toastId = toast.loading('Checking inventory...');
    const formattedName = toTitleCase(newItemData.name.trim());
    
    const existingItem = inventory.find(item => item.name.toLowerCase() === formattedName.toLowerCase());

    if (existingItem) {
      const newCubesLeft = existingItem.cubesLeft + newItemData.cubesLeft;
      try {
        await updateExistingInventoryItem(existingItem.id, newCubesLeft);
        setInventory(prev => prev.map(item => item.id === existingItem.id ? { ...item, cubesLeft: newCubesLeft } : item));
        toast.success(`Added cubes to "${formattedName}"!`, { id: toastId });
      } catch (err) {
        toast.error('Failed to update item.', { id: toastId });
      }
    } else {
      try {
        const itemToAdd = { name: formattedName, cubesLeft: newItemData.cubesLeft };
        const addedItem = await addNewInventoryItem(itemToAdd);
        setInventory(prev => [...prev, addedItem]);
        toast.success(`"${formattedName}" added to inventory!`, { id: toastId });
      } catch (err) {
        toast.error('Failed to add new item.', { id: toastId });
      }
    }
  };

  const handleLogUsage = async (item, amountUsed, isTrash, setHistory, onAddToShoppingList) => {
    const newCubesLeft = item.cubesLeft - amountUsed;
    const toastId = toast.loading('Saving usage...');

    if (newCubesLeft <= 0) {
      onAddToShoppingList(item.name);
    }

    const newInventoryState = inventory.map(i => i.id === item.id ? { ...i, cubesLeft: newCubesLeft } : i);
    setInventory(newInventoryState);

    const newHistoryEntry = { 
        name: item.name, 
        amount: amountUsed, 
        type: isTrash ? 'wasted' : 'eaten', 
        id: Date.now().toString(),
        timestamp: new Date() 
    };
    setHistory(prevHistory => [newHistoryEntry, ...(prevHistory || [])]);
    
    try {
      await logUsageAndUpdateInventory(item, newCubesLeft, amountUsed, isTrash);
      toast.success('Usage logged successfully!', { id: toastId });
    } catch (err) {
      console.error("Failed to log usage:", err);
      toast.error('Failed to save usage.', { id: toastId });
    }
  };

  return { inventory, loading, setInventory, handleAddFood, handleLogUsage };
}