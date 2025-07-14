import React, { useState, useMemo } from 'react';
import { Save, X, Plus, Minus } from 'lucide-react';

function LogUsageForm({ item, onSave, onCancel }) {
  const [amountUsed, setAmountUsed] = useState(1);
  const [isTrash, setIsTrash] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amountUsed > 0 && amountUsed <= item.cubesLeft) {
      onSave(item, amountUsed, isTrash);
      onCancel();
    } else {
      alert(`Please enter a valid amount between 1 and ${item.cubesLeft}.`);
    }
  };

  const handleAmountChange = (delta) => {
    setAmountUsed(prev => {
        const newValue = prev + delta;
        if (newValue > 0 && newValue <= item.cubesLeft) {
            return newValue;
        }
        return prev;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-[var(--border-light)] dark:border-[var(--border-dark)] space-y-4">
      <div>
        <label className="block text-xs font-bold text-center text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mb-1">Cubes Used</label>
        <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleAmountChange(-1)} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <Minus size={16}/>
            </button>
            <input 
              type="number"
              value={amountUsed}
              onChange={(e) => setAmountUsed(Number(e.target.value))}
              className="input-field p-2 text-sm text-center font-bold"
              min="1"
              max={item.cubesLeft}
              autoFocus
            />
            <button type="button" onClick={() => handleAmountChange(1)} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <Plus size={16}/>
            </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="checkbox"
          id={`isTrash-${item.id}`}
          checked={isTrash}
          onChange={(e) => setIsTrash(e.target.checked)}
          className="h-4 w-4 rounded text-[var(--accent-light)] focus:ring-[var(--accent-light)]"
        />
        <label htmlFor={`isTrash-${item.id}`} className="text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">Mark as wasted</label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
        <button type="submit" className="p-2 text-slate-400 hover:text-green-500 rounded-full transition-colors"><Save size={20}/></button>
      </div>
    </form>
  );
}

export default function FoodInventoryItem({ item, onLogUsage, plans }) {
  const [isLogging, setIsLogging] = useState(false);

  // Calculate how many cubes are reserved in the planner
  const reservedCubes = useMemo(() => {
    return (plans || [])
      .filter(p => !p.isRecipe && p.itemId === item.id)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [plans, item.id]);

  return (
    <div className="card flex flex-col justify-between hover:shadow-lg transition-all duration-200">
      <div>
        <div className="flex justify-between items-start">
            <h3 className="text-2xl font-bold">{item.name}</h3>
            <div className="text-right flex-shrink-0 ml-4">
                <p className="text-5xl font-extrabold text-[var(--accent-light)] dark:text-[var(--accent-dark)] leading-none">{item.cubesLeft}</p>
                <p className="text-xs text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] -mt-1">CUBES</p>
            </div>
        </div>
        
        {/* Conditionally render the "reserved" badge */}
        {reservedCubes > 0 && (
            <div className="text-xs font-bold text-amber-800 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-1 rounded-full mt-2 text-center w-fit">
                {reservedCubes} reserved in planner
            </div>
        )}
      </div>

      <div className="mt-4">
        {isLogging ? (
          <LogUsageForm item={item} onSave={onLogUsage} onCancel={() => setIsLogging(false)} />
        ) : (
          <button 
            onClick={() => setIsLogging(true)} 
            disabled={item.cubesLeft === 0} 
            className="btn-primary w-full text-xs !py-1.5 !px-3 disabled:bg-slate-200 dark:disabled:bg-slate-700"
          >
            Feed!
          </button>
        )}
      </div>
    </div>
  );
}