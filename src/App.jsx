import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useInventory } from './hooks/useInventory';
import { useFeedingHistory } from './hooks/useFeedingHistory';
import { useMealPlans } from './hooks/useMealPlans';
import { useRecipes } from './hooks/useRecipes';

import FoodInventoryItem from './components/FoodInventoryItem';
import FeedingHistory from './components/FeedingHistory';
import AISuggestions from './components/AISuggestions';
import MealPlanCalendar from './components/MealPlanCalendar';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import InventoryForm from './components/InventoryForm';

function App() {
  const { inventory, loading: inventoryLoading, error: inventoryError, setInventory, addInventoryItem } = useInventory();
  const { history, loading: historyLoading, error: historyError } = useFeedingHistory();
  const { plans } = useMealPlans();
  const { recipes } = useRecipes();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen">
      <header className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
                <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-500">
                    Baby Food Tracker
                </h1>
                <button onClick={() => setDarkMode(!darkMode)} className="btn-secondary">
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </div>
            <nav className="flex space-x-4 border-t border-slate-200 dark:border-slate-700 -mb-px">
              <Link to="/" className="border-transparent text-slate-500 hover:border-sky-500 hover:text-sky-600 border-b-2 px-1 pt-4 text-sm font-medium">Dashboard</Link>
              <Link to="/planner" className="border-transparent text-slate-500 hover:border-sky-500 hover:text-sky-600 border-b-2 px-1 pt-4 text-sm font-medium">Planner</Link>
              <Link to="/recipes" className="border-transparent text-slate-500 hover:border-sky-500 hover:text-sky-600 border-b-2 px-1 pt-4 text-sm font-medium">Recipes</Link>
            </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Routes>
          <Route path="/" element={
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">Inventory</h2>
                  {inventoryLoading && <p>Loading inventory...</p>}
                  {inventoryError && <p className="text-red-500">Error loading inventory.</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inventory.map(i => <FoodInventoryItem key={i.id} item={i} />)}
                  </div>
                </section>
                <section>
                  <h2 className="text-2xl font-bold mb-4">Feeding History</h2>
                  <FeedingHistory history={history} loading={historyLoading} error={historyError} />
                </section>
              </div>
              <div className="lg:col-span-1 space-y-8">
                <section>
                    <InventoryForm onAddItem={addInventoryItem} inventory={inventory} setInventory={setInventory} />
                </section>
                <section>
                    <h2 className="text-2xl font-bold mb-4">AI Suggestions</h2>
                    <AISuggestions />
                </section>
              </div>
            </div>
          } />
          <Route path="/planner" element={<MealPlanCalendar plans={plans} />} />
          <Route path="/recipes" element={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RecipeForm />
              <RecipeList />
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}