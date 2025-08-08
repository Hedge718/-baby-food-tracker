// src/services/ai.js
const API_BASE = import.meta.env.VITE_API_BASE || ''; // e.g. https://babyfeed-api.onrender.com

async function handle(r, fallbackMsg) {
  if (!r.ok) {
    try {
      const body = await r.json();
      throw new Error(body?.error || fallbackMsg);
    } catch {
      throw new Error(await r.text());
    }
  }
  return r.json();
}

export async function generateMealIdeas({
  inventory,
  days = 3,
  ageMonths = 9,
  avoidAllergens = [],
  notes = '',
  cubesPerMeal = null,
  ingredientsPerMeal = null,
  inventoryOnly = true,
}) {
  const r = await fetch(`${API_BASE}/api/meal-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inventory,
      days,
      ageMonths,
      avoidAllergens,
      notes,
      cubesPerMeal,
      ingredientsPerMeal,
      inventoryOnly,
    }),
  });
  return handle(r, 'AI plan failed');
}

export async function generateShoppingIdeas({
  inventory,
  days = 5,
  ageMonths = 9,
  avoidAllergens = [],
  notes = '',
}) {
  const r = await fetch(`${API_BASE}/api/shopping-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inventory, days, ageMonths, avoidAllergens, notes }),
  });
  return handle(r, 'Shopping suggestions failed');
}
