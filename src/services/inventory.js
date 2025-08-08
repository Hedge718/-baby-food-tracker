// src/services/inventory.js
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// Convert Firestore Timestamp fields to JS Date
function toPlain(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k in obj) {
    const v = obj[k];
    if (v && typeof v.toDate === "function") out[k] = v.toDate();
    else if (v && typeof v === "object") out[k] = toPlain(v);
    else out[k] = v;
  }
  return out;
}

export async function listInventory() {
  const q = query(collection(db, "inventory"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
}
