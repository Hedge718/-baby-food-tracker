import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getShoppingList, addItemToShoppingList, removeItemFromShoppingList } from '../firebase';

export function useShoppingList() {
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        try {
            const data = await getShoppingList();
            setShoppingList(data);
        } catch (err) {
            console.error("Failed to fetch shopping list:", err);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const handleAddItem = async (itemName) => {
    const normalizedItemName = itemName.trim();
    if (shoppingList.some(item => item.name.toLowerCase() === normalizedItemName.toLowerCase())) {
        toast.error(`"${itemName}" is already on the list.`);
        return;
    }

    const toastId = toast.loading(`Adding "${itemName}"...`);
    try {
        const newItem = await addItemToShoppingList(normalizedItemName);
        setShoppingList(prev => [...prev, newItem].sort((a,b) => a.createdAt.seconds - b.createdAt.seconds));
        toast.success(`"${itemName}" added!`, { id: toastId });
    } catch (err) {
        toast.error('Failed to add item.', { id: toastId });
    }
  };

  const handleRemoveItem = async (itemId) => {
    const originalList = [...shoppingList];
    setShoppingList(prev => prev.filter(item => item.id !== itemId));
    try {
        await removeItemFromShoppingList(itemId);
    } catch (err) {
        toast.error('Failed to remove item.');
        setShoppingList(originalList); // Revert on error
    }
  };

  return { shoppingList, loading, handleAddItem, handleRemoveItem };
}