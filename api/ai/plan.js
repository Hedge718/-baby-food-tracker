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

  // Parse JSON body (Node, not Next)
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
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
    const openai = new OpenAI({ apiKey });

    // ✅ Responses API: request a JSON object
    const rsp = await openai.responses.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      text: { format: 'json_object' }, // <-- correct enum
      input: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) },
      ],
    });

    const text = getResponseText(rsp);
    const json = safeParseJson(text);

    if (!json || !Array.isArray(json.days)) {
      return res.status(502).json({ error: 'Bad AI response shape', raw: text });
    }

    return res.status(200).json(json);
  } catch (err) {
    console.error('AI plan error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}

/** Grab text from Responses API regardless of SDK shape */
function getResponseText(rsp) {
  if (rsp?.output_text) return rsp.output_text;

  // Some SDK versions expose `output` blocks with `content[]`
  if (Array.isArray(rsp?.output)) {
    for (const block of rsp.output) {
      if (Array.isArray(block?.content)) {
        for (const c of block.content) {
          if (typeof c?.text === 'string') return c.text;
          if (c?.type === 'output_text' && typeof c?.text === 'string') return c.text;
        }
      }
    }
  }

  // Older shapes / fallbacks
  if (rsp?.content?.[0]?.text) return rsp.content[0].text;
  if (rsp?.choices?.[0]?.message?.content) return rsp.choices[0].message.content;

  return '';
}

/** Parse JSON, stripping fences/junk if necessary (belt & suspenders) */
function safeParseJson(text) {
  if (!text) throw new Error('Empty model response');

  try {
    return JSON.parse(text);
  } catch {}

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    try { return JSON.parse(fence[1].trim()); } catch {}
  }

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }

  throw new Error('Model did not return JSON');
}
