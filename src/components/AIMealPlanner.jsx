// src/components/AIMealPlanner.jsx
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function AIMealPlanner() {
  const { inventory = [], handleAddPlan } = useData();

  const [days, setDays] = useState(() => Number(localStorage.getItem('ai_days') || 3));
  const [perMealCubes, setPerMealCubes] = useState(() => Number(localStorage.getItem('ai_perMeal') || 2));
  const [maxIngredients, setMaxIngredients] = useState(() => Number(localStorage.getItem('ai_maxIng') || 3));
  const [onlyInventory, setOnlyInventory] = useState(() => localStorage.getItem('ai_onlyInv') !== 'false');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const invByName = useMemo(() => {
    const m = new Map();
    for (const i of inventory) m.set(String(i.name || '').toLowerCase(), i);
    return m;
  }, [inventory]);

  function persist() {
    localStorage.setItem('ai_days', String(days));
    localStorage.setItem('ai_perMeal', String(perMealCubes));
    localStorage.setItem('ai_maxIng', String(maxIngredients));
    localStorage.setItem('ai_onlyInv', String(onlyInventory));
  }

  async function handleGenerate() {
    persist();
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/api/ai/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days,
          perMealCubes,
          maxIngredients,
          onlyInventory,
          inventory: (inventory || []).map(i => ({ id: i.id, name: i.name, cubesLeft: Number(i.cubesLeft || 0) })),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();

      // Normalize + enforce rules:
      const normalized = (data?.days || data?.plan || data || []).map((d, di) => {
        const date = d?.date || new Date(Date.now() + di * 86400000).toISOString().slice(0, 10);
        let meals = (d?.meals || []).map(m => ({
          mealType: (m?.mealType || 'Lunch').toLowerCase(),
          items: (m?.items || []).map(it => ({
            name: it?.name || 'Unknown',
            cubes: Number(it?.cubes || 1),
          })),
          spices: Array.isArray(m?.spices) ? m.spices : [],
        }));

        // strict exactly N ingredients
        meals = meals.filter(m => (m.items?.length || 0) === Number(maxIngredients || 1));

        // if inventory-only is on, drop items not in inventory
        if (onlyInventory) {
          meals = meals
            .map(m => ({ ...m, items: m.items.filter(it => invByName.has(String(it.name).toLowerCase())) }))
            .filter(m => (m.items?.length || 0) === Number(maxIngredients || 1));
        }

        // (optional) clamp total cubes per meal to requested perMealCubes
        meals = meals.map(m => {
          const total = m.items.reduce((s, it) => s + (Number(it.cubes) || 0), 0);
          if (total === perMealCubes || total === 0) return m;
          // scale down/up roughly to match requested total
          const factor = perMealCubes / total;
          const scaled = m.items.map(it => ({ ...it, cubes: Math.max(1, Math.round(it.cubes * factor)) }));
          // ensure exact total after rounding
          let diff = perMealCubes - scaled.reduce((s, it) => s + it.cubes, 0);
          for (let i = 0; diff !== 0 && i < scaled.length; i++) {
            scaled[i].cubes += diff > 0 ? 1 : -1;
            diff += diff > 0 ? -1 : 1;
          }
          return { ...m, items: scaled };
        });

        return { date, meals };
      });

      setResults(normalized);
      toast.success('AI suggestions ready');
    } catch (err) {
      console.error('[AI plan] error:', err);
      toast.error('AI plan failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  }

  async function addOne(meal, dateYMD) {
    const mealType = (meal.mealType || 'lunch').toLowerCase();
    for (const it of meal.items || []) {
      const inv = invByName.get(String(it.name || '').toLowerCase());
      if (!inv) continue;
      await handleAddPlan?.({
        date: new Date(`${dateYMD}T00:00:00`),
        mealType,
        itemId: inv.id,
        isRecipe: false,
        amount: Number(it.cubes || 1),
      });
    }
    toast.success(`Added ${mealType} to planner`);
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-bold">AI Meal Suggestions</h3>
          <p className="text-muted text-sm">
            Inventory-first meal ideas. Enforces exactly the number of ingredients you choose.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-muted">Days</label>
            <input className="input w-20" type="number" min="1" max="14" inputMode="numeric"
              value={days} onChange={(e) => setDays(Number(e.target.value || 1))} />
          </div>
          <div>
            <label className="block text-xs text-muted">Cubes/meal</label>
            <input className="input w-24" type="number" min="1" max="6" inputMode="numeric"
              value={perMealCubes} onChange={(e) => setPerMealCubes(Number(e.target.value || 1))} />
          </div>
          <div>
            <label className="block text-xs text-muted">Exactly N ingredients</label>
            <input className="input w-28" type="number" min="1" max="5" inputMode="numeric"
              value={maxIngredients} onChange={(e) => setMaxIngredients(Number(e.target.value || 1))} />
          </div>
          <label className="flex items-center gap-2 ml-2">
            <input type="checkbox" className="h-4 w-4"
              checked={onlyInventory} onChange={(e) => setOnlyInventory(e.target.checked)} />
            <span className="text-sm">Use inventory only</span>
          </label>
          <button type="button" className="btn-primary ml-2" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {!!results.length && (
        <div className="space-y-4">
          {results.map((day, dIdx) => (
            <div key={dIdx} className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)] p-3">
              <div className="text-sm font-semibold mb-2">{day.date}</div>
              <div className="space-y-2">
                {(day.meals || []).map((meal, mIdx) => (
                  <div key={mIdx} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                    <div className="text-xs uppercase font-bold mb-1">{meal.mealType}</div>
                    <div className="text-sm">
                      {(meal.items || []).map((it, iIdx) => (
                        <span key={iIdx} className="inline-block mr-2 mb-1 badge">
                          {it.name} ({it.cubes})
                        </span>
                      ))}
                      {meal.spices?.length ? (
                        <span className="inline-block ml-1 text-xs text-muted">• spice: {meal.spices.join(', ')}</span>
                      ) : null}
                    </div>
                    <div className="flex justify-end">
                      <button type="button" className="pill" onClick={() => addOne(meal, day.date)}>
                        Add to Planner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!results.length && !loading && (
        <div className="text-sm text-muted">No suggestions yet. Set options and tap Generate.</div>
      )}
    </section>
  );
}
