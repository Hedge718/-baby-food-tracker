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
- If "ingredientsPerMeal" is provided, limit to that many items or fewer.
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
      inventory: inventory.map(i => ({
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

    const json = JSON.parse(rsp?.choices?.[0]?.message?.content || '{}');
    if (user.inventoryOnly) json.shopping = [];
    res.status(200).json(json);
  } catch (err) {
    const msg =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.message || 'AI planning failed';
    res.status(500).json({ error: msg });
  }
}
