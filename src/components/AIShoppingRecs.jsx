// src/components/AIShoppingRecs.jsx
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function AIShoppingRecs() {
  const data = useData();
  const { inventory = [], shoppingList = [] } = data || {};

  // Prefer your context handler (we expose multiple names)
  const addHandler =
    data?.handleAddShoppingItem ||
    data?.handleAddToShoppingList ||
    data?.handleAddItemToShoppingList ||
    (async (name) => {
      console.warn('No shopping add handler found; showing toast only:', name);
      toast(name);
    });

  const [daysToCover, setDaysToCover] = useState(() => Number(localStorage.getItem('shop_days') || 3));
  const [perDayCubes, setPerDayCubes] = useState(() => Number(localStorage.getItem('shop_perday') || 6));
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState([]);

  const shoppingNames = useMemo(
    () => new Set((shoppingList || []).map(s => String(s.name || '').toLowerCase())),
    [shoppingList]
  );

  async function generate() {
    localStorage.setItem('shop_days', String(daysToCover));
    localStorage.setItem('shop_perday', String(perDayCubes));
    setLoading(true);
    setRecs([]);
    try {
      const res = await fetch(`${API_BASE}/api/ai/shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysToCover: Number(daysToCover || 0),
          perDayCubes: Number(perDayCubes || 0),
          inventory: (inventory || []).map(i => ({
            id: i.id,
            name: i.name,
            cubesLeft: Number(i.cubesLeft || 0),
          })),
          shoppingList: (shoppingList || []).map(s => ({ id: s.id, name: s.name })),
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${t}`);
      }
      const data = await res.json();
      const next = (data.items || []).filter(it => !shoppingNames.has(String(it?.name || '').toLowerCase()));
      setRecs(next);
      toast.success('Shopping suggestions ready');
    } catch (e) {
      console.error('[AI shop] error', e);
      toast.error('Shopping AI failed. Check console.');
    } finally {
      setLoading(false);
    }
  }

  async function addOne(name) {
    if (!name) return;
    if (shoppingNames.has(String(name).toLowerCase())) {
      toast('Already on your list');
      return;
    }
    await addHandler(name);
    toast.success(`Added ${name}`);
  }

  async function addAll() {
    for (const it of recs) {
      const key = String(it?.name || '').toLowerCase();
      if (!key || shoppingNames.has(key)) continue;
      // quantity is optional; add 1+ times if present
      const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
      for (let i = 0; i < qty; i++) {
        // eslint-disable-next-line no-await-in-loop
        await addHandler(it.name);
      }
    }
    toast.success('All suggestions added');
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-muted">Days to cover</label>
          <input
            className="input w-24"
            type="number"
            min="1"
            max="30"
            inputMode="numeric"
            value={daysToCover}
            onChange={(e) => setDaysToCover(Number(e.target.value || 1))}
          />
        </div>
        <div>
          <label className="block text-xs text-muted">Cubes per day</label>
          <input
            className="input w-28"
            type="number"
            min="1"
            max="24"
            inputMode="numeric"
            value={perDayCubes}
            onChange={(e) => setPerDayCubes(Number(e.target.value || 1))}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={generate}
          disabled={loading}
          aria-busy={loading ? 'true' : 'false'}
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
        {!!recs.length && (
          <button type="button" className="btn-outline" onClick={addAll}>
            Add All
          </button>
        )}
      </div>

      {!recs.length && !loading && (
        <div className="text-sm text-muted">
          No shopping suggestions yet. Set your options and tap Generate.
          {daysToCover ? ` (Target: ${daysToCover} day${daysToCover>1?'s':''})` : null}
        </div>
      )}

      {!!recs.length && (
        <div className="space-y-2">
          {recs.map((it, idx) => {
            const exists = shoppingNames.has(String(it.name || '').toLowerCase());
            return (
              <div key={idx} className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)] p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-xs text-muted">
                    Qty: {Math.max(1, Math.round(Number(it.quantity) || 1))}
                    {it.reason ? ` — ${it.reason}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="pill"
                  onClick={() => addOne(it.name)}
                  disabled={exists}
                  title={exists ? 'Already on list' : 'Add to shopping'}
                >
                  {exists ? 'On List' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
