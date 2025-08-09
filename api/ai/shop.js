// api/ai/shop.js
import OpenAI from 'openai';

/**
 * POST /api/ai/shop
 * Body: {
 *   daysToCover: number,         // how many days' worth of meals to cover
 *   perDayCubes: number,         // cubes needed per day (e.g., meals/day * cubes/meal)
 *   inventory: [{ id, name, cubesLeft }],
 *   shoppingList: [{ id, name }],
 *   avoidAllergens?: string[]    // optional list of allergens to avoid
 * }
 * Returns:
 * { items: [{ name, quantity, reason }] }
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
    daysToCover = 3,
    perDayCubes = 6, // e.g., 3 meals * 2 cubes each
    inventory = [],
    shoppingList = [],
    avoidAllergens = [],
  } = body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' });
  }

  // Compute a simple deficit so DaysToCover actually has teeth
  const totalInv = (inventory || []).reduce((s, i) => s + (Number(i.cubesLeft) || 0), 0);
  const target = Math.max(0, Math.round(Number(daysToCover) * Number(perDayCubes)));
  const deficit = Math.max(0, target - totalInv);

  // If no deficit, suggest nothing (early return)
  if (deficit <= 0) {
    return res.status(200).json({ items: [] });
  }

  const invNames = inventory.map(i => `${i.name}(${i.cubesLeft})`).join(', ');
  const already = new Set((shoppingList || []).map(x => String(x.name || '').toLowerCase()));

  const system = `
You are a baby shopping assistant. Return STRICT JSON only (no prose, no code fences).
Schema:
{
  "items": [
    { "name": "string", "quantity": number, "reason": "string" }
  ]
}
Rules:
- Recommend items to cover a deficit of about ${deficit} cubes over ${daysToCover} days (≈ ${perDayCubes}/day).
- DO NOT include any item already present on the current shopping list (case-insensitive).
- Prefer variety across vegetables, fruits, grains, and proteins (baby-appropriate).
- Keep sodium low; no added sugar. No honey if under 12 months.
- Avoid allergens in this list: ${avoidAllergens.join(', ') || 'none'}.
- Reason should be short (why it's a good pick).
- Return only the JSON object described above.
`.trim();

  const user = {
    daysToCover,
    perDayCubes,
    deficit,
    inventory,     // for context
    shoppingList,  // to exclude
  };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    let out = safeParseJson(text);

    // Post-filter: remove anything already on the shopping list; dedupe by name
    const seen = new Set();
    out.items = (out.items || [])
      .filter(it => {
        const key = String(it?.name || '').toLowerCase();
        if (!key) return false;
        if (already.has(key)) return false;   // filter out existing items
        if (seen.has(key)) return false;      // dedupe
        seen.add(key);
        return Number(it.quantity) > 0;
      })
      .map(it => ({
        name: it.name,
        quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
        reason: it.reason || '',
      }));

    return res.status(200).json(out);
  } catch (err) {
    console.error('AI shop error:', err);
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
