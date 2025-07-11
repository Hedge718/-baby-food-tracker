import { useState, useEffect } from 'react';
import { getInventory } from '../firebase';
import { mockInventory } from '../mockData';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  useEffect(() => {
    if (import.meta.env.DEV) setInventory(mockInventory);
    else getInventory().then(setInventory);
  }, []);
  return { inventory, setInventory };
}