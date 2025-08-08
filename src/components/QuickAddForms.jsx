// src/components/QuickAddForms.jsx
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';

/**
 * Props:
 * - tab: "Feeding" | "Inventory" | "Shopping"
 * - onDone: () => void  (called after a successful action)
 */
export default function QuickAddForms({ tab = 'Feeding', onDone }) {
  const {
    inventory = [],
    handleLogUsage,            // (item, amount, isTrash)
    handleAddFood,             // ({ name, cubesLeft, status, madeOn })
    handleAddShoppingItem,     // (name)  -- prefer this if present
    handleAddToShoppingList,   // (name)  -- legacy fallback
  } = useData();

  // ------- Feeding -------
  const [feedItemId, setFeedItemId] = useState('');
  const [feedQty, setFeedQty] = useState(1);
  const [feedWasted, setFeedWasted] = useState(false);

  const inStock = useMemo(
    () => inventory.filter(i => Number(i.cubesLeft || 0) > 0)
                   .sort((a,b) => (a.name || '').localeCompare(b.name || '')),
    [inventory]
  );

  const selectedFeedItem = useMemo(
    () => inStock.find(i => i.id === feedItemId) || null,
    [inStock, feedItemId]
  );

  async function submitFeeding(e) {
    e.preventDefault();
    if (!selectedFeedItem) return toast.error('Pick an item to log.');
    const qty = Math.max(1, Number(feedQty) || 1);
    if (qty > Number(selectedFeedItem.cubesLeft || 0)) {
      return toast.error(`Only ${selectedFeedItem.cubesLeft} left.`);
    }
    try {
      await handleLogUsage?.(selectedFeedItem, qty, !!feedWasted);
      toast.success(feedWasted ? 'Logged as wasted.' : 'Feeding logged!');
      setFeedQty(1);
      setFeedItemId('');
      setFeedWasted(false);
      onDone?.();
    } catch (err) {
      console.error(err);
      toast.error('Could not log feeding.');
    }
  }

  // ------- Inventory -------
  const [invName, setInvName] = useState('');
  const [invQty, setInvQty] = useState(6);
  const [invStatus, setInvStatus] = useState('Frozen'); // Frozen | Fridge | Pantry
  const todayYMD = new Date().toISOString().slice(0, 10);
  const [invMadeOn, setInvMadeOn] = useState(todayYMD);

  async function submitInventory(e) {
    e.preventDefault();
    const name = (invName || '').trim();
    const qty = Math.max(0, Number(invQty) || 0);
    if (!name) return toast.error('Enter a name.');
    try {
      await handleAddFood?.({
        name,
        cubesLeft: qty,
        status: invStatus,
        madeOn: invMadeOn, // yyyy-mm-dd
      });
      toast.success('Inventory updated.');
      setInvName('');
      setInvQty(6);
      setInvStatus('Frozen');
      setInvMadeOn(todayYMD);
      onDone?.();
    } catch (err) {
      console.error(err);
      toast.error('Could not add inventory.');
    }
  }

  // ------- Shopping -------
  const [shopName, setShopName] = useState('');

  async function submitShopping(e) {
    e.preventDefault();
    const name = (shopName || '').trim();
    if (!name) return toast.error('Enter an item name.');
    try {
      const add = handleAddShoppingItem || handleAddToShoppingList;
      if (!add) throw new Error('Shopping add handler not available');
      await add(name);
      toast.success('Added to shopping list.');
      setShopName('');
      onDone?.();
    } catch (err) {
      console.error(err);
      toast.error('Could not add to shopping list.');
    }
  }

  // ------- Render -------
  if (tab === 'Inventory') {
    return (
      <form onSubmit={submitInventory} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Name</label>
          <input
            className="input"
            placeholder="e.g., Peas"
            value={invName}
            onChange={(e) => setInvName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Portions</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              step="1"
              value={invQty}
              onChange={(e) => setInvQty(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Status</label>
            <select
              className="input"
              value={invStatus}
              onChange={(e) => setInvStatus(e.target.value)}
            >
              <option>Frozen</option>
              <option>Fridge</option>
              <option>Pantry</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Made on</label>
          <input
            className="input"
            type="date"
            value={invMadeOn}
            onChange={(e) => setInvMadeOn(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-outline" onClick={() => onDone?.()}>Cancel</button>
          <button type="submit" className="btn-primary">Add</button>
        </div>
      </form>
    );
  }

  if (tab === 'Shopping') {
    return (
      <form onSubmit={submitShopping} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Item name</label>
          <input
            className="input"
            placeholder="e.g., Sweet potato"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-outline" onClick={() => onDone?.()}>Cancel</button>
          <button type="submit" className="btn-primary">Add</button>
        </div>
      </form>
    );
  }

  // Feeding (default)
  return (
    <form onSubmit={submitFeeding} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Item</label>
        <select
          className="input"
          value={feedItemId}
          onChange={(e) => setFeedItemId(e.target.value)}
          aria-label="Select item to feed"
          autoFocus
        >
          <option value="">Select…</option>
          {inStock.map(i => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.cubesLeft})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1">Portions</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="1"
            step="1"
            value={feedQty}
            onChange={(e) => setFeedQty(e.target.value)}
            aria-label="Portions to log"
          />
        </div>

        <label className="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={feedWasted}
            onChange={(e) => setFeedWasted(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">Mark as wasted</span>
        </label>
      </div>

      <div className="flex gap-2">
        {[1,2,3].map(n => (
          <button
            key={n}
            type="button"
            className="pill"
            onClick={() => setFeedQty(n)}
            aria-label={`Set portions to ${n}`}
          >
            {n}
          </button>
        ))}
        {selectedFeedItem && (
          <button
            type="button"
            className="pill"
            onClick={() => setFeedQty(Number(selectedFeedItem.cubesLeft || 1))}
          >
            All ({selectedFeedItem.cubesLeft})
          </button>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn-outline" onClick={() => onDone?.()}>Cancel</button>
        <button type="submit" className="btn-primary">Log</button>
      </div>
    </form>
  );
}
