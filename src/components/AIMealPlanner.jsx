// src/components/AIMealPlanner.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Wand2, Loader2, CheckSquare, Square, CalendarPlus, Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import { useData } from "../context/DataContext";
import { useAllergyProfiles } from "../context/AllergyContext";
import { generateMealIdeas } from "../services/ai";

const MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const SETTINGS_KEY = "aiPlannerSettings";

function toISO(d) {
  try {
    if (typeof d === "string") return d.slice(0, 10);
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function AIMealPlanner() {
  const { inventory, handleAddPlan } = useData();
  const { profiles, current, selectedId, setSelectedId, addProfile, deleteProfile } = useAllergyProfiles();

  // Settings (remembered)
  const [days, setDays] = useState(3);
  const [ageMonths, setAgeMonths] = useState(9);
  const [avoid, setAvoid] = useState([]);
  const [notes, setNotes] = useState("");
  const [cubesPerMeal, setCubesPerMeal] = useState(3);
  const [ingredientsPerMeal, setIngredientsPerMeal] = useState(2);

  // load saved once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.days) setDays(s.days);
        if (s.ageMonths) setAgeMonths(s.ageMonths);
        if (Array.isArray(s.avoid)) setAvoid(s.avoid);
        if (typeof s.notes === "string") setNotes(s.notes);
        if (s.cubesPerMeal) setCubesPerMeal(s.cubesPerMeal);
        if (s.ingredientsPerMeal) setIngredientsPerMeal(s.ingredientsPerMeal);
      }
    } catch {}
  }, []);
  // persist
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ days, ageMonths, avoid, notes, cubesPerMeal, ingredientsPerMeal }));
  }, [days, ageMonths, avoid, notes, cubesPerMeal, ingredientsPerMeal]);

  // apply current profile
  useEffect(() => {
    if (current) {
      if (typeof current.ageMonths === 'number') setAgeMonths(current.ageMonths);
      if (Array.isArray(current.avoid)) setAvoid(current.avoid);
      if (typeof current.notes === 'string') setNotes(current.notes);
    }
  }, [current]);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  // selection: id -> {selected, date, mealType, uses:[{name,cubes}]}
  const [selection, setSelection] = useState({});

  const run = async () => {
    try {
      setLoading(true);
      setPlan(null);
      setSelection({});
      const data = await generateMealIdeas({
        inventory,
        days,
        ageMonths,
        avoidAllergens: avoid,
        notes,
        cubesPerMeal: Number(cubesPerMeal) || null,
        ingredientsPerMeal: Number(ingredientsPerMeal) || null,
        inventoryOnly: true,
      });
      setPlan(data);

      const defaults = {};
      (data?.plans || []).forEach((d) => {
        const date = toISO(d.date || new Date());
        (d.meals || []).forEach((m, idx) => {
          const id = `${date}#${idx}#${m.title}`;
          defaults[id] = {
            selected: true,
            date,
            mealType: MEAL_TYPES[Math.min(idx, MEAL_TYPES.length - 1)],
            spice: m.spice || '',
            uses: (Array.isArray(m.uses) ? m.uses : []).map(u => ({ name: u.name, cubes: Number(u.cubes || 1) })),
          };
        });
      });
      setSelection(defaults);
    } catch (e) {
      toast.error(e.message || "Could not generate plan");
    } finally {
      setLoading(false);
    }
  };

  const selectAll = (on) => {
    setSelection((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k].selected = !!on;
      return next;
    });
  };

  const flattenMeals = useMemo(() => {
    if (!plan?.plans?.length) return [];
    const items = [];
    for (const d of plan.plans) {
      const date = toISO(d.date || new Date());
      (d.meals || []).forEach((m, idx) => {
        items.push({
          id: `${date}#${idx}#${m.title}`,
          date,
          mealIndex: idx,
          mealTypeDefault: MEAL_TYPES[Math.min(idx, MEAL_TYPES.length - 1)],
          title: m.title,
          uses: Array.isArray(m.uses) ? m.uses : [],
          recipe: m.recipe || "",
          spice: m.spice || "",
          notes: m.notes || "",
        });
      });
    }
    return items;
  }, [plan]);

  const invMap = useMemo(
    () => new Map((inventory || []).map(i => [String(i.nameLower || i.name).trim().toLowerCase(), i])),
    [inventory]
  );

  const acceptSelected = async () => {
    const picks = flattenMeals.filter(m => selection[m.id]?.selected);
    if (!picks.length) { toast("Nothing selected"); return; }

    let added = 0, skipped = 0;
    const ops = [];

    for (const m of picks) {
      const sel = selection[m.id] || {};
      const date = sel.date || m.date;
      const mealType = (sel.mealType || m.mealTypeDefault || "breakfast").toLowerCase().trim();
      const usesEdited = Array.isArray(sel.uses) && sel.uses.length ? sel.uses : m.uses;

      let matchedAny = false;
      for (const u of usesEdited) {
        const key = String(u.name || "").trim().toLowerCase();
        const item = invMap.get(key);
        if (!item) continue;
        const amount = Math.max(1, Number(u.cubes || 1));
        ops.push(Promise.resolve(handleAddPlan({ date, mealType, itemId: item.id, isRecipe: false, amount })));
        matchedAny = true;
        added++;
      }
      if (!matchedAny) skipped++;
    }

    try {
      await Promise.all(ops);
      toast.success(`Added ${added} item${added !== 1 ? "s" : ""} to Planner${skipped ? ` • Skipped ${skipped}` : ""}`);
    } catch (e) {
      toast.error("Failed to add some items to Planner");
    }
  };

  // profile helpers
  const saveAsProfile = () => {
    const name = prompt('Profile name (e.g., "No dairy", "Babysitter"):');
    if (!name) return;
    addProfile(name, { ageMonths, avoid, notes });
    toast.success('Profile saved');
  };
  const deleteSelectedProfile = () => {
    if (!selectedId) return;
    if (confirm('Delete this profile?')) {
      deleteProfile(selectedId);
      toast.success('Profile deleted');
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-bold flex items-center gap-2"><Wand2 size={18}/> AI Meal Planner</h3>
        <button onClick={run} className="btn-primary h-10 px-4" disabled={loading} aria-label="Generate AI plan">
          {loading ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>} Generate
        </button>
      </div>

      {/* Profiles */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input !px-3 !py-2"
          value={selectedId || ''}
          onChange={(e)=>setSelectedId(e.target.value || null)}
          aria-label="Select allergy profile"
        >
          <option value="">No profile</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="pill" onClick={saveAsProfile}><UserPlus size={16}/> Save current as profile</button>
        {selectedId && <button className="pill" onClick={deleteSelectedProfile}><Trash2 size={16}/> Delete profile</button>}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <label className="space-y-1 col-span-1">
          <span className="text-sm text-muted">Days</span>
          <input className="input" type="number" min="1" max="7" value={days} onChange={(e)=>setDays(Number(e.target.value||1))}/>
        </label>
        <label className="space-y-1 col-span-1">
          <span className="text-sm text-muted">Age (months)</span>
          <input className="input" type="number" min="6" max="24" value={ageMonths} onChange={(e)=>setAgeMonths(Number(e.target.value||6))}/>
        </label>
        <label className="space-y-1 col-span-2">
          <span className="text-sm text-muted">Cubes per meal</span>
          <input className="input" type="number" min="1" max="8" value={cubesPerMeal} onChange={(e)=>setCubesPerMeal(e.target.value)}/>
        </label>
        <label className="space-y-1 col-span-2">
          <span className="text-sm text-muted">Ingredients per meal (exact)</span>
          <input className="input" type="number" min="1" max="5" value={ingredientsPerMeal} onChange={(e)=>setIngredientsPerMeal(e.target.value)}/>
        </label>
        <label className="col-span-2 sm:col-span-6 space-y-1">
          <span className="text-sm text-muted">Notes / preferences</span>
          <input className="input" placeholder="e.g., prefers savory, avoid dairy at dinner" value={notes} onChange={(e)=>setNotes(e.target.value)}/>
        </label>
      </div>

      {/* Plan preview */}
      {plan && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>selectAll(true)} className="pill"><CheckSquare size={16}/> Select all</button>
            <button onClick={()=>selectAll(false)} className="pill"><Square size={16}/> Clear all</button>
            <button onClick={acceptSelected} className="pill"><CalendarPlus size={16}/> Add selected to Planner</button>
          </div>

          <ul className="space-y-3">
            {flattenMeals.map(m => {
              const sel = selection[m.id] || { selected:false, date:m.date, mealType:m.mealTypeDefault, uses:m.uses, spice:m.spice };
              const updateSel = (patch) => setSelection(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || sel), ...patch } }));

              return (
                <li key={m.id} className="card-soft p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" checked={!!sel.selected} onChange={(e)=>updateSel({ selected: e.target.checked })}/>
                      <span className="font-medium">{m.title}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="date" className="input !px-2 !py-1" value={sel.date} onChange={(e)=>updateSel({ selected:true, date:e.target.value })}/>
                      <select className="input !px-2 !py-1" value={sel.mealType} onChange={(e)=>updateSel({ selected:true, mealType:e.target.value })}>
                        {MEAL_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {sel.uses?.length ? (
                      <div className="text-sm">
                        <div className="text-muted mb-1">Ingredients (edit cubes):</div>
                        <div className="flex flex-wrap gap-2">
                          {sel.uses.map((u,i)=>(
                            <label key={i} className="inline-flex items-center gap-2 border rounded-xl px-2 py-1">
                              <span className="font-medium">{u.name}</span>
                              <input type="number" min="1" max="8" className="input !px-2 !py-1 w-16"
                                value={u.cubes}
                                onChange={(e)=>{
                                  const v = Math.max(1, Number(e.target.value||1));
                                  const next = sel.uses.map((x,idx)=> idx===i ? { ...x, cubes:v } : x);
                                  updateSel({ selected:true, uses: next });
                                }}/>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : <div className="text-sm text-muted">No ingredients (skipped non-inventory meals).</div>}

                    {m.spice && <div className="text-sm mt-1">Suggested spice: <b>{sel.spice || m.spice}</b></div>}
                    {m.recipe && <div className="text-sm mt-1">{m.recipe}</div>}
                    {m.notes && <div className="text-xs text-muted">{m.notes}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!plan && !loading && <p className="text-sm text-muted">Generate ideas from inventory, tweak cubes per meal, save/load allergy profiles, then add to Planner.</p>}
    </div>
  );
}
