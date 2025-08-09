// api/ai/plan.js
import OpenAI from 'openai';

/**
 * POST /api/ai/plan
 * Body: {
 *   days: number,
 *   perMealCubes: number,
 *   maxIngredients: number,   // EXACTLY this many per meal
 *   onlyInventory: boolean,
 *   inventory: [{ id, name, cubesLeft }]
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse JSON
  let body = {};
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const {
    days = 3,
    perMealCubes = 2,
    maxIngredients = 3,
    onlyInventory = true,
    inventory = [],
  } = body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' });
  }

  const invNames = inventory.map(i => i.name).join(', ');
  const system = `
You are a baby meal planner. Output STRICT JSON only (no prose, no code fences).
Schema:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "mealType": "breakfast|lunch|dinner",
          "items": [ { "name": "string", "cubes": number } ],
          "spices": [ "string" ]
        }
      ]
    }
  ]
}
Rules:
- Use EXACTLY ${maxIngredients} ingredients per meal (no more, no less).
- Target about ${perMealCubes} cubes per meal (total across all ingredients).
- ${onlyInventory ? `Use ONLY these inventory items (case-insensitive): ${invNames}. Do not invent items.` : 'Prefer inventory items first.'}
- Keep sodium low; no added sugar. No honey if under 12 months.
- Mild spices only: cinnamon, cumin, turmeric, garlic powder, paprika.
Return exactly one JSON object matching the schema.
`.trim();

  const user = {
    days,
    perMealCubes,
    maxIngredients,
    onlyInventory,
    inventory,
    today: new Date().toISOString().slice(0, 10),
  };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use Chat Completions with JSON mode (stable)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) },
      ],
    });

    const text = completion?.choices?.[0]?.message?.content || '';
    const plan = safeParseJson(text);

    if (!plan || !Array.isArray(plan.days)) {
      return res.status(502).json({ error: 'Bad AI response shape', raw: text });
    }

    // Post-enforce EXACT maxIngredients and only-inventory (belt & suspenders)
    const invMap = new Map(
      (inventory || []).map(it => [String(it.name || '').toLowerCase(), it])
    );

    for (const d of plan.days || []) {
      d.meals = (d.meals || []).map(meal => {
        // filter to inventory if required
        let items = (meal.items || []).filter(it => {
          if (!onlyInventory) return true;
          return invMap.has(String(it.name || '').toLowerCase());
        });

        // dedupe by name
        const seen = new Set();
        items = items.filter(it => {
          const k = String(it.name || '').toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        // trim or pad to EXACT maxIngredients
        if (items.length > maxIngredients) {
          items = items.slice(0, maxIngredients);
        } else if (items.length < maxIngredients) {
          // pad with available inventory not already in the list
          const need = maxIngredients - items.length;
          const picks = [];
          for (const [k, inv] of invMap.entries()) {
            if (seen.has(k)) continue;
            if ((inv.cubesLeft ?? 0) <= 0) continue;
            picks.push({ name: inv.name, cubes: 1 });
            seen.add(k);
            if (picks.length >= need) break;
          }
          items = items.concat(picks);
        }

        // If still not exact, drop the meal
        if (items.length !== maxIngredients) {
          return null;
        }

        // Normalize cubes: ensure sum ~ perMealCubes (optional; simple cap)
        const sum = items.reduce((s, it) => s + (Number(it.cubes) || 1), 0);
        if (sum > 0 && perMealCubes > 0) {
          // Scale down if way over (keep integers >=1)
          let over = sum - perMealCubes;
          if (over > 0) {
            for (let i = 0; i < items.length && over > 0; i++) {
              const old = Math.max(1, Math.round(Number(items[i].cubes) || 1));
              const dec = Math.min(over, Math.max(0, old - 1));
              items[i].cubes = old - dec;
              over -= dec;
            }
          }
        }
        meal.items = items;
        return meal;
      }).filter(Boolean);
    }

    return res.status(200).json(plan);
  } catch (err) {
    console.error('AI plan error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}

function safeParseJson(text) {
  if (!text) throw new Error('Empty model response');
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const first = text.indexOf('{'); const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) { try { return JSON.parse(text.slice(first, last + 1)); } catch {} }
  throw new Error('Model did not return JSON');
}
