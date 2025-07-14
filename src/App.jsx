import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Calendar, BookOpen, Sun, Moon, ShoppingCart } from 'lucide-react';

// Import Page Components
import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import RecipesPage from './pages/RecipesPage';
import ShoppingListPage from './pages/ShoppingListPage';

function NavLink({ to, icon, children, isMobile = false }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    const activeClass = 'text-[var(--accent-light)] dark:text-[var(--accent-dark)] bg-[#C1A9D4]/10 dark:bg-[#D6BCFA]/10';
    const inactiveClass = 'text-slate-500 dark:text-slate-400 hover:text-[var(--accent-light)] dark:hover:text-[var(--accent-dark)]';

    const mobileClasses = 'flex flex-col items-center flex-1 py-2';
    const desktopClasses = 'flex items-center gap-3 px-3 py-2 rounded-lg';
    
    return (
        <Link to={to} className={`font-bold transition-colors ${isActive ? activeClass : inactiveClass} ${isMobile ? mobileClasses : desktopClasses}`}>
            {icon}
            <span className={isMobile ? 'text-xs' : 'hidden lg:inline'}>{children}</span>
        </Link>
    );
}

// This is the main application shell
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) return savedTheme === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  return (
    <div className="flex min-h-screen">
      <Toaster position="top-center" />
      
      <aside className="hidden lg:flex w-64 flex-col p-4 bg-white/60 dark:bg-[#4A5568]/20 backdrop-blur-sm border-r border-[var(--border-light)] dark:border-[var(--border-dark)]">
          <div className="px-3 mb-10">
            <h1 className="text-2xl font-extrabold text-[var(--accent-light)] dark:text-[var(--accent-dark)]">BabyFeed</h1>
          </div>
          <nav className="flex flex-col space-y-2">
              <NavLink to="/" icon={<LayoutDashboard size={20}/>}>Dashboard</NavLink>
              <NavLink to="/shopping-list" icon={<ShoppingCart size={20}/>}>Shopping List</NavLink>
              <NavLink to="/planner" icon={<Calendar size={20}/>}>Planner</NavLink>
              <NavLink to="/recipes" icon={<BookOpen size={20}/>}>Recipes</NavLink>
          </nav>
          <button onClick={() => setIsDarkMode(prev => !prev)} className="mt-auto flex items-center gap-3 px-3 py-2 text-base font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#4A5568]/60 rounded-lg">
            {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
      </aside>

      <div className="flex-1 pb-24 lg:pb-0">
          <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/shopping-list" element={<ShoppingListPage />} />
            </Routes>
          </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#2D3748]/95 backdrop-blur-lg border-t border-[var(--border-light)] dark:border-[var(--border-dark)] flex justify-around">
        <NavLink to="/" icon={<LayoutDashboard size={24}/>} isMobile={true}>Dashboard</NavLink>
        <NavLink to="/shopping-list" icon={<ShoppingCart size={24}/>} isMobile={true}>Shopping</NavLink>
        <NavLink to="/planner" icon={<Calendar size={24}/>} isMobile={true}>Planner</NavLink>
        <NavLink to="/recipes" icon={<BookOpen size={24}/>} isMobile={true}>Recipes</NavLink>
      </nav>
    </div>
  );
}