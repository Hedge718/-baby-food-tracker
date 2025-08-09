// api/ai/plan.js
import OpenAI from 'openai';

/**
 * Vercel Node.js Serverless Function (ESM).
 * POST /api/ai/plan with JSON body:
 * {
 *   days: number,
 *   perMealCubes: number,
 *   maxIngredients: number,
 *   onlyInventory: boolean,
 *   inventory: [{ id, name, cubesLeft }]
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Manual body parse for Vercel Node functions
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' });
  }

  const system = `
You are a baby meal planner. Return STRICT JSON only (no prose).
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
- Target about ${perMealCubes} total cubes per meal.
- If onlyInventory=true, use only item names present in "inventory". Do not invent items.
- Keep sodium low; no added sugar. No honey if age < 12 months.
- Mild spices only (e.g., cinnamon, cumin, turmeric, garlic powder, paprika).
- Return exactly one JSON object matching the schema above.
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
    const openai = new OpenAI({ apiKey });

    const rsp = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) },
      ],
    });

    const text =
      rsp.output_text ??
      rsp.content?.[0]?.text ??
      rsp.choices?.[0]?.message?.content ??
      '';

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}$/);
      if (!m) {
        return res.status(502).json({ error: 'Model did not return JSON', raw: text });
      }
      json = JSON.parse(m[0]);
    }

    if (!json || !Array.isArray(json.days)) {
      return res.status(502).json({ error: 'Bad AI response shape', raw: text });
    }

    return res.status(200).json(json);
  } catch (err) {
    console.error('AI plan error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
