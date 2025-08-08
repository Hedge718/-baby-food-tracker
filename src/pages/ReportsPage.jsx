// src/pages/ReportsPage.jsx
import React, { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useData } from '../context/DataContext';
import { format, subDays, isAfter } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { downloadJSON, downloadCSV, prepareExports, importFromJSON } from '../utils/exportImport';
import { Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// Use CSS variables with safe fallbacks so dark mode + theme just work
const COL = {
  bar: 'var(--accent-light, #7c3aed)',       // brand purple
  eaten: 'var(--accent-light, #7c3aed)',
  wasted: 'var(--accent-pink, #ec4899)',     // rose
  axis: 'var(--text-secondary-light, #64748b)',
  grid: 'var(--border-light, #e2e8f0)',
};

export default function ReportsPage() {
  const { inventory, history, plans, refreshAll } = useData();
  const [rangeDays, setRangeDays] = useState(30);
  const fileRef = useRef(null);

  const fromDate = subDays(new Date(), rangeDays);

  // Eaten vs wasted
  const { eatenTotal, wastedTotal } = useMemo(() => {
    let eaten = 0, wasted = 0;
    for (const h of history || []) {
      const t = h.timestamp instanceof Date ? h.timestamp : (h.timestamp ? new Date(h.timestamp) : null);
      if (!t || !isAfter(t, fromDate)) continue;
      if (h.type === 'eaten' || h.type === 'recipe') eaten += Number(h.amount || 0);
      if (h.type === 'wasted') wasted += Number(h.amount || 0);
    }
    return { eatenTotal: eaten, wastedTotal: wasted };
  }, [history, rangeDays]);

  // Daily eaten series
  const daySeries = useMemo(() => {
    const map = new Map();
    for (const h of history || []) {
      const t = h.timestamp instanceof Date ? h.timestamp : (h.timestamp ? new Date(h.timestamp) : null);
      if (!t || !isAfter(t, fromDate)) continue;
      if (h.type === 'eaten' || h.type === 'recipe') {
        const key = format(t, 'MM/dd');
        map.set(key, (map.get(key) || 0) + Number(h.amount || 0));
      }
    }
    return Array.from(map, ([day, cubes]) => ({ day, cubes })).sort((a, b) => a.day.localeCompare(b.day));
  }, [history, rangeDays]);

  const handleExportJSON = () => {
    const blob = prepareExports({ inventory, history, plans });
    downloadJSON(blob, `babyfeed-backup-${format(new Date(), 'yyyyMMdd-HHmm')}.json`);
  };
  const handleExportCSVs = () => {
    try {
      const { inventoryCSV, historyCSV, plansCSV } = prepareExports({ inventory, history, plans }, true);
      downloadCSV(inventoryCSV, 'inventory.csv');
      downloadCSV(historyCSV, 'history.csv');
      downloadCSV(plansCSV, 'plans.csv');
    } catch {
      toast.error('CSV export failed');
    }
  };
  const handleImportJSON = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importFromJSON(data);
      toast.success('Import complete');
      await refreshAll?.();
    } catch (e) {
      console.error(e);
      toast.error('Import failed');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Usage, waste, and quick exports/imports." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4 space-y-2">
          <div className="text-sm text-muted">Range</div>
          <select
            className="input w-44"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            aria-label="Select range"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <div className="text-sm text-muted">Eaten (cubes)</div>
              <div className="text-2xl font-extrabold">{eatenTotal}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <div className="text-sm text-muted">Wasted (cubes)</div>
              <div className="text-2xl font-extrabold">{wastedTotal}</div>
            </div>
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="font-semibold mb-2">Daily cubes eaten</div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={daySeries}>
                <CartesianGrid stroke={COL.grid} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: COL.axis, fontSize: 12 }} stroke={COL.grid} />
                <YAxis tick={{ fill: COL.axis, fontSize: 12 }} stroke={COL.grid} />
                <Tooltip />
                <Bar dataKey="cubes" fill={COL.bar} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="font-semibold mb-2">Eaten vs Wasted</div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Eaten', value: eatenTotal },
                    { name: 'Wasted', value: wastedTotal },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  labelLine={false}
                  label
                >
                  <Cell fill={COL.eaten} />
                  <Cell fill={COL.wasted} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 lg:col-span-3">
          <div className="font-semibold mb-2">Backup / Restore</div>
          <div className="flex flex-wrap gap-2">
            <button className="pill" onClick={handleExportJSON}><Download size={16} /> Export JSON</button>
            <button className="pill" onClick={handleExportCSVs}><Download size={16} /> Export CSVs</button>
            <label className="pill cursor-pointer">
              <Upload size={16} /> Import JSON
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportJSON(e.target.files[0])}
              />
            </label>
          </div>
          <p className="text-xs text-muted mt-2">
            Import merges inventory by name and appends plans. (History import is skipped to avoid duplicates.)
          </p>
        </div>
      </div>
    </div>
  );
}
