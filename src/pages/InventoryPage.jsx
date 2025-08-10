// src/pages/InventoryPage.jsx
import React, { useMemo, useState } from 'react';
import { Package, CheckCircle2, Layers, EyeOff, Download } from 'lucide-react';
import { useData } from '../context/DataContext';
import FoodInventoryItem from '../components/FoodInventoryItem';

// Simple CSV export without extra libs
function downloadCsv(filename, rows) {
  const header = Object.keys(rows[0] || { name: '', cubesLeft: '', status: '', madeOn: '' }).join(',');
  const body = rows
    .map(r =>
      [r.name, r.cubesLeft, r.status, r.madeOn ? new Date(r.madeOn).toISOString().slice(0, 10) : '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
  const csv = [header, body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryPage() {
  const {
    // Use fullInventory so we can see zero-stock + hidden items when requested
    fullInventory,
    loading,
    // item actions
    handleLogUsage,
    handleUpdateItemStatus,
    handleSetPortions,
    handleSetAging,
    handleToggleHidden, // <-- pass this to rows so you can hide/unhide
    handleRestock,      // optional; if undefined, restock button is hidden
  } = useData();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'in' | 'out' | 'low'
  const [showHidden, setShowHidden] = useState(false);
  const [sort, setSort] = useState('oldest'); // oldest | newest | name

  // Stats should be based on fullInventory too
  const stats = useMemo(() => {
    const items = fullInventory || [];
    const inStock = items.filter(i => (i.cubesLeft ?? 0) > 0).length;
    const totalCubes = items.reduce((s, i) => s + (Number(i.cubesLeft) || 0), 0);
    const out = items.length - inStock;
    return { items: items.length, inStock, out, totalCubes };
  }, [fullInventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = (fullInventory || []).filter(i => (showHidden ? true : !i.hidden));

    if (tab === 'in') list = list.filter(i => (i.cubesLeft ?? 0) > 0);
    if (tab === 'out') list = list.filter(i => (i.cubesLeft ?? 0) <= 0);
    if (tab === 'low') list = list.filter(i => (i.cubesLeft ?? 0) > 0 && (i.cubesLeft ?? 0) <= 3);

    if (q) list = list.filter(i => i.name.toLowerCase().includes(q));

    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      const ad = new Date(a.madeOn || a.createdAt || 0).getTime();
      const bd = new Date(b.madeOn || b.createdAt || 0).getTime();
      return sort === 'oldest' ? ad - bd : bd - ad;
    });

    return list;
  }, [fullInventory, tab, showHidden, search, sort]);

  const onExport = () => {
    const rows = (fullInventory || []).map(i => ({
      name: i.name,
      cubesLeft: i.cubesLeft ?? 0,
      status: i.status || 'Frozen',
      madeOn: i.madeOn || i.createdAt || ''
    }));
    downloadCsv(`inventory-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  return (
    <div className="page-wrap space-y-6">
      {/* Header */}
      <section>
        <h2 className="text-3xl sm:text-4xl font-extrabold">Inventory</h2>
        <p className="text-muted mt-1">Manage stock, restock, and track aging.</p>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <Package size={18} />
          <div>
            <div className="text-xs text-muted">Items</div>
            <div className="text-xl font-bold">{stats.items}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <CheckCircle2 size={18} />
          <div>
            <div className="text-xs text-muted">In stock</div>
            <div className="text-xl font-bold">{stats.inStock}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <EyeOff size={18} />
          <div>
            <div className="text-xs text-muted">Out</div>
            <div className="text-xl font-bold">{stats.out}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Layers size={18} />
          <div>
            <div className="text-xs text-muted">Portions</div>
            <div className="text-xl font-bold">{stats.totalCubes}</div>
          </div>
        </div>
      </div>

      {/* Controls — sticky */}
      <div className="card sticky top-2 z-20">
        <input
          className="input"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputMode="search"
        />

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button onClick={() => setTab('all')} className={`pill ${tab==='all'?'ring-1 ring-violet-400/40':''}`}>All</button>
          <button onClick={() => setTab('in')} className={`pill ${tab==='in'?'ring-1 ring-violet-400/40':''}`}>In stock</button>
          <button onClick={() => setTab('out')} className={`pill ${tab==='out'?'ring-1 ring-violet-400/40':''}`}>Out of stock</button>
          <button onClick={() => setTab('low')} className={`pill ${tab==='low'?'ring-1 ring-violet-400/40':''}`}>Low (≤3)</button>

          <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="accent-violet-600"
              checked={showHidden}
              onChange={(e)=>setShowHidden(e.target.checked)}
            />
            Show hidden
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-3">
          <label className="text-muted mr-1">Sort</label>
          <select
            className="rounded-xl border bg-transparent px-3 py-2"
            value={sort}
            onChange={(e)=>setSort(e.target.value)}
          >
            <option value="oldest">Oldest</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>

          <button className="pill ml-auto" onClick={onExport} aria-label="Export inventory as CSV">
            <Download size={16}/> Export CSV
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="card text-muted">No items match.</div>
        ) : (
          filtered.map((item) => (
            <FoodInventoryItem
              key={item.id}
              item={item}
              onLogUsage={handleLogUsage}
              onUpdateStatus={handleUpdateItemStatus}
              onSetPortions={handleSetPortions}
              onSetAging={handleSetAging}
              onToggleHidden={handleToggleHidden}  // <-- add this
              onRestock={handleRestock}
            />
          ))
        )}
      </div>
    </div>
  );
}
