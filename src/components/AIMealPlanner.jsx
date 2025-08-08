// src/components/AIMealPlanner.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { Wand2, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIMealPlanner({
  onGenerate,          // (payload) => Promise<void>  calls /api/meal-ideas
  defaultAge = 9,
  inventoryOnly = true,
  initialProfile,
  onSaveProfile,       // (profileName, values)
  onDeleteProfile,     // (profileName)
  profiles = []        // [ { name, values } ]
}) {
  const [profileName, setProfileName] = useState('');
  const [days, setDays] = useState(3);
  const [ageMonths, setAgeMonths] = useState(defaultAge);
  const [cubesPerMeal, setCubesPerMeal] = useState(4);
  const [ingredientsPerMeal, setIngredientsPerMeal] = useState(3);
  const [notes, setNotes] = useState('');
  const [invOnly, setInvOnly] = useState(!!inventoryOnly);

  useEffect(() => {
    if (initialProfile?.values) {
      const v = initialProfile.values;
      setProfileName(initialProfile.name || '');
      setDays(v.days ?? 3);
      setAgeMonths(v.ageMonths ?? defaultAge);
      setCubesPerMeal(v.cubesPerMeal ?? 4);
      setIngredientsPerMeal(v.ingredientsPerMeal ?? 3);
      setNotes(v.notes ?? '');
      setInvOnly(!!v.inventoryOnly);
    }
  }, [initialProfile, defaultAge]);

  const generate = async () => {
    try {
      await onGenerate?.({
        days: Number(days),
        ageMonths: Number(ageMonths),
        cubesPerMeal: Number(cubesPerMeal),
        ingredientsPerMeal: Number(ingredientsPerMeal),
        notes,
        inventoryOnly: invOnly,
      });
    } catch (e) {
      toast.error(e?.message || 'Failed to generate.');
    }
  };

  const saveProfile = async () => {
    const name = profileName.trim();
    if (!name) return toast.error('Enter a profile name.');
    await onSaveProfile?.(name, {
      days, ageMonths, cubesPerMeal, ingredientsPerMeal, notes, inventoryOnly: invOnly
    });
    toast.success('Profile saved');
  };
  const deleteProfile = async () => {
    const name = profileName.trim();
    if (!name) return;
    await onDeleteProfile?.(name);
    toast.success('Profile deleted');
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold inline-flex items-center gap-2">
          <Wand2 size={18}/> AI Meal Planner
        </h3>
        <button className="pill" onClick={generate}><Wand2 size={16}/> Generate</button>
      </div>

      {/* Profile row */}
      <div className="flex items-center gap-2">
        <input
          className="input"
          placeholder="Profile name (optional)"
          value={profileName}
          onChange={(e)=>setProfileName(e.target.value)}
        />
        <button className="pill text-xs px-3 py-1.5" onClick={saveProfile}><Save size={14}/> Save profile</button>
        <button className="pill text-xs px-3 py-1.5" onClick={deleteProfile}><Trash2 size={14}/> Delete</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-muted">Days</label>
          <input className="input mt-1" inputMode="numeric" value={days} onChange={(e)=>setDays(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-muted">Age (months)</label>
          <input className="input mt-1" inputMode="numeric" value={ageMonths} onChange={(e)=>setAgeMonths(e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-sm text-muted">Cubes per meal</label>
          <input className="input mt-1" inputMode="numeric" value={cubesPerMeal} onChange={(e)=>setCubesPerMeal(e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-sm text-muted">Ingredients per meal (exact)</label>
          <input className="input mt-1" inputMode="numeric" value={ingredientsPerMeal} onChange={(e)=>setIngredientsPerMeal(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-sm text-muted">Notes / preferences</label>
          <input className="input mt-1" placeholder="e.g., prefers savory, avoid dairy at dinner" value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="accent-violet-600" checked={invOnly} onChange={(e)=>setInvOnly(e.target.checked)} />
          Use inventory only
        </label>
        <p className="text-xs text-muted">Generate ideas from inventory, tweak cubes and ingredients, then add to Planner.</p>
      </div>
    </div>
  );
}
