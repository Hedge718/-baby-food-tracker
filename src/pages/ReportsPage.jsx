// src/pages/ReportsPage.jsx
import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const { history } = useData();

  // Build data
  const sum = (type) => history.filter(h => h.type === type).reduce((s,h)=>s + (h.amount||0), 0);
  const eaten = sum('eaten') + sum('recipe'); // recipes consume ingredients
  const wasted = sum('wasted');

  // Simple daily bars (last 30 days)
  const byDay = useMemo(() => {
    const m = new Map();
    history.forEach(h => {
      const d = (h.timestamp instanceof Date ? h.timestamp : new Date(h.timestamp)).toISOString().slice(5,10);
      const v = (h.type === 'wasted') ? 0 : (h.amount || 0);
      m.set(d, (m.get(d) || 0) + v);
    });
    return Array.from(m.entries()).slice(-30).map(([day, val]) => ({ day, val }));
  }, [history]);

  return (
    <div className="page-wrap space-y-6">
      <section>
        <h2 className="text-3xl sm:text-4xl font-extrabold">Reports</h2>
        <p className="text-muted mt-1">Usage, waste, and quick exports/imports.</p>
      </section>

      <div className="card">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-muted">Eaten (cubes)</div>
            <div className="text-2xl font-bold">{eaten}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Wasted (cubes)</div>
            <div className="text-2xl font-bold">{wasted}</div>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
              <XAxis dataKey="day" tick={{ fontSize: 12 }}/>
              <YAxis tick={{ fontSize: 12 }}/>
              <Tooltip />
              <Bar dataKey="val" fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h4 className="font-semibold mb-3">Eaten vs Wasted</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={[{name:'Eaten', value:eaten},{name:'Wasted', value:wasted}]}
                   cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={1} dataKey="value">
                {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h4 className="font-semibold mb-3">Backup / Restore</h4>
        <div className="flex flex-wrap gap-2">
          <button className="pill">Export JSON</button>
          <button className="pill">Export CSVs</button>
        </div>
      </div>
    </div>
  );
}
