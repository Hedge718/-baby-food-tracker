// src/components/AIShoppingRecs.jsx
import React, { useEffect, useState } from "react";
import { ShoppingCart, Wand2, Loader2, CheckSquare, Square, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { useData } from "../context/DataContext";
import { generateShoppingIdeas } from "../services/ai";
import { addItemToShoppingList } from "../firebase";

const SETTINGS_KEY = "aiShoppingSettings";
const commonAllergens = [
  "Dairy",
  "Egg",
  "Peanut",
  "Tree nut",
  "Wheat",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
];

export default function AIShoppingRecs() {
  const { inventory } = useData();

  const [days, setDays] = useState(5);
  const [ageMonths, setAgeMonths] = useState(9);
  const [avoid, setAvoid] = useState([]);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState([]); // [{name, reason, category?, priority?}]
  const [selected, setSelected] = useState({}); // name -> boolean

  // load saved
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.days) setDays(s.days);
        if (s.ageMonths) setAgeMonths(s.ageMonths);
        if (Array.isArray(s.avoid)) setAvoid(s.avoid);
        if (typeof s.notes === "string") setNotes(s.notes);
      }
    } catch {}
  }, []);
  // save
  useEffect(() => {
    const s = { days, ageMonths, avoid, notes };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }, [days, ageMonths, avoid, notes]);

  const toggleAvoid = (a) =>
    setAvoid((arr) =>
      arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a]
    );

  const run = async () => {
    try {
      setLoading(true);
      setRecs([]);
      setSelected({});
      const r = await generateShoppingIdeas({
        inventory,
        days,
        ageMonths,
        avoidAllergens: avoid,
        notes,
      });
      const list = (r.shopping || []).map((x) => ({
        name: x.name,
        reason: x.reason || "",
        category: x.category || "",
        priority: typeof x.priority === "number" ? x.priority : 3,
      }));
      setRecs(list);
      const sel = {};
      list.forEach((x) => (sel[x.name] = true)); // preselect all
      setSelected(sel);
    } catch (e) {
      toast.error(e.message || "Could not get shopping suggestions");
    } finally {
      setLoading(false);
    }
  };

  const selectAll = (on) => {
    const sel = {};
    recs.forEach((x) => (sel[x.name] = !!on));
    setSelected(sel);
  };

  const addSelected = async () => {
    const names = recs.filter((x) => selected[x.name]).map((x) => x.name);
    if (!names.length) {
      toast("Nothing selected");
      return;
    }
    await Promise.all(names.map((n) => addItemToShoppingList(n)));
    toast.success(`Added ${names.length} item${names.length !== 1 ? "s" : ""} to Shopping List`);
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart size={18} /> AI Shopping Recommendations
        </h3>
        <button
          onClick={run}
          className="btn-primary h-10 px-4"
          disabled={loading}
          aria-label="Generate shopping list"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} Generate
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <label className="space-y-1 col-span-1">
          <span className="text-sm text-muted">Days to cover</span>
          <input
            className="input"
            type="number"
            min="1"
            max="14"
            value={days}
            onChange={(e) => setDays(Number(e.target.value || 1))}
          />
        </label>
        <label className="space-y-1 col-span-1">
          <span className="text-sm text-muted">Age (months)</span>
          <input
            className="input"
            type="number"
            min="6"
            max="24"
            value={ageMonths}
            onChange={(e) => setAgeMonths(Number(e.target.value || 6))}
          />
        </label>
        <label className="col-span-2 sm:col-span-4 space-y-1">
          <span className="text-sm text-muted">Notes / preferences (optional)</span>
          <input
            className="input"
            placeholder="e.g., more iron options, dairy-free"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {commonAllergens.map((a) => (
          <button
            key={a}
            onClick={() => toggleAvoid(a)}
            className={`pill ${avoid.includes(a) ? "is-active" : ""}`}
          >
            {a}
          </button>
        ))}
      </div>

      {recs.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => selectAll(true)} className="pill">
              <CheckSquare size={16} /> Select all
            </button>
            <button onClick={() => selectAll(false)} className="pill">
              <Square size={16} /> Clear all
            </button>
            <button onClick={addSelected} className="pill">
              <Plus size={16} /> Add selected to Shopping List
            </button>
          </div>

          <ul className="divide-y divide-[var(--border-light)] dark:divide-[var(--border-dark)]">
            {recs.map((x) => (
              <li key={x.name} className="py-2 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={!!selected[x.name]}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [x.name]: e.target.checked }))
                  }
                />
                <div className="flex-1">
                  <div className="font-semibold">{x.name}</div>
                  {x.reason && <div className="text-sm text-muted">{x.reason}</div>}
                  {x.category && (
                    <div className="text-xs text-muted mt-0.5">Category: {x.category}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!recs.length && !loading && (
        <p className="text-sm text-muted">Get suggestions to diversify nutrition and fill gaps.</p>
      )}
    </div>
  );
}
