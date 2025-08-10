// src/components/InventoryForm.jsx
import React, { useState } from 'react';
import { useData } from '../context/DataContext';

export default function InventoryForm() {
  const { handleAddFood } = useData();
  const [name, setName] = useState('');
  const [cubesLeft, setCubesLeft] = useState(6);
  const [status, setStatus] = useState('Frozen');
  const [madeOn, setMadeOn] = useState(''); // YYYY-MM-DD

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await handleAddFood({
      name,
      cubesLeft: Number(cubesLeft || 0),
      status,
      madeOn: madeOn || undefined, // pass only if user set it
    });
    setName('');
    setCubesLeft(6);
    setStatus('Frozen');
    setMadeOn('');
  };

  return (
    <section className="card space-y-3">
      <h3 className="text-lg font-bold">Add Food</h3>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input w-full"
          placeholder="Name (e.g., Sweet Potato)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted">Portions</label>
            <input
              className="input w-full"
              type="number"
              min="0"
              inputMode="numeric"
              value={cubesLeft}
              onChange={(e) => setCubesLeft(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted">Status</label>
            <select
              className="input w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Frozen</option>
              <option>Fridge</option>
              <option>Pantry</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted">Made On (optional)</label>
          <input
            className="input w-full"
            type="date"
            value={madeOn}
            onChange={(e) => setMadeOn(e.target.value)}
          />
        </div>

        <button className="btn-primary w-full" type="submit">Add</button>
      </form>
    </section>
  );
}
