import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Minus } from 'lucide-react';
import { useData } from '../context/DataContext';

const vibrate = () => {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
};

export default function AddIngredientModal({ isOpen, onClose, onSaveIngredient }) {
    const { inventory } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);

    const availableInventory = useMemo(() => {
        return inventory.filter(item => 
            item.cubesLeft > 0 && 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventory, searchTerm]);

    const handleSelect = (item) => {
        setSelectedItem(item);
        setQuantity(1); // Reset quantity when a new item is selected
    };

    const handleQuantityChange = (delta) => {
        vibrate();
        setQuantity(prev => Math.max(1, prev + delta));
    };

    const handleSave = () => {
        if (selectedItem) {
            onSaveIngredient({
                itemId: selectedItem.id,
                name: selectedItem.name,
                cubesRequired: quantity,
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col z-50 p-4"
            >
                <div className="flex-shrink-0 flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Add Ingredient</h2>
                    <button onClick={onClose} className="p-2 text-white"><X size={28} /></button>
                </div>

                {!selectedItem ? (
                    <>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                                autoFocus
                            />
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-2">
                            {availableInventory.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className="w-full text-left p-4 bg-[var(--card-light)] dark:bg-[var(--card-dark)] rounded-lg font-semibold"
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col justify-center items-center text-center">
                        <h3 className="text-4xl font-extrabold text-white">{selectedItem.name}</h3>
                        <p className="text-slate-300 mb-8">Set the number of cubes to add to the recipe.</p>
                        <div className="flex items-center justify-center gap-6">
                            <button onClick={() => handleQuantityChange(-1)} className="p-4 rounded-full bg-slate-200 dark:bg-slate-700">
                                <Minus size={32} />
                            </button>
                            <span className="text-6xl font-bold text-white w-20 text-center">{quantity}</span>
                            <button onClick={() => handleQuantityChange(1)} className="p-4 rounded-full bg-slate-200 dark:bg-slate-700">
                                <Plus size={32} />
                            </button>
                        </div>
                        <div className="mt-12 flex gap-4">
                             <button onClick={() => setSelectedItem(null)} className="btn-secondary">Back to List</button>
                             <button onClick={handleSave} className="btn-primary">Add to Recipe</button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}