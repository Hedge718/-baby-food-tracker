// api/shopping-ideas.js
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function systemPrompt() {
  return `
Propose a concise shopping list to diversify nutrition for the next few days.

Rules:
- Avoid avoidAllergens.
- Low sodium; no added sugar; no honey <12 months.
- Focus on iron sources, vitamin C, healthy fats, colorful variety.
- 5–12 high-impact items max.

Return strict JSON:
{ "shopping": [ { "name":"Full-fat yogurt","reason":"protein + calcium","category":"Dairy","priority":1 } ] }
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
      days = 5,
      ageMonths = 9,
      avoidAllergens = [],
      notes = '',
    } = body;

    const user = {
      days,
      ageMonths,
      avoidAllergens,
      notes,
      inventory: inventory.map(i => ({
        name: i.name,
        cubesLeft: Number(i.cubesLeft || 0),
        status: i.status || 'Frozen',
      })),
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
    json.shopping = (json.shopping || []).slice(0, 20);
    res.status(200).json(json);
  } catch (err) {
    const msg =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.message || 'Shopping suggestions failed';
    res.status(500).json({ error: msg });
  }
}
