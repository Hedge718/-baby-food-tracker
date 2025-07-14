import React from 'react';
import { ShoppingCart, X } from 'lucide-react';

export default function ShoppingList({ list, onRemoveItem, loading }) {
  return (
    <div className="card">
        <h3 className="text-xl mb-4 flex items-center gap-2">
            <ShoppingCart size={22} className="text-[var(--accent-light)] dark:text-[var(--accent-dark)]"/>
            Shopping List
        </h3>
        {loading ? (
            <p className="text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">Loading list...</p>
        ) : list.length > 0 ? (
            <ul className="space-y-2">
                {list.map(item => (
                    <li key={item.id} className="p-2 bg-slate-50 dark:bg-slate-900/70 rounded-lg flex justify-between items-center text-sm group">
                        <span className="font-semibold capitalize">{item.name}</span>
                        <button onClick={() => onRemoveItem(item.id)} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                            <X size={18}/>
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">
                Your shopping list is empty.
            </p>
        )}
    </div>
  );
}