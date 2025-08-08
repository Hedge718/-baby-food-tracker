// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Calendar, BookOpen,
  ShoppingCart, BarChart2, Package
} from 'lucide-react';

import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import RecipesPage from './pages/RecipesPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ReportsPage from './pages/ReportsPage';
import InventoryPage from './pages/InventoryPage';

import { useData } from './context/DataContext';
import FAB from './components/FAB.jsx';
import QuickAddSheet from './components/QuickAddSheet.jsx';
import QuickAddForms from './components/QuickAddForms.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

function NavLink({ to, icon, children, isMobile = false }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  const active =
    'text-[var(--accent-light)] dark:text-[var(--accent-dark)] bg-[#C1A9D4]/10 dark:bg-[#D6BCFA]/10';
  const inactive =
    'text-slate-500 dark:text-slate-400 hover:text-[var(--accent-light)] dark:hover:text-[var(--accent-dark)]';

  const mobile = 'flex flex-col items-center flex-1 py-1.5';
  const desktop = 'flex items-center gap-3 px-3 py-2 rounded-lg';

  return (
    <Link
      to={to}
      className={`font-semibold transition-colors ${isActive ? active : inactive} ${isMobile ? mobile : desktop}`}
    >
      {icon}
      <span className={isMobile ? 'nav-label text-[11px] mt-0.5' : 'hidden lg:inline'}>{children}</span>
    </Link>
  );
}

export default function App() {
  const { loading } = useData();
  const location = useLocation();

  // Quick Add (mobile sheet)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState('Feeding');
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = (params.get('quick') || '').toLowerCase();
    const map = { feeding: 'Feeding', inventory: 'Inventory', shopping: 'Shopping' };
    if (map[q]) { setSheetTab(map[q]); setSheetOpen(true); }
  }, [location.search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-light)] dark:bg-[var(--bg-dark)]">
        <div className="text-xl font-bold text-[var(--accent-light)] dark:text-[var(--accent-dark)]">
          Loading Baby Tracker...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] pt-safe">
      {/* Global toaster + floating theme toggle */}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <ThemeToggle />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col p-4 bg-white/60 dark:bg-[#4A5568]/20 backdrop-blur-sm border-r border-[var(--border-light)] dark:border-[var(--border-dark)]">
        <div className="px-3 mb-10">
          <h1 className="text-2xl font-extrabold text-[var(--accent-light)] dark:text-[var(--accent-dark)]">
            BabyFeed
          </h1>
        </div>
        <nav className="flex flex-col space-y-2">
          <NavLink to="/" icon={<LayoutDashboard size={18} />}>Dashboard</NavLink>
          <NavLink to="/inventory" icon={<Package size={18} />}>Inventory</NavLink>
          <NavLink to="/shopping-list" icon={<ShoppingCart size={18} />}>Shopping List</NavLink>
          <NavLink to="/planner" icon={<Calendar size={18} />}>Planner</NavLink>
          <NavLink to="/recipes" icon={<BookOpen size={18} />}>Recipes</NavLink>
          <NavLink to="/reports" icon={<BarChart2 size={18} />}>Reports</NavLink>
        </nav>
        {/* (Desktop theme toggle is the floating button; no sidebar toggle needed) */}
      </aside>

      {/* Main */}
      <div className="flex-1 main-pad-bottom lg:pb-0">
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/shopping-list" element={<ShoppingListPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Mobile: FAB + Quick Add Sheet */}
        <div className="lg:hidden fab">
          <FAB onClick={() => setSheetOpen(true)} />
          <QuickAddSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            tab={sheetTab}
            setTab={setSheetTab}
          >
            <QuickAddForms tab={sheetTab} onDone={() => setSheetOpen(false)} />
          </QuickAddSheet>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <NavLink to="/" icon={<LayoutDashboard size={18} />} isMobile>Home</NavLink>
        <NavLink to="/inventory" icon={<Package size={18} />} isMobile>Inventory</NavLink>
        <NavLink to="/planner" icon={<Calendar size={18} />} isMobile>Planner</NavLink>
        <NavLink to="/shopping-list" icon={<ShoppingCart size={18} />} isMobile>Shop</NavLink>
        <NavLink to="/recipes" icon={<BookOpen size={18} />} isMobile>Recipes</NavLink>
        <NavLink to="/reports" icon={<BarChart2 size={18} />} isMobile>Reports</NavLink>
      </nav>
    </div>
  );
}
