// server/index.js
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

const todayISO = () => new Date().toISOString().slice(0, 10);

function sendError(res, err, fallback = "Server error") {
  let status = err?.status ?? err?.response?.status ?? 500;
  let message =
    err?.error?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    fallback;
  console.error("[/api error]", { status, message, raw: err?.response?.data || err });
  res.status(status).json({ error: message });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY, model: "gpt-4o-mini" });
});

// client log sink (optional)
app.post("/api/log", (req, res) => {
  const { level = "info", message = "", context = {} } = req.body || {};
  const stamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : "log"](`[client:${level}] ${stamp} — ${message}`, context);
  res.json({ ok: true });
});

/**
 * Inventory-only meal ideas with spices.
 */
app.post("/api/meal-ideas", async (req, res) => {
  try {
    const {
      inventory = [],
      days = 3,
      ageMonths = 9,
      avoidAllergens = [],
      notes = "",
      cubesPerMeal = null,
      ingredientsPerMeal = null,
      inventoryOnly = true,
    } = req.body || {};

    const system = `
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
        status: i.status || "Frozen",
        madeOn: i.madeOn || i.createdAt || null,
      })),
      startDate: todayISO(),
    };

    const rsp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const json = JSON.parse(rsp?.choices?.[0]?.message?.content || "{}");
    if (user.inventoryOnly) json.shopping = [];
    res.json(json);
  } catch (err) {
    sendError(res, err, "AI planning failed");
  }
});

/**
 * Shopping ideas
 */
app.post("/api/shopping-ideas", async (req, res) => {
  try {
    const { inventory = [], ageMonths = 9, avoidAllergens = [], notes = "", days = 5 } = req.body || {};

    const system = `
Propose a concise shopping list to diversify nutrition for the next few days.

Rules:
- Avoid avoidAllergens.
- Low sodium; no added sugar; no honey <12 months.
- Focus on iron sources, vitamin C, healthy fats, colorful variety.
- 5–12 high-impact items max.

Return strict JSON:
{ "shopping": [ { "name":"Full-fat yogurt","reason":"protein + calcium","category":"Dairy","priority":1 } ] }
`.trim();

    const user = {
      days,
      ageMonths,
      avoidAllergens,
      notes,
      inventory: inventory.map(i => ({ name: i.name, cubesLeft: Number(i.cubesLeft || 0), status: i.status || "Frozen" })),
    };

    const rsp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const json = JSON.parse(rsp?.choices?.[0]?.message?.content || "{}");
    json.shopping = (json.shopping || []).slice(0, 20);
    res.json(json);
  } catch (err) {
    sendError(res, err, "Shopping suggestions failed");
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
