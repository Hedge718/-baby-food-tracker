// src/pages/PlannerPage.jsx
import React, { useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
} from 'date-fns';
import { useData } from '../context/DataContext';
import { ChevronLeft, ChevronRight, PlusCircle, X, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import PageHeader from '../components/PageHeader';
import AIMealPlanner from '../components/AIMealPlanner';

function PlanMealModal({ date, mealType, onClose, onSave }) {
  const { inventory, recipes } = useData();
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isIngredient, setIsIngredient] = useState(false);
  const [amount, setAmount] = useState(1);

  const canCookRecipe = (recipe) =>
    (recipe.ingredients || []).every((ing) => {
      const itemInStock = inventory.find((i) => i.id === ing.itemId);
      return itemInStock && Number(itemInStock.cubesLeft || 0) >= Number(ing.cubesRequired || 0);
    });

  const availableItems = (
    isIngredient
      ? inventory.filter((i) => Number(i.cubesLeft || 0) > 0)
      : (recipes || []).map((r) => ({ ...r, canCook: canCookRecipe(r) }))
  ).map((item) => ({
    value: item.id,
    label: item.name,
    isDisabled: !isIngredient && item.canCook === false,
  }));

  const handleSubmit = () => {
    if (!selectedItemId) {
      toast.error('Please select an item.');
      return;
    }
    onSave({
      date,
      mealType,
      itemId: selectedItemId,
      isRecipe: !isIngredient,
      amount: Number(amount || 1),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Plan ${mealType} for ${format(date, 'MMM d')}`}
    >
      <div className="card w-full max-w-md p-4">
        <h3 className="text-xl mb-4">
          Plan {mealType} for {format(date, 'MMM d')}
        </h3>

        <div className="space-y-4">
          <Select
            options={availableItems}
            onChange={(option) => setSelectedItemId(option?.value ?? null)}
            className="flex-grow"
            classNamePrefix="select"
            placeholder={isIngredient ? 'Select Ingredient…' : 'Select Recipe…'}
            styles={{
              control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.15rem' }),
              option: (styles, { isDisabled }) => ({
                ...styles,
                color: isDisabled ? '#999' : undefined,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }),
            }}
            isOptionDisabled={(opt) => opt.isDisabled}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isIngredientModal"
              checked={isIngredient}
              onChange={(e) => {
                setIsIngredient(e.target.checked);
                setSelectedItemId(null);
              }}
              className="h-4 w-4 rounded"
            />
            <label htmlFor="isIngredientModal">Plan a single ingredient instead</label>
          </div>

          {isIngredient && selectedItemId && (
            <div>
              <label className="block text-sm font-bold mb-1">Number of Cubes</label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
                aria-label="Number of cubes"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">Save Plan</button>
        </div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const {
    inventory,
    recipes,
    plans,
    handleAddPlan,
    handleDeletePlan,
    handleCookRecipe,
    handleLogUsage,
  } = useData();

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
    const item = (source || []).find((i) => i.id === plan.itemId);
    return item ? item.name : 'Unknown';
  };

  const handleMarkAsEaten = (plan) => {
    const { isRecipe, itemId, amount } = plan;

    if (isRecipe) {
      const recipeToCook = (recipes || []).find((r) => r.id === itemId);
      if (!recipeToCook) {
        toast.error('Recipe not found!');
        return;
      }
      handleCookRecipe(recipeToCook);
      handleDeletePlan(plan.id);
      return;
    }

    const inventoryItem = (inventory || []).find((i) => i.id === itemId);
    const needed = Number(amount || 1);
    if (!inventoryItem) {
      toast.error('Item not found in inventory!');
      return;
    }
    if (Number(inventoryItem.cubesLeft || 0) < needed) {
      toast.error(`Not enough ${inventoryItem.name} in inventory!`);
      return;
    }
    handleLogUsage(inventoryItem, needed, false);
    handleDeletePlan(plan.id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meal Planner"
        subtitle="Plan your baby's meals for the week."
        right={
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous week"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-[#4A5568]/60"
              title="Previous week"
            >
              <ChevronLeft />
            </button>
            <div className="text-sm font-semibold">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <button
              aria-label="Next week"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-[#4A5568]/60"
              title="Next week"
            >
              <ChevronRight />
            </button>
          </div>
        }
      />

      {/* AI panel */}
      <AIMealPlanner />

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="card !p-3 space-y-2 bg-slate-50 dark:bg-slate-800/50 h-full"
          >
            <p className="font-extrabold text-center">{format(day, 'E')}</p>
            <p className="text-sm text-center -mt-2 mb-2">{format(day, 'd')}</p>

            <div className="space-y-1">
              {mealTypes.map((meal) => {
                const plannedMeals = (plans || []).filter(
                  (p) =>
                    isSameDay(new Date(p.date), day) &&
                    (p.mealType || '').toLowerCase() === meal.toLowerCase()
                );
                return (
                  <div
                    key={meal}
                    className="bg-white dark:bg-slate-900/70 p-2 rounded-lg text-left min-h-[6rem] flex flex-col"
                  >
                    <p className="text-xs font-bold uppercase">{meal}</p>

                    <div className="space-y-1 mt-1 flex-grow">
                      {plannedMeals.map((plan) => (
                        <div
                          key={plan.id}
                          className="text-xs bg-sky-100 dark:bg-sky-900/50 p-1 rounded group"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold truncate pr-1">
                              {getMealName(plan)} {!plan.isRecipe && `(${plan.amount})`}
                            </span>
                            <button
                              aria-label="Remove planned meal"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="text-slate-400 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100"
                              title="Remove"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <button
                            aria-label="Mark meal as fed"
                            onClick={() => handleMarkAsEaten(plan)}
                            className="text-green-600 font-bold w-full text-center hover:underline text-[10px] flex items-center justify-center gap-1 mt-1"
                            title="Fed!"
                          >
                            <Utensils size={12} /> Fed!
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      aria-label="Add planned meal"
                      onClick={() => openModal(day, meal.toLowerCase())}
                      className="mt-1 text-[var(--accent-light)] w-full flex justify-center pt-1 min-h-[44px]"
                      title="Add meal"
                    >
                      <PlusCircle size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <PlanMealModal
          date={modalData.date}
          mealType={modalData.mealType}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddPlan}
        />
      )}
    </div>
  );
}
