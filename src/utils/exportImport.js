// src/utils/exportImport.js
import Papa from 'papaparse';
import {
  addNewInventoryItem,
  addMealPlan,
} from '../firebase';

// Prepare JSON and CSV exports from in-memory data
export function prepareExports({ inventory, history, plans }, wantCSV = false) {
  const inv = (inventory || []).map(i => ({
    id: i.id, name: i.name, cubesLeft: i.cubesLeft, status: i.status,
    madeOn: i.madeOn instanceof Date ? i.madeOn.toISOString() : i.madeOn || null,
    hidden: !!i.hidden,
  }));
  const hist = (history || []).map(h => ({
    id: h.id, name: h.name, amount: h.amount, type: h.type,
    timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : h.timestamp || null,
  }));
  const pl = (plans || []).map(p => ({
    id: p.id, mealType: p.mealType, itemId: p.itemId, isRecipe: !!p.isRecipe, amount: p.amount,
    date: p.date instanceof Date ? p.date.toISOString().slice(0,10) : p.date,
    name: p.name || null
  }));

  if (!wantCSV) {
    return { inventory: inv, history: hist, plans: pl };
  }
  return {
    inventoryCSV: Papa.unparse(inv),
    historyCSV: Papa.unparse(hist),
    plansCSV: Papa.unparse(pl),
  };
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
export function downloadCSV(text, filename) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Import JSON (merge inventory by name, append history/plans)
export async function importFromJSON(json) {
  const inv = Array.isArray(json.inventory) ? json.inventory : [];
  const plans = Array.isArray(json.plans) ? json.plans : [];
  // history import is skipped to avoid duplicate logs; can be added if needed

  // merge inventory by name (title case is handled by addNewInventoryItem)
  for (const it of inv) {
    const qty = Number(it.cubesLeft || 0);
    if (!it.name || qty <= 0) continue;
    await addNewInventoryItem({ name: it.name, cubesLeft: qty, status: it.status || 'Frozen', madeOn: it.madeOn || null });
  }

  // append plans (falls back to name-only entry if itemId not present; your Planner UI shows them)
  for (const p of plans) {
    await addMealPlan({
      date: p.date,
      mealType: p.mealType || 'breakfast',
      itemId: p.itemId || null,
      isRecipe: !!p.isRecipe,
      amount: Number(p.amount || 1),
      name: p.name || null
    });
  }
}
