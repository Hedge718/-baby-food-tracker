import React from 'react';
import { useData } from '../context/DataContext';
import { ShoppingCart, X } from 'lucide-react';

export default function ShoppingListPage() {
  const { shoppingList, loading, handleRemoveItem } = useData();

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-4xl">Shopping List</h2>
        <p className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mt-1">
          Items automatically appear here when you run out.
        </p>
      </section>

      <div className="card max-w-md">
        <h3 className="text-xl mb-4 flex items-center gap-2">
            <ShoppingCart size={22} className="text-[var(--accent-light)] dark:text-[var(--accent-dark)]"/>
            Current List
        </h3>
        {loading ? (
            <p>Loading list...</p>
        ) : shoppingList && shoppingList.length > 0 ? (
            <ul className="space-y-2">
                {shoppingList.map(item => (
                    <li key={item.id} className="p-2 bg-slate-50 dark:bg-slate-900/70 rounded-lg flex justify-between items-center text-sm group">
                        <span className="font-semibold capitalize">{item.name}</span>
                        <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                            <X size={18}/>
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm">Your shopping list is empty!</p>
        )}
      </div>
    </div>
  );
}