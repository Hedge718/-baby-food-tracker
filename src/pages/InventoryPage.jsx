// src/pages/InventoryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInventory } from "../services/inventory";
import { addShoppingItem, usePortions } from "../services/actions";
import {
  updateExistingInventoryItem,
  updateInventoryItemStatus,
  setInventoryHidden,
  updateInventoryMadeOn,   // used for auto-reset
} from "../firebase";
import { toast } from "react-hot-toast";
import {
  Search, ShoppingCart, Check, X, EyeOff, Eye, Download,
  Package, CheckCircle2, CircleOff, Layers, CalendarDays, RotateCcw
} from "lucide-react";

const DAY = 24 * 60 * 60 * 1000;
const LS = {
  filter: "inv_filter",
  low: "inv_lowThresh",
  sort: "inv_sortBy",
  showHidden: "inv_showHidden",
  autoAge: "inv_autoResetAge",                  // NEW
};

const coerceDate = (x)=>{ if(!x) return null; if(x instanceof Date) return x; const d=new Date(x); return isNaN(d.getTime())?null:d; };
const ageInDays = (it)=>{ const d=coerceDate(it.madeOn||it.createdAt); if(!d) return null; return Math.max(0, Math.floor((Date.now()-d.getTime())/DAY)); };

// <input type="date"> helpers
const toDateInputValue = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? new Date(d) : new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 10);
};
const fromDateInputValue = (s) => (s ? new Date(s + "T00:00:00") : null);

