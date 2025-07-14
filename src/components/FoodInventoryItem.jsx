import React, { useState } from 'react';
import { Save, X, Plus, Minus, Smile, Meh, Frown, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// A simple utility for haptic feedback
const vibrate = () => {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50); // 50ms vibration
    }
};

function StatusSelector({ currentStatus, onSelect }) {
    const statuses = [
        { id: 'liked', icon: <Smile size={20} className="text-green-500"/>, label: 'Liked' },
        { id: 'disliked', icon: <Frown size={20} className="text-orange-500"/>, label: 'Disliked' },
        { id: 'allergy', icon: <AlertCircle size={20} className="text-red-500"/>, label: 'Allergy Concern' },
        { id: 'new', icon: <Meh size={20} className="text-slate-500"/>, label: 'Reset to New' },
    ];

    return (
        <div className="flex justify-around items-center pt-2 mt-2 border-t border-[var(--border-light)] dark:border-[var(--border-dark)]">
            {statuses.map(status => (
                <button 
                    key={status.id}
                    onClick={() => {
                        onSelect(status.id);
                        vibrate();
                    }}
                    className={`p-3 rounded-full transition-colors ${currentStatus === status.id ? 'bg-slate-200 dark:bg-slate-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    aria-label={status.label}
                    title={status.label}
                >
                    {status.icon}
                </button>
            ))}
        </div>
    );
}

function LogUsageForm({ item, onSave, onCancel }) {
  const [amountUsed, setAmountUsed] = useState(1);
  const [isTrash, setIsTrash] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amountUsed > 0 && amountUsed <= item.cubesLeft) {
      onSave(item, amountUsed, isTrash);
      onCancel();
    } else {
      toast.error(`Please enter a valid amount between 1 and ${item.cubesLeft}.`);
    }
  };

  const handleAmountChange = (delta) => {
    vibrate();
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
        <div className="flex items-center justify-center gap-4">
            <button type="button" onClick={() => handleAmountChange(-1)} className="p-4 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <Minus size={20}/>
            </button>
            <span className="text-3xl font-bold w-12 text-center">{amountUsed}</span>
            <button type="button" onClick={() => handleAmountChange(1)} className="p-4 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <Plus size={20}/>
            </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2">
        <input 
          type="checkbox"
          id={`isTrash-${item.id}`}
          checked={isTrash}
          onChange={(e) => setIsTrash(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-light)] dark:border-[var(--border-dark)] text-[var(--accent-light)] focus:ring-[var(--accent-light)]"
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

export default function FoodInventoryItem({ item, onLogUsage, onUpdateStatus }) {
  const [isLogging, setIsLogging] = useState(false);

  const badgeColorClass = item.hasShortfall
    ? 'text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-300'
    : 'text-amber-800 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300';
    
  const statusIcon = {
      'liked': <Smile size={16} className="text-green-500"/>,
      'disliked': <Frown size={16} className="text-orange-500"/>,
      'allergy': <AlertCircle size={16} className="text-red-500"/>,
      'new': <Meh size={16} className="text-slate-500"/>,
  }[item.status || 'new'];

  return (
    <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="card flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start">
            <h3 className="text-2xl font-bold flex items-center gap-2">{statusIcon} {item.name}</h3>
            <div className="text-right flex-shrink-0 ml-4">
                <p className="text-5xl font-extrabold text-[var(--accent-light)] dark:text-[var(--accent-dark)] leading-none">{item.cubesLeft}</p>
                <p className="text-xs text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] -mt-1">CUBES</p>
            </div>
        </div>
        
        {item.reserved > 0 && (
            <div className={`text-xs font-bold px-2 py-1 rounded-full mt-2 text-center w-fit ${badgeColorClass}`}>
                {item.reserved} reserved in planner
            </div>
        )}
      </div>

      <div className="mt-4">
        {isLogging ? (
          <LogUsageForm item={item} onSave={onLogUsage} onCancel={() => setIsLogging(false)} />
        ) : (
          <>
            <StatusSelector currentStatus={item.status} onSelect={(status) => onUpdateStatus(item.id, status)} />
            <button 
              onClick={() => setIsLogging(true)} 
              disabled={item.cubesLeft === 0} 
              className="btn-primary w-full text-sm !py-2 mt-2 disabled:bg-slate-200 dark:disabled:bg-slate-700"
            >
              Feed!
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}