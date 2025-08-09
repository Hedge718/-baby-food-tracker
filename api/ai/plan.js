// api/ai/plan.js
import OpenAI from 'openai';

/**
 * Vercel Serverless Function
 * POST /api/ai/plan
 * Body: { days, perMealCubes, maxIngredients, onlyInventory, inventory:[{id,name,cubesLeft}] }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse JSON body
  let body = {};
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const raw = Buffer.concat(buffers).toString('utf8');
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
- Use at most ${maxIngredients} ingredients per meal.
- Target about ${perMealCubes} cubes per meal (total).
- If onlyInventory=true, use ONLY names present in "inventory" (case-insensitive). Do not invent items.
- Keep sodium low; no added sugar. No honey if under 12 months.
- Mild spices only: cinnamon, cumin, turmeric, garlic powder, paprika.
Return exactly one JSON object matching the schema.
`.trim();

  const user = {
    days,
    perMealCubes,
    maxIngredients,
    onlyInventory,
    inventory, // [{ id, name, cubesLeft }]
    today: new Date().toISOString().slice(0, 10),
  };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ✅ Use Chat Completions with JSON mode for guaranteed JSON text
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

    // Optional guard: enforce inventory-only items
    if (onlyInventory) {
      const invSet = new Set(inventory.map(i => String(i.name || '').toLowerCase()));
      for (const d of plan.days || []) {
        for (const meal of d.meals || []) {
          meal.items = (meal.items || []).filter(it =>
            invSet.has(String(it.name || '').toLowerCase())
          );
        }
      }
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