const csvEscape = (v)=>`"${String(v??"").replace(/"/g,'""')}"`;
const fmtDate = (d)=> (d ? new Date(d).toISOString().slice(0,10) : "");
function exportCsv(rows){
  const header=["Name","Portions","Status","Made On","Created At","Age (days)","Hidden"];
  const lines=[header.map(csvEscape).join(",")];
  for(const it of rows){
    lines.push([it.name, Number(it.cubesLeft??0), it.status??"", fmtDate(it.madeOn), fmtDate(it.createdAt), ageInDays(it)??"", it.hidden?"Yes":"No"].map(csvEscape).join(","));
  }
  const blob=new Blob([lines.join("\n")+"\n"],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const t=new Date(); const pad=(n)=>String(n).padStart(2,"0");
  const name=`inventory-${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}.csv`;
  const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// tiny stock meter (0..10)
const Meter = ({ value }) => {
  const v = Math.max(0, Math.min(10, Number(value || 0)));
  const pct = (v / 10) * 100;
  const tone = v <= 3 ? "rgba(239,68,68,.7)" : v <= 5 ? "rgba(245,158,11,.8)" : "var(--accent-600)";
  return (
    <div className="h-2 w-full rounded-full bg-[rgba(148,163,184,.25)] overflow-hidden">
      <div className="h-full" style={{ width: `${pct}%`, background: tone }} />
    </div>
  );
};

export default function InventoryPage(){
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(()=>localStorage.getItem(LS.filter) || "all");
  const [lowThresh, setLowThresh] = useState(()=>Number(localStorage.getItem(LS.low) || 3));
  const [sortBy, setSortBy] = useState(()=>localStorage.getItem(LS.sort) || "age");
  const [selected, setSelected] = useState({});
  const [editQty, setEditQty] = useState({});
  const [editDate, setEditDate] = useState({});
  const [showHidden, setShowHidden] = useState(()=>localStorage.getItem(LS.showHidden)==="true");
  const [autoResetAge, setAutoResetAge] = useState(()=>localStorage.getItem(LS.autoAge)==="true"); // NEW

  useEffect(()=>localStorage.setItem(LS.filter,filter),[filter]);
  useEffect(()=>localStorage.setItem(LS.low,String(lowThresh)),[lowThresh]);
  useEffect(()=>localStorage.setItem(LS.sort,sortBy),[sortBy]);
  useEffect(()=>localStorage.setItem(LS.showHidden,String(showHidden)),[showHidden]);
  useEffect(()=>localStorage.setItem(LS.autoAge,String(autoResetAge)),[autoResetAge]); // NEW

  const { data: items = [], isLoading, isError } = useQuery({ queryKey:["inventory"], queryFn:listInventory });

  const filtered = useMemo(()=>{
    let arr = items.slice();
    if(!showHidden) arr = arr.filter((it)=>!it.hidden);
    const q = search.trim().toLowerCase();
    if(q) arr = arr.filter((it)=>(it.name||"").toLowerCase().includes(q));
    if(filter==="instock") arr = arr.filter((it)=>Number(it.cubesLeft||0)>0);
    if(filter==="outofstock") arr = arr.filter((it)=>Number(it.cubesLeft||0)===0);
    if(filter==="low") arr = arr.filter((it)=>Number(it.cubesLeft||0)>0 && Number(it.cubesLeft||0)<=Number(lowThresh||0));
    if(sortBy==="name") arr.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    if(sortBy==="portions") arr.sort((a,b)=>Number(a.cubesLeft||0)-Number(b.cubesLeft||0));
    if(sortBy==="age") arr.sort((a,b)=>{const A=ageInDays(a),B=ageInDays(b); if(A==null&&B==null) return 0; if(A==null) return 1; if(B==null) return -1; return B-A;});
    return arr;
  },[items,search,filter,lowThresh,sortBy,showHidden]);

  const stats = useMemo(()=>{
    const total=items.length;
    const inStock=items.filter((it)=>Number(it.cubesLeft||0)>0).length;
    const out=total-inStock;
    const portions=items.reduce((s,it)=>s+Number(it.cubesLeft||0),0);
    return { total,inStock,out,portions };
  },[items]);

  // === mutations ===
  const setQtyMut = useMutation({
    mutationFn: ({ id, qty }) => updateExistingInventoryItem(id, Number(qty)),
    // If qty increased & toggle is ON → set madeOn to today
    onSuccess: async (_data, vars) => {
      const { id, qty, prev } = vars || {};
      if (autoResetAge && Number(qty) > Number(prev ?? 0)) {
        try {
          await updateInventoryMadeOn(id, new Date());
        } catch (e) {
          console.error(e);
        }
      }
      toast.success("Quantity updated");
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toast.error(e?.message || "Update failed"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateInventoryItemStatus(id, status),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (e) => toast.error(e?.message || "Update failed"),
  });

  const useMut = useMutation({
    mutationFn: ({ id, qty }) => usePortions(id, qty),
    onMutate: async ({ id, qty })=>{
      await qc.cancelQueries({queryKey:["inventory"]});
      const prev = qc.getQueryData(["inventory"]);
      qc.setQueryData(["inventory"], (old)=>(old||[]).map((it)=>it.id===id?{...it,cubesLeft:Math.max(0, Number(it.cubesLeft||0)-Number(qty||0))}:it));
      navigator.vibrate && navigator.vibrate(8);
      return { prev };
    },
    onError: (_e,_v,ctx)=>{ if(ctx?.prev) qc.setQueryData(["inventory"], ctx.prev); toast.error("Couldn’t use portions"); },
    onSuccess: ()=>toast.success("Used"),
    onSettled: ()=>qc.invalidateQueries({queryKey:["inventory"]})
  });

  const madeOnMut = useMutation({
    mutationFn: ({ id, dateStr }) => updateInventoryMadeOn(id, fromDateInputValue(dateStr)),
    onSuccess: ()=>{ toast.success("Aging updated"); qc.invalidateQueries({queryKey:["inventory"]}); },
    onError: (e)=>toast.error(e?.message || "Update failed")
  });

  const bulkToShopping = useMutation({
    mutationFn: async (ids)=>{
      const chosen = items.filter((i)=>ids.includes(i.id));
      const zeros = chosen.filter((i)=>Number(i.cubesLeft||0)===0 && !i.hidden);
      if(zeros.length===0) throw new Error("No out-of-stock items selected");
      await Promise.all(zeros.map((it)=>addShoppingItem({ name: it.name })));
    },
    onSuccess: ()=>{ toast.success("Added out-of-stock items to shopping list"); setSelected({}); },
    onError: (e)=>toast.error(e?.message || "Failed to add")
  });

  const bulkHideZeros = useMutation({
    mutationFn: async (ids)=>{
      const chosen = items.filter((i)=>ids.includes(i.id));
      const zeros = chosen.filter((i)=>Number(i.cubesLeft||0)===0 && !i.hidden);
      if(zeros.length===0) throw new Error("No zero-portion items to hide");
      await Promise.all(zeros.map((it)=>setInventoryHidden(it.id,true)));
    },
    onSuccess: ()=>{ toast.success("Hidden selected zero items"); setSelected({}); qc.invalidateQueries({queryKey:["inventory"]}); },
    onError: (e)=>toast.error(e?.message || "Hide failed")
  });

  const allSelected = filtered.length>0 && filtered.every((it)=>selected[it.id]);
  const toggleAll = ()=> {
    if(allSelected) setSelected({});
    else { const next={}; filtered.forEach((it)=>next[it.id]=true); setSelected(next); }
  };
  const selectedIds = useMemo(()=>Object.keys(selected).filter((k)=>selected[k]),[selected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold grad-title">Inventory</h2>
          <p className="text-muted">Manage stock, restock, and track aging.</p>
        </div>

        {/* Icon stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<Package size={18}/>} label="Items" value={stats.total} />
          <Stat icon={<CheckCircle2 size={18}/>} label="In stock" value={stats.inStock} />
          <Stat icon={<CircleOff size={18}/>} label="Out" value={stats.out} />
          <Stat icon={<Layers size={18}/>} label="Portions" value={stats.portions} />
        </div>
      </section>

      {/* Controls */}
      <section className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search…" className="input pl-9 w-full" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-1 -mx-1 px-1 flex-wrap md:flex-nowrap">
          {["all","instock","outofstock","low"].map((f)=>(
            <button key={f} onClick={()=>setFilter(f)} className={`pill ${filter===f ? 'is-active' : ''}`}>
              {f==="all" && "All"}
              {f==="instock" && "In stock"}
              {f==="outofstock" && "Out of stock"}
              {f==="low" && `Low (≤${lowThresh})`}
            </button>
          ))}
          {filter==="low" && (
            <input value={lowThresh} onChange={(e)=>setLowThresh(e.target.value)} inputMode="numeric" pattern="[0-9]*" className="h-10 w-16 rounded-xl border border-app px-2 text-center" aria-label="Low stock threshold" />
          )}

          <label className="ml-auto inline-flex items-center gap-2 pill">
            <input type="checkbox" checked={showHidden} onChange={(e)=>setShowHidden(e.target.checked)} />
            Show hidden
          </label>

          {/* NEW: Auto-reset aging toggle */}
          <label className="inline-flex items-center gap-2 pill">
            <input
              type="checkbox"
              checked={autoResetAge}
              onChange={(e)=>setAutoResetAge(e.target.checked)}
            />
            Auto-reset aging on restock
          </label>

          <div className="flex items-center gap-2 md:ml-2">
            <label className="text-sm text-muted">Sort</label>
            <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="select">
              <option value="age">Oldest</option>
              <option value="name">Name</option>
              <option value="portions">Portions</option>
            </select>
          </div>

          <button onClick={()=>exportCsv(filtered)} className="btn-outline h-10">
            <Download size={16} className="mr-2" /> Export CSV
          </button>
        </div>
      </section>

      {/* Bulk actions */}
      <section className="flex items-center gap-2 flex-wrap">
        <button onClick={toggleAll} className="pill" title={allSelected ? "Clear selection" : "Select all"}>
          {allSelected ? <X size={14} className="mr-1"/> : <Check size={14} className="mr-1"/>}
          {allSelected ? "Clear all" : "Select all"}
        </button>

        <button onClick={()=>bulkToShopping.mutate(selectedIds)} disabled={!selectedIds.length || bulkToShopping.isPending} className="pill">
          <ShoppingCart size={16} className="mr-1" /> Add selected to Shopping (zeros only)
        </button>

        <button onClick={()=>bulkHideZeros.mutate(selectedIds)} disabled={!selectedIds.length || bulkHideZeros.isPending} className="pill">
          <EyeOff size={16} className="mr-1" /> Hide selected zeros
        </button>
      </section>

      {/* MOBILE CARDS */}
      <div className="md:hidden">
        <ul className="space-y-4">
          {isLoading && <li className="p-3">Loading inventory…</li>}
          {isError && <li className="p-3 text-red-400">Failed to load inventory.</li>}
          {!isLoading && filtered.length===0 && <li className="p-3 text-muted">No items match.</li>}

          {filtered.map((it)=>{
            const age=ageInDays(it); const zero=Number(it.cubesLeft||0)===0;
            const tone = age==null ? "badge-ok" : age>=90 ? "badge-danger" : age>=30 ? "badge-warn" : "badge-ok";
            const currentDateStr = toDateInputValue(coerceDate(it.madeOn || it.createdAt));
            const inputVal = editDate[it.id] ?? currentDateStr;

            return (
              <li key={it.id} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={!!selected[it.id]} onChange={(e)=>setSelected((s)=>({...s,[it.id]:e.target.checked}))}/>
                    <div className="font-semibold truncate">{it.name}</div>
                    {it.hidden && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(148,163,184,.25)]">Hidden</span>}
                  </label>
                  <span className={`badge ${tone}`} title={coerceDate(it.madeOn||it.createdAt)?.toLocaleDateString()}>
                    {age==null ? "—" : `${age}d`}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {/* Portions */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`tabular-nums ${zero?"opacity-60":""}`}>Portions: {it.cubesLeft ?? 0}</span>
                      <form
                        onSubmit={(e)=>{
                          e.preventDefault();
                          const v = Math.max(0, Number(editQty[it.id]||0));
                          setQtyMut.mutate({ id: it.id, qty: v, prev: it.cubesLeft }); // pass prev
                        }}
                        className="flex items-center gap-2"
                      >
                        <input value={editQty[it.id] ?? ""} onChange={(e)=>setEditQty((s)=>({...s,[it.id]:e.target.value}))} placeholder="Set…" inputMode="numeric" pattern="[0-9]*" className="h-9 w-24 rounded-xl border border-app px-2 text-center" />
                        <button className="btn-outline h-9 px-3" disabled={setQtyMut.isPending}>Set</button>
                      </form>
                    </div>
                    <div className="mt-2"><Meter value={it.cubesLeft} /></div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted">Status</label>
                    <select value={it.status || "Frozen"} onChange={(e)=>statusMut.mutate({id:it.id, status:e.target.value})} className="select">
                      <option>Frozen</option><option>Fresh</option>
                    </select>
                  </div>

                  {/* Aging editor */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted flex items-center gap-1"><CalendarDays size={14}/> Aging</label>
                    <input
                      type="date"
                      value={inputVal}
                      onChange={(e)=>setEditDate((s)=>({ ...s, [it.id]: e.target.value }))}
                      className="h-9 w-40 rounded-xl border border-app px-2"
                    />
                    <button
                      className="btn-outline h-9 px-3"
                      onClick={()=> madeOnMut.mutate({ id: it.id, dateStr: inputVal || toDateInputValue(new Date()) })}
                      disabled={madeOnMut.isPending}
                    >
                      Set
                    </button>
                    <button
                      className="pill"
                      onClick={()=> {
                        const today = toDateInputValue(new Date());
                        setEditDate((s)=>({ ...s, [it.id]: today }));
                        madeOnMut.mutate({ id: it.id, dateStr: today });
                      }}
                      title="Reset to today"
                    >
                      <RotateCcw size={14}/> Today
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={()=>!zero && useMut.mutate({id:it.id, qty:1})} className={`btn-outline h-9 px-3 ${zero?"opacity-50 cursor-not-allowed":""}`} disabled={useMut.isPending || zero}>Use 1</button>
                    <form onSubmit={(e)=>{e.preventDefault(); const v=Math.max(1, Number(editQty[`u_${it.id}`]||1)); if(!zero) useMut.mutate({id:it.id, qty:v});}} className="flex items-center gap-2">
                      <input value={editQty[`u_${it.id}`] ?? ""} onChange={(e)=>setEditQty((s)=>({...s,[`u_${it.id}`]:e.target.value}))} placeholder="N" inputMode="numeric" pattern="[0-9]*" className="h-9 w-16 rounded-xl border border-app px-2 text-center" />
                      <button className={`btn-outline h-9 px-3 ${zero?"opacity-50 cursor-not-allowed":""}`} disabled={useMut.isPending || zero}>Use</button>
                    </form>

                    {zero && !it.hidden && (
                      <button onClick={async()=>{await setInventoryHidden(it.id,true); toast.success("Hidden"); qc.invalidateQueries({queryKey:["inventory"]});}} className="btn-outline h-9 px-3"><EyeOff size={16} className="mr-1"/> Hide</button>
                    )}
                    {it.hidden && (
                      <button onClick={async()=>{await setInventoryHidden(it.id,false); toast.success("Unhidden"); qc.invalidateQueries({queryKey:["inventory"]});}} className="btn-outline h-9 px-3"><Eye size={16} className="mr-1"/> Unhide</button>
                    )}
                    <button onClick={()=>addShoppingItem({name:it.name}).then(()=>toast.success("Added to shopping"))} className="btn-outline h-9 px-3"><ShoppingCart size={16} className="mr-1"/> Restock</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto card">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 surface-2">
            <tr className="text-left border-b border-app">
              <th className="p-3"><input type="checkbox" checked={allSelected} onChange={toggleAll}/></th>
              <th className="p-3">Name</th>
              <th className="p-3">Portions</th>
              <th className="p-3">Status</th>
              <th className="p-3">Age</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (<tr><td className="p-3" colSpan={6}>Loading inventory…</td></tr>)}
            {isError && (<tr><td className="p-3 text-red-400" colSpan={6}>Failed to load inventory.</td></tr>)}
            {!isLoading && filtered.length===0 && (<tr><td className="p-3 text-muted" colSpan={6}>No items match.</td></tr>)}

            {filtered.map((it)=>{
              const age=ageInDays(it); const zero=Number(it.cubesLeft||0)===0;
              const tone = age==null ? "badge-ok" : age>=90 ? "badge-danger" : age>=30 ? "badge-warn" : "badge-ok";
              const currentDateStr = toDateInputValue(coerceDate(it.madeOn || it.createdAt));
              const inputVal = editDate[it.id] ?? currentDateStr;

              return (
                <tr key={it.id} className="border-t border-app">
                  <td className="p-3 align-middle"><input type="checkbox" checked={!!selected[it.id]} onChange={(e)=>setSelected((s)=>({...s,[it.id]:e.target.checked}))}/></td>
                  <td className="p-3 align-middle font-medium">
                    {it.name}
                    {it.hidden && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[rgba(148,163,184,.25)]">Hidden</span>}
                  </td>
                  <td className="p-3 align-middle">
                    <div className="flex items-center gap-3">
                      <span className={`tabular-nums ${zero?"opacity-60":""}`}>{it.cubesLeft ?? 0}</span>
                      <div className="w-32"><Meter value={it.cubesLeft} /></div>
                      <form
                        onSubmit={(e)=>{
                          e.preventDefault();
                          const v = Math.max(0, Number(editQty[it.id]||0));
                          setQtyMut.mutate({ id: it.id, qty: v, prev: it.cubesLeft }); // pass prev
                        }}
                        className="flex items-center gap-2"
                      >
                        <input value={editQty[it.id] ?? ""} onChange={(e)=>setEditQty((s)=>({...s,[it.id]:e.target.value}))} placeholder="Set…" inputMode="numeric" pattern="[0-9]*" className="h-9 w-20 rounded-xl border border-app px-2 text-center"/>
                        <button className="btn-outline h-9 px-3" disabled={setQtyMut.isPending}>Set</button>
                      </form>
                    </div>
                  </td>
                  <td className="p-3 align-middle">
                    <select value={it.status || "Frozen"} onChange={(e)=>statusMut.mutate({id:it.id, status:e.target.value})} className="select">
                      <option>Frozen</option><option>Fresh</option>
                    </select>
                  </td>
                  <td className="p-3 align-middle">
                    <span className={`badge ${tone}`} title={coerceDate(it.madeOn||it.createdAt)?.toLocaleDateString()}>
                      {age==null ? "—" : `${age}d`}
                    </span>
                  </td>
                  <td className="p-3 align-middle">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Use actions */}
                      <button onClick={()=>useMut.mutate({id:it.id, qty:1})} className={`btn-outline h-9 px-3 ${zero?"opacity-50 cursor-not-allowed":""}`} disabled={useMut.isPending || zero}>Use 1</button>
                      <form onSubmit={(e)=>{e.preventDefault(); const v=Math.max(1, Number(editQty[`u_${it.id}`]||1)); if(!zero) useMut.mutate({id:it.id, qty:v});}} className="flex items-center gap-2">
                        <input value={editQty[`u_${it.id}`] ?? ""} onChange={(e)=>setEditQty((s)=>({...s,[`u_${it.id}`]:e.target.value}))} placeholder="N" inputMode="numeric" pattern="[0-9]*" className="h-9 w-14 rounded-xl border border-app px-2 text-center"/>
                        <button className={`btn-outline h-9 px-3 ${zero?"opacity-50 cursor-not-allowed":""}`} disabled={useMut.isPending || zero}>Use</button>
                      </form>

                      {/* Hide/Unhide + Restock */}
                      {zero && !it.hidden && (<button onClick={async()=>{await setInventoryHidden(it.id,true); toast.success("Hidden"); qc.invalidateQueries({queryKey:["inventory"]});}} className="btn-outline h-9 px-3"><EyeOff size={16} className="mr-1"/> Hide</button>)}
                      {it.hidden && (<button onClick={async()=>{await setInventoryHidden(it.id,false); toast.success("Unhidden"); qc.invalidateQueries({queryKey:["inventory"]});}} className="btn-outline h-9 px-3"><Eye size={16} className="mr-1"/> Unhide</button>)}
                      <button onClick={()=>addShoppingItem({name:it.name}).then(()=>toast.success("Added to shopping"))} className="btn-outline h-9 px-3"><ShoppingCart size={16} className="mr-1"/> Restock</button>

                      {/* Aging editor (desktop inline) */}
                      <div className="flex items-center gap-2 ml-3">
                        <label className="text-sm text-muted flex items-center gap-1"><CalendarDays size={14}/> Aging:</label>
                        <input
                          type="date"
                          value={inputVal}
                          onChange={(e)=>setEditDate((s)=>({ ...s, [it.id]: e.target.value }))}
                          className="h-9 w-36 rounded-xl border border-app px-2"
                        />
                        <button
                          className="btn-outline h-9 px-3"
                          onClick={()=> madeOnMut.mutate({ id: it.id, dateStr: inputVal || toDateInputValue(new Date()) })}
                          disabled={madeOnMut.isPending}
                        >
                          Set
                        </button>
                        <button
                          className="pill"
                          onClick={()=> {
                            const today = toDateInputValue(new Date());
                            setEditDate((s)=>({ ...s, [it.id]: today }));
                            madeOnMut.mutate({ id: it.id, dateStr: today });
                          }}
                          title="Reset to today"
                        >
                          <RotateCcw size={14}/> Today
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }){
  return (
    <div className="card-soft px-4 py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full flex items-center justify-center"
           style={{ background: "color-mix(in srgb, var(--accent-600) 22%, transparent)" }}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
