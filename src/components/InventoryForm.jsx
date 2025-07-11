import React, { useState } from 'react';

export default function InventoryForm({ onAddItem, inventory, setInventory }) {
  const [name, setName] = useState('');
  const [totalCubes, setTotalCubes] = useState(12);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || totalCubes <= 0) {
      alert('Please provide a valid name and number of cubes.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Call the function passed from the hook to add the item
      const newItem = await onAddItem({
        name,
        totalCubes: Number(totalCubes),
        cubesLeft: Number(totalCubes), // Start with a full batch
      });
      // Optimistically update UI
      setInventory(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setTotalCubes(12);
    } catch (error) {
      console.error("Failed to add inventory item:", error);
      alert("Error: Could not add item to inventory.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Add New Food</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="foodName" className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Food Name
          </label>
          <input
            id="foodName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Sweet Potato"
            className="input-field mt-1"
            required
          />
        </div>
        <div>
          <label htmlFor="totalCubes" className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Number of Cubes
          </label>
          <input
            id="totalCubes"
            type="number"
            value={totalCubes}
            onChange={(e) => setTotalCubes(e.target.value)}
            className="input-field mt-1"
            min="1"
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add to Inventory'}
        </button>
      </form>
    </div>
  );
}