import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';

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

export default function App() {
  const { inventory } = useInventory();
  const { history } = useFeedingHistory();
  const { plans } = useMealPlans();
  const { recipes } = useRecipes();
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  return (
    <Router>
      <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-gray-50 dark:bg-gray-800`}>
        <header className="bg-white dark:bg-gray-900 p-4 shadow flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Baby Food Tracker
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </header>

        <nav className="p-4 bg-gray-100 dark:bg-gray-700 flex space-x-4">
          <Link to="/" className="hover:underline text-gray-800 dark:text-gray-200">
            Dashboard
          </Link>
          <Link to="/planner" className="hover:underline text-gray-800 dark:text-gray-200">
            Planner
          </Link>
          <Link to="/recipes" className="hover:underline text-gray-800 dark:text-gray-200">
            Recipes
          </Link>
        </nav>

        <main className="p-4 space-y-8">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <section>
                    <h2 className="text-xl font-semibold mb-2">Inventory</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {inventory.map(i => (
                        <FoodInventoryItem key={i.id} item={i} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-2">Feeding History</h2>
                    <FeedingHistory />
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-2">AI Suggestions</h2>
                    <AISuggestions />
                  </section>
                </>
              }
            />
            <Route path="/planner" element={<MealPlanCalendar />} />
            <Route
              path="/recipes"
              element={
                <div className="grid lg:grid-cols-2 gap-6">
                  <RecipeForm />
                  <RecipeList />
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
