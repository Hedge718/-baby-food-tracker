// api/meal-ideas.js
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const todayISO = () => new Date().toISOString().slice(0, 10);

function systemPrompt() {
  return `
You are a pediatric nutrition helper. Plan baby-friendly meals using the user's freezer "cubes" inventory.

Safety & rules:
- Use inventory first; no added sugar; no honey if ageMonths < 12; low sodium; avoid choking hazards.
- If item is in avoidAllergens, do NOT use it; prefer substitutions.
- Choose exactly one mild spice per meal: cinnamon, nutmeg, cardamom, cumin, coriander, turmeric, garlic powder, dill, basil, oregano, sweet paprika.
- If "inventoryOnly" is true, include ONLY meals that can be made from inventory (do not add shopping).
- If "cubesPerMeal" is provided, aim for that total cubes across "uses" (±1 if needed).
- If "ingredientsPerMeal" is provided, use **exactly** that many distinct ingredients per meal. Prefer adding an extra ingredient (not increasing cubes wildly) rather than returning fewer items. If truly impossible with the inventory, explain why in "notes".
- Up to 3 meals per day max.

Return strict JSON:
{
  "plans":[
    {"date":"YYYY-MM-DD","meals":[
      {"title":"Example","uses":[{"name":"Apple","cubes":2}],"spice":"Cinnamon","recipe":"1-3 short steps.","notes":""}
    ]}
  ],
  "shopping":[]
}
`.trim();
}

function normalizeName(s = '') {
  return String(s).trim().toLowerCase();
}

function enforceExactIngredients(planJson, inv, exactCount, cubesPerMeal) {
  if (!planJson?.plans?.length || !exactCount || exactCount < 1) return planJson;

  // Build a map of inventory items by normalized name and available cubes
  const invMap = new Map(
    (inv || []).map((i) => [normalizeName(i.name), { ...i, avail: Number(i.cubesLeft || 0) }])
  );

  const pickExtra = (existingNames) => {
    for (const item of inv || []) {
      const key = normalizeName(item.name);
      if (existingNames.has(key)) continue;
      if ((item.cubesLeft || 0) > 0) return item.name;
    }
    return null;
  };

  for (const day of planJson.plans) {
    for (const meal of day.meals || []) {
      // Clean "uses": keep only items in inventory, merge duplicates, ensure cubes >= 1
      const merged = new Map();
      for (const u of Array.isArray(meal.uses) ? meal.uses : []) {
        const key = normalizeName(u.name);
        if (!invMap.has(key)) continue; // drop non-inventory
        const cur = merged.get(key) || 0;
        const cubes = Math.max(1, Number(u.cubes || 1));
        merged.set(key, cur + cubes);
      }

      // Trim or pad to exactCount ingredients
      let names = Array.from(merged.keys());
      if (names.length > exactCount) {
        // Keep first N
        names = names.slice(0, exactCount);
      } else if (names.length < exactCount) {
        // Add distinct extras from inventory
        const existing = new Set(names);
        while (names.length < exactCount) {
          const extra = pickExtra(existing);
          if (!extra) break;
          const key = normalizeName(extra);
          existing.add(key);
          names.push(key);
          merged.set(key, (merged.get(key) || 0) + 1); // start at 1 cube
        }
      }

      // Reconstruct uses
      let uses = names.map((key) => ({ name: invMap.get(key)?.name || key, cubes: merged.get(key) || 1 }));

      // Respect cubesPerMeal if provided: adjust to target sum while keeping >=1 and <= inventory
      if (cubesPerMeal && Number.isFinite(Number(cubesPerMeal))) {
        const target = Math.max(exactCount, Number(cubesPerMeal));
        // Cap by inventory availability
        uses = uses.map((u) => {
          const key = normalizeName(u.name);
          const maxAvail = invMap.get(key)?.avail ?? Infinity;
          return { ...u, cubes: Math.min(u.cubes, Math.max(1, maxAvail)) };
        });

        const sum = () => uses.reduce((s, u) => s + Number(u.cubes || 0), 0);
        let total = sum();

        // Increase cubes up to target (round-robin), but don't exceed availability
        if (total < target) {
          let idx = 0;
          let safety = 1000;
          while (total < target && safety-- > 0) {
            const u = uses[idx % uses.length];
            const key = normalizeName(u.name);
            const maxAvail = invMap.get(key)?.avail ?? Infinity;
            if (u.cubes < maxAvail) {
              u.cubes += 1;
              total += 1;
            }
            idx += 1;
            // If we've looped and can't add anywhere, break
            if (idx > uses.length * 2 && !uses.some(x => x.cubes < (invMap.get(normalizeName(x.name))?.avail ?? Infinity))) {
              break;
            }
          }
        }

        // Decrease cubes down to target (round-robin), keep each >=1
        if (total > target) {
          let idx = 0;
          let safety = 1000;
          while (total > target && safety-- > 0) {
            const u = uses[idx % uses.length];
            if (u.cubes > 1) {
              u.cubes -= 1;
              total -= 1;
            }
            idx += 1;
            // If all are 1, stop
            if (idx > uses.length * 2 && !uses.some(x => x.cubes > 1)) break;
          }
        }
      }

      // Save back
      const adjustedCount = Array.isArray(uses) ? uses.length : 0;
      meal.uses = uses;
      if (adjustedCount !== exactCount) {
        const note = `Adjusted to ${adjustedCount}/${exactCount} ingredients based on inventory.`;
        meal.notes = meal.notes ? `${meal.notes} ${note}` : note;
      }
    }
  }

  return planJson;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {}

    const {
      inventory = [],
      days = 3,
      ageMonths = 9,
      avoidAllergens = [],
      notes = '',
      cubesPerMeal = null,
      ingredientsPerMeal = null,
      inventoryOnly = true,
    } = body;

    const user = {
      days,
      ageMonths,
      avoidAllergens,
      notes,
      cubesPerMeal: cubesPerMeal ? Number(cubesPerMeal) : null,
      ingredientsPerMeal: ingredientsPerMeal ? Number(ingredientsPerMeal) : null,
      inventoryOnly: !!inventoryOnly,
      inventory: inventory.map((i) => ({
        name: i.name,
        cubesLeft: Number(i.cubesLeft || 0),
        status: i.status || 'Frozen',
        madeOn: i.madeOn || i.createdAt || null,
      })),
      startDate: todayISO(),
    };

    const rsp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: JSON.stringify(user) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    let json = {};
    try {
      json = JSON.parse(rsp?.choices?.[0]?.message?.content || '{}');
    } catch {
      json = { plans: [], shopping: [] };
    }

    // Enforce EXACT ingredient count per meal on top of model output
    const exactCount = Number(user.ingredientsPerMeal) || null;
    json = enforceExactIngredients(json, user.inventory, exactCount, Number(user.cubesPerMeal) || null);

    if (user.inventoryOnly) json.shopping = [];

    res.status(200).json(json);
  } catch (err) {
    const msg =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.message ||
      'AI planning failed';
    res.status(500).json({ error: msg });
  }
}
