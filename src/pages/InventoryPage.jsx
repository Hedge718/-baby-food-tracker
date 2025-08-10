import React, { useMemo, useState } from 'react';
import { Package, CheckCircle2, Layers, EyeOff, Eye, Download } from 'lucide-react';
import { useData } from '../context/DataContext';
import FoodInventoryItem from '../components/FoodInventoryItem';

// Simple CSV export
function downloadCsv(filename, rows) {
  const header = ['name','cubesLeft','status','madeOn'];
  const body = (rows || []).map(r => {
    const cells = [
      r.name ?? '',
      r.cubesLeft ?? 0,
      r.status ?? 'Frozen',
      r.madeOn ? new Date(r.madeOn).toISOString().slice(0,10) : ''
    ];
    return cells.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  });
  const csv = [header.join(','), ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryPage() {
  const {
    fullInventory,
    loading,
    handleLogUsage,
    handleUpdateItemStatus,
    handleSetPortions,
    handleSetAging,
    handleToggleHidden,
  } = useData();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'in' | 'out' | 'low' | 'hidden'
  const [sort, setSort] = useState('oldest'); // oldest | newest | name

  const stats = useMemo(() => {
    const items = fullInventory || [];
    const inStock = items.filter(i => (i.cubesLeft ?? 0) > 0).length;
    const totalCubes = items.reduce((s, i) => s + (Number(i.cubesLeft) || 0), 0);
    const out = items.length - inStock;
    const hidden = items.filter(i => !!i.hidden).length;
    return { items: items.length, inStock, out, totalCubes, hidden };
  }, [fullInventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...(fullInventory || [])];

    if (tab === 'in') list = list.filter(i => (i.cubesLeft ?? 0) > 0 && !i.hidden);
    else if (tab === 'out') list = list.filter(i => (i.cubesLeft ?? 0) <= 0 && !i.hidden);
    else if (tab === 'low') list = list.filter(i => (i.cubesLeft ?? 0) > 0 && (i.cubesLeft ?? 0) <= 3 && !i.hidden);
    else if (tab === 'hidden') list = list.filter(i => !!i.hidden);
    else list = list.filter(i => !i.hidden); // all = visible only

    if (q) list = list.filter(i => String(i.name || '').toLowerCase().includes(q));

    list.sort((a, b) => {
      if (sort === 'name') return String(a.name||'').localeCompare(String(b.name||''));
      const ad = new Date(a.madeOn || a.createdAt || 0).getTime();
      const bd = new Date(b.madeOn || b.createdAt || 0).getTime();
      return sort === 'oldest' ? ad - bd : bd - ad;
    });

    return list;
  }, [fullInventory, tab, search, sort]);

  const onExport = () => downloadCsv(`inventory-${new Date().toISOString().slice(0,10)}.csv`, fullInventory || []);

  return (
    <div className="page-wrap space-y-6">
      {/* Header */}
      <section>
        <h2 className="text-3xl sm:text-4xl font-extrabold">Inventory</h2>
        <p className="text-muted mt-1">Manage stock, hide/unhide, and track aging.</p>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card flex items-center gap-3">
          <Package size={18} />
          <div><div className="text-xs text-muted">Items</div><div className="text-xl font-bold">{stats.items}</div></div>
        </div>
        <div className="card flex items-center gap-3">
          <CheckCircle2 size={18} />
          <div><div className="text-xs text-muted">In stock</div><div className="text-xl font-bold">{stats.inStock}</div></div>
        </div>
        <div className="card flex items-center gap-3">
          <EyeOff size={18} />
          <div><div className="text-xs text-muted">Out</div><div className="text-xl font-bold">{stats.out}</div></div>
        </div>
        <div className="card flex items-center gap-3">
          <Layers size={18} />
          <div><div className="text-xs text-muted">Portions</div><div className="text-xl font-bold">{stats.totalCubes}</div></div>
        </div>
        <div className="card flex items-center gap-3">
          <Eye size={18} />
          <div><div className="text-xs text-muted">Hidden</div><div className="text-xl font-bold">{stats.hidden}</div></div>
        </div>
      </div>

      {/* Controls (sticky) */}
      <div className="card sticky top-2 z-20">
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputMode="search"
        />

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button onClick={() => setTab('all')} className={`pill ${tab==='all'?'ring-1 ring-violet-400/40':''}`}>All</button>
          <button onClick={() => setTab('in')} className={`pill ${tab==='in'?'ring-1 ring-violet-400/40':''}`}>In stock</button>
          <button onClick={() => setTab('out')} className={`pill ${tab==='out'?'ring-1 ring-violet-400/40':''}`}>Out of stock</button>
          <button onClick={() => setTab('low')} className={`pill ${tab==='low'?'ring-1 ring-violet-400/40':''}`}>Low (≤3)</button>
          <button onClick={() => setTab('hidden')} className={`pill ${tab==='hidden'?'ring-1 ring-violet-400/40':''}`}>Hidden</button>

          <div className="ml-auto flex items-center gap-2">
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

            <button className="pill" onClick={onExport} aria-label="Export inventory as CSV">
              <Download size={16}/> Export CSV
            </button>
          </div>
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
            <div key={item.id} className="space-y-2">
              <FoodInventoryItem
                item={item}
                onLogUsage={handleLogUsage}
                onUpdateStatus={handleUpdateItemStatus}
                onSetPortions={handleSetPortions}
                onSetAging={handleSetAging}
              />
              <div className="flex gap-2">
                {item.hidden ? (
                  <button className="pill" onClick={() => handleToggleHidden(item.id, false)}>Unhide</button>
                ) : (
                  <button className="pill" onClick={() => handleToggleHidden(item.id, true)}>Hide</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
