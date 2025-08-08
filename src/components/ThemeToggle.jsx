import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const getInitial = () =>
    document.documentElement.classList.contains('dark');

  const [isDark, setIsDark] = useState(getInitial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setIsDark((v) => !v)}
      className={`fixed z-50 right-3 top-3 lg:right-4 lg:top-4 rounded-full border px-3 py-2 text-sm
        bg-white/90 dark:bg-slate-900/80 backdrop-blur
        border-[var(--border-light)] dark:border-[var(--border-dark)]
        shadow-sm ${className}`}
    >
      {isDark ? (
        <span className="inline-flex items-center gap-2"><Sun size={16}/> Light</span>
      ) : (
        <span className="inline-flex items-center gap-2"><Moon size={16}/> Dark</span>
      )}
    </button>
  );
}
