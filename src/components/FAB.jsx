// src/components/FAB.jsx
import React from 'react';
import { Plus } from 'lucide-react';

export default function FAB({ onClick }) {
  return (
    <button
      aria-label="Quick add"
      onClick={onClick}
      className="rounded-full w-14 h-14 flex items-center justify-center text-white shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-400/40"
      style={{
        background: 'linear-gradient(180deg, #a78bfa, #7c3aed)'
      }}
    >
      <Plus size={22} />
    </button>
  );
}
