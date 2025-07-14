import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { useData } from '../context/DataContext';
import { ChevronLeft, ChevronRight, PlusCircle, X, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from 'react-select';

function PlanMealModal({ date, mealType, onClose, onSave }) {
    const { inventory, recipes } = useData();
    const [selectedItemId, setSelectedItemId] = useState('');
    const [isIngredient, setIsIngredient] = useState(false);
    const [amount, setAmount] = useState(1);

    const canCookRecipe = (recipe) => {
        return (recipe.ingredients || []).every(ing => {
            const itemInStock = inventory.find(i => i.id === ing.itemId);
            return itemInStock && itemInStock.cubesLeft >= ing.cubesRequired;
        });
    };
    
    const availableItems = (isIngredient 
        ? inventory.filter(i => i.cubesLeft > 0)
        : recipes.map(r => ({ ...r, canCook: canCookRecipe(r) }))
    ).map(item => ({ value: item.id, label: item.name, isDisabled: !isIngredient && !item.canCook }));

    const handleSubmit = () => {
        if (selectedItemId) {
            onSave({ date, mealType, itemId: selectedItemId, isRecipe: !isIngredient, amount: Number(amount) });
            onClose();
        } else {
            toast.error("Please select an item.");
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md">
                <h3 className="text-xl mb-4">Plan {mealType} for {format(date, 'MMM d')}</h3>
                <div className="space-y-4">
                    <Select
                        options={availableItems}
                        onChange={(option) => setSelectedItemId(option.value)}
                        className="flex-grow"
                        placeholder={isIngredient ? 'Select Ingredient...' : 'Select Recipe...'}
                        styles={{ control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.15rem' }) }}
                    />
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isIngredientModal" checked={isIngredient} onChange={(e) => setIsIngredient(e.target.checked)} className="h-4 w-4 rounded text-[var(--accent-light)] focus:ring-[var(--accent-light)]"/>
                        <label htmlFor="isIngredientModal">Plan a single ingredient instead</label>
                    </div>
                    {isIngredient && selectedItemId && (
                        <div>
                            <label className="block text-sm font-bold text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mb-1">Number of Cubes</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" className="input-field" />
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} className="btn-primary">Save Plan</button>
                </div>
            </div>
        </div>
    );
}

export default function PlannerPage() {
    const { inventory, recipes, plans, handleAddPlan, handleDeletePlan, handleCookRecipe, setHistory, setInventory, handleLogUsage } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);

    const weekStartsOn = 1; // Monday
    const weekStart = startOfWeek(currentDate, { weekStartsOn });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];

    const openModal = (date, mealType) => {
        setModalData({ date, mealType });
        setIsModalOpen(true);
    };

    const getMealName = (plan) => {
        const source = plan.isRecipe ? recipes : inventory;
        const item = (source || []).find(i => i.id === plan.itemId);
        return item ? item.name : 'Unknown';
    };

    const handleMarkAsEaten = (plan) => {
      const { isRecipe, itemId, amount } = plan;
      if (isRecipe) {
        const recipeToCook = recipes.find(r => r.id === itemId);
        if (recipeToCook) {
          handleCookRecipe(recipeToCook, inventory, setInventory, setHistory);
          handleDeletePlan(plan.id);
        } else {
          toast.error("Recipe not found!");
        }
      } else {
        const inventoryItem = inventory.find(i => i.id === itemId);
        if (inventoryItem && inventoryItem.cubesLeft >= amount) {
          handleLogUsage(inventoryItem, amount, false, setHistory, () => {});
          handleDeletePlan(plan.id);
        } else {
          toast.error(`Not enough ${inventoryItem ? inventoryItem.name : 'food'} in inventory!`);
        }
      }
    };

    return (
        <div className="space-y-8">
            <section>
                <h2 className="text-4xl">Meal Planner</h2>
                <p className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mt-1">
                    Plan your baby's meals for the week.
                </p>
            </section>
            
            <div className="flex justify-between items-center">
                <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-[#4A5568]/60"><ChevronLeft /></button>
                <h3 className="text-xl font-bold">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</h3>
                <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-[#4A5568]/60"><ChevronRight /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {days.map(day => (
                    <div key={day.toString()} className="card !p-3 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                        <p className="font-extrabold text-center">{format(day, 'E')}</p>
                        <p className="text-sm text-center -mt-2">{format(day, 'd')}</p>
                        <div className="space-y-2">
                            {mealTypes.map(meal => {
                                const plannedMeals = (plans || []).filter(p => isSameDay(new Date(p.date), day) && p.mealType.toLowerCase() === meal.toLowerCase());
                                return (
                                    <div key={meal} className="bg-white dark:bg-slate-900/70 p-2 rounded-lg text-left min-h-[6rem] flex flex-col">
                                        <p className="text-xs font-bold uppercase">{meal}</p>
                                        <div className="space-y-1 mt-1 flex-grow">
                                            {plannedMeals.map(plan => (
                                                <div key={plan.id} className="text-xs bg-sky-100 dark:bg-sky-900/50 p-1 rounded group">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold truncate pr-1">{getMealName(plan)} {!plan.isRecipe && `(${plan.amount})`}</span>
                                                        <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                                    </div>
                                                    <button onClick={() => handleMarkAsEaten(plan)} className="text-green-600 font-bold w-full text-center hover:underline text-[10px] flex items-center justify-center gap-1 mt-1">
                                                        <Utensils size={12}/> Fed!
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => openModal(day, meal.toLowerCase())} className="mt-1 text-[var(--accent-light)] w-full flex justify-center pt-1">
                                            <PlusCircle size={20} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            
            {isModalOpen && <PlanMealModal date={modalData.date} mealType={modalData.mealType} onClose={() => setIsModalOpen(false)} onSave={handleAddPlan}/>}
        </div>
    );
}