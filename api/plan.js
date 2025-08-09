// api/ai/plan.js
import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse JSON body (Vercel Node function, not Next.js → manual parse)
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    body = raw ? JSON.parse(raw) : {};
  } catch (e) {
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

  // Build a constrained, JSON-only prompt
  const sys = `
You are a baby meal planner. Return STRICT JSON only, no prose.
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
- Target ~${perMealCubes} total cubes per meal.
- Use *only* the provided inventory if onlyInventory=true. If an item is not in inventory, do not use it.
- Keep sodium low, no added sugar; mild spices only (e.g., cinnamon, cumin, turmeric, garlic powder, paprika).
- No honey if under 12 months.
- Return exactly the JSON object described above.
  `;

  const user = {
    days,
    perMealCubes,
    maxIngredients,
    onlyInventory,
    inventory, // [{id,name,cubesLeft}]
    today: new Date().toISOString().slice(0, 10),
  };

  try {
    const openai = new OpenAI({ apiKey });

    const rsp = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: sys },
        { role: 'user', content: JSON.stringify(user) },
      ],
    });

    // Extract text safely across SDK versions
    const text =
      rsp.output_text ??
      rsp.content?.[0]?.text ??
      rsp.choices?.[0]?.message?.content ??
      '';

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // Try to snip a JSON block if model wrapped it
      const m = text.match(/\{[\s\S]*\}$/);
      if (!m) throw new Error('Model did not return JSON');
      json = JSON.parse(m[0]);
    }

    // Basic shape validation
    if (!json || !Array.isArray(json.days)) {
      return res.status(502).json({ error: 'Bad AI response shape', raw: text });
    }

    return res.status(200).json(json);
  } catch (err) {
    console.error('AI plan error:', err);
    const msg = err?.message || 'Server error';
    return res.status(500).json({ error: msg });
  }
}
