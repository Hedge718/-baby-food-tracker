// src/pages/ShoppingListPage.jsx
import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useData } from '../context/DataContext';
import { addItemToShoppingList, removeItemFromShoppingList } from '../firebase';
import { Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import AIShoppingRecs from '../components/AIShoppingRecs';

export default function ShoppingListPage() {
  const { shoppingList, loading } = useData();
  const [newItem, setNewItem] = useState('');

  const handleAdd = async () => {
    const name = newItem.trim();
    if (!name) return;
    try {
      await addItemToShoppingList(name);
      setNewItem('');
      toast.success('Added to shopping list');
    } catch (e) {
      toast.error('Failed to add item');
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeItemFromShoppingList(id);
      toast.success('Removed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shopping List"
        subtitle="What to pick up next time you’re out."
      />

      {/* AI Shopping Panel */}
      <AIShoppingRecs />

      <div className="card p-4 space-y-4">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add item…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="btn-primary" aria-label="Add item">
            <Plus size={18} />
          </button>
        </div>

        <ul className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
          {loading ? (
            <li className="py-2 text-muted">Loading…</li>
          ) : shoppingList.length ? (
            shoppingList.map((item) => (
              <li key={item.id} className="py-2 flex items-center justify-between">
                <span>{item.name}</span>
                <button
                  aria-label={`Remove ${item.name}`}
                  onClick={() => handleRemove(item.id)}
                  className="text-slate-400 hover:text-red-500"
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))
          ) : (
            <li className="py-2 text-muted">No items yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
