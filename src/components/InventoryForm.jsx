import React, { useState } from 'react';
import { PlusCircle, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryForm({ onAddFood }) {
  const [name, setName] = useState('');
  const [cubes, setCubes] = useState(12);
  const [isForShoppingList, setIsForShoppingList] = useState(false);
  const [status, setStatus] = useState('new');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
        toast.error("Please enter a food name.");
        return;
    }

    if (isForShoppingList) {
        await onAddFood({ name, isForShoppingList: true });
    } else {
        if (cubes > 0) {
            await onAddFood({ name, cubesLeft: Number(cubes), status, isForShoppingList: false });
        } else {
            toast.error("Please enter a cube count greater than zero.");
        }
    }
    
    setName('');
    setCubes(12);
    setStatus('new');
    setIsForShoppingList(false);
  };

  return (
    <div className="card">
      <h3 className="text-xl mb-4">Add Food</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="foodName" className="block text-sm font-bold text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mb-1">Food Name</label>
          <input id="foodName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Pear" className="input-field" required />
        </div>
        
        {!isForShoppingList && (
            <>
                <div>
                  <label htmlFor="cubes" className="block text-sm font-bold text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mb-1">Number of Cubes in Batch</label>
                  <input id="cubes" type="number" value={cubes} onChange={(e) => setCubes(e.target.value)} className="input-field" min="1" required />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-bold text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mb-1">Initial Status</label>
                  <select id="status" value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                      <option value="new">New Food</option>
                      <option value="liked">Liked</option>
                  </select>
                </div>
            </>
        )}

        <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="isForShoppingList" checked={isForShoppingList} onChange={(e) => setIsForShoppingList(e.target.checked)} className="h-4 w-4 rounded text-[var(--accent-light)] focus:ring-[var(--accent-light)]"/>
            <label htmlFor="isForShoppingList" className="text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">Add to shopping list instead</label>
        </div>

        <button type="submit" className="btn-primary w-full !mt-6">
          {isForShoppingList ? <ShoppingCart size={20} /> : <PlusCircle size={20} />}
          <span>{isForShoppingList ? 'Add to Shopping List' : 'Add to Inventory'}</span>
        </button>
      </form>
    </div>
  );
}