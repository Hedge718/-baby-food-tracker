import React, { useState } from 'react';
import { format } from 'date-fns';
import { Apple, Trash2, X, Utensils, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';

export default function FeedingHistory({ history, loading, onDelete }) {
    const [showAll, setShowAll] = useState(false);
    
    if (loading) {
        return <div className="card"><p className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">Loading...</p></div>;
    }
    
    const displayedHistory = showAll ? (history || []) : (history || []).slice(0, 5);

    const getIcon = (type) => {
        switch(type) {
            case 'eaten': return <Apple className="text-green-500" size={20} />;
            case 'wasted': return <Trash2 className="text-red-500" size={20} />;
            case 'recipe': return <Utensils className="text-blue-500" size={20} />;
            default: return <Apple className="text-green-500" size={20} />;
        }
    };

    const handleExport = () => {
        const dataToExport = history.map(item => ({
            Date: format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
            Food: item.name,
            Amount: item.amount,
            Type: item.type,
        }));
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "feeding_history.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="card">
            {(history && history.length > 0) ? (
                <>
                    <div className="flex justify-end mb-4 -mt-2">
                        <button onClick={handleExport} className="btn-secondary !py-1 !px-2 text-xs">
                            <Download size={14} />
                            Export
                        </button>
                    </div>
                    <ul className="space-y-3">
                        <AnimatePresence initial={false}>
                            {displayedHistory.map(h => (
                                <motion.li
                                    key={h.id}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl flex justify-between items-center group"
                                >
                                    <div className="flex items-center gap-3">
                                        {getIcon(h.type)}
                                        <div>
                                            <span className="font-bold">{h.name}</span>
                                            {h.type !== 'recipe' && (
                                                <span className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]"> — {h.amount} cubes {h.type}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">
                                            {h.timestamp ? format(new Date(h.timestamp), 'MMM d, h:mm a') : 'Just now'}
                                        </span>
                                        <button onClick={() => onDelete(h.id)} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" aria-label="Delete history item">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                    {history.length > 5 && (
                        <div className="text-center mt-4 pt-4 border-t border-[var(--border-light)] dark:border-[var(--border-dark)]">
                            <button onClick={() => setShowAll(!showAll)} className="font-bold text-sm text-[var(--accent-light)] dark:text-[var(--accent-dark)] hover:underline">
                                {showAll ? 'Show Less' : `Show All ${history.length} Events`}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <p className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] text-center py-4">No events recorded yet.</p>
            )}
        </div>
    );
}