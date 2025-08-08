import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  runTransaction,
  getDocs,
  query,
  where,
  limit,
  updateDoc,
  increment,
  deleteDoc,
} from "firebase/firestore";

// Normalize names: trim → single spaces → Title Case
function toTitleCase(s = "") {
  const clean = String(s).trim().replace(/\s+/g, " ").toLowerCase();
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** ---------- FEEDING (log + optionally consume inventory) ---------- */
export async function logFeedingAndConsume({ type, food, qty, when }) {
  const titleFood = toTitleCase(food || "");
  const typeTitle = toTitleCase(type || "Feeding");
  const name = titleFood || typeTitle;
  const amount = Number(qty || 0);

  // 1) Always log feeding
  const ref = await addDoc(collection(db, "history"), {
    name,
    amount,
    type: "feeding",
    timestamp: when instanceof Date ? when : serverTimestamp(),
    createdAt: serverTimestamp(),
    meta: { whatType: typeTitle, food: titleFood },
  });

  // 2) If we know the food name, try to decrement matching inventory item
  if (!titleFood) return { historyId: ref.id, consumed: false };

  const lower = titleFood.toLowerCase();
  const q = query(collection(db, "inventory"), where("nameLower", "==", lower), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return { historyId: ref.id, consumed: false };

  const invRef = doc(db, "inventory", snap.docs[0].id);

  let consumed = false;
  let newCubesLeft = null;

  await runTransaction(db, async (tx) => {
    const s = await tx.get(invRef);
    if (!s.exists()) return;
    const cur = Number(s.data().cubesLeft || 0);
    const next = Math.max(0, cur - amount);
    tx.update(invRef, { cubesLeft: next, updatedAt: serverTimestamp() });
    consumed = true;
    newCubesLeft = next;
  });

  return {
    historyId: ref.id,
    consumed,
    itemName: titleFood,
    amount,
    newCubesLeft,
    invItemId: snap.docs[0].id,
  };
}

// Back-compat alias
export const logFeeding = logFeedingAndConsume;

/** ---------- UNDO FEEDING (10s quick undo) ---------- */
export async function undoFeeding({ historyId, invItemId, amount }) {
  if (historyId) {
    await deleteDoc(doc(db, "history", historyId));
  }
  if (invItemId && Number(amount) > 0) {
    await updateDoc(doc(db, "inventory", invItemId), {
      cubesLeft: increment(Number(amount)),
      updatedAt: serverTimestamp(),
    });
  }
  return true;
}

/** ---------- INVENTORY (merge-aware add) ---------- */
export async function addInventoryItem({ name, cubesLeft, status, madeOn }) {
  const title = toTitleCase(name);
  const lower = title.toLowerCase();
  const qty = Number(cubesLeft || 0);
  const statusSafe = status || "Frozen";

  // Prefer normalized nameLower
  const q1 = query(collection(db, "inventory"), where("nameLower", "==", lower));
  const s1 = await getDocs(q1);
  if (!s1.empty) {
    const ref = doc(db, "inventory", s1.docs[0].id);
    await updateDoc(ref, {
      name: title,
      nameLower: lower,
      cubesLeft: increment(qty),
      status: statusSafe,
      updatedAt: serverTimestamp(),
    });
    return true;
  }

  // Fallback on exact Title Case match (older docs)
  const q2 = query(collection(db, "inventory"), where("name", "==", title));
  const s2 = await getDocs(q2);
  if (!s2.empty) {
    const ref = doc(db, "inventory", s2.docs[0].id);
    await updateDoc(ref, {
      name: title,
      nameLower: lower,
      cubesLeft: increment(qty),
      status: statusSafe,
      updatedAt: serverTimestamp(),
    });
    return true;
  }

  // Create new
  await addDoc(collection(db, "inventory"), {
    name: title,
    nameLower: lower,
    cubesLeft: qty,
    status: statusSafe,
    createdAt: serverTimestamp(),
    madeOn: madeOn instanceof Date ? madeOn : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return true;
}

/** ---------- SHOPPING LIST (normalize) ---------- */
export async function addShoppingItem({ text, name, createdAt }) {
  const itemName = toTitleCase((text ?? name) || "");
  if (!itemName) throw new Error("Item name required");
  await addDoc(collection(db, "shoppingList"), {
    name: itemName,
    createdAt: createdAt instanceof Date ? createdAt : serverTimestamp(),
  });
  return true;
}

/** ---------- SAFE DECREMENT (utility for Use buttons) ---------- */
export async function usePortions(itemId, qty = 1) {
  const invRef = doc(db, "inventory", itemId);
  const amount = Number(qty || 0);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(invRef);
    if (!snap.exists()) throw new Error("Item not found");
    const data = snap.data();
    const cur = Number(data.cubesLeft || 0);
    const next = Math.max(0, cur - amount);

    tx.update(invRef, { cubesLeft: next, updatedAt: serverTimestamp() });
    tx.set(doc(collection(db, "history")), {
      name: toTitleCase(data.name || "Unknown"),
      amount,
      type: "eaten",
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
  return true;
}
