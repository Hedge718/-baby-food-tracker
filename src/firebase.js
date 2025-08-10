// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  writeBatch,
  deleteDoc,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Modern local cache (silences the deprecation warning)
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  db = getFirestore(app);
}
export { db, app };

// ---------- Helpers ----------
const toTitleCase = (s = '') =>
  String(s).trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const parseYMD = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Accept "YYYY-MM-DD" and coerce to local midnight
  const d = new Date(String(v) + 'T00:00:00');
  return isNaN(d) ? null : d;
};

const docToData = (snap) => {
  const data = snap.data();
  const converted = { ...data };
  for (const key in converted) {
    const val = converted[key];
    if (val && typeof val.toDate === 'function') {
      converted[key] = val.toDate();
    }
  }
  return { id: snap.id, ...converted };
};

// ---------- History ----------
export async function getHistory() {
  const snap = await getDocs(query(collection(db, 'history'), orderBy('timestamp', 'desc')));
  return snap.docs.map(docToData);
}
export async function deleteHistoryItem(historyId) {
  await deleteDoc(doc(db, 'history', historyId));
}

// ---------- Shopping List ----------
export async function getShoppingList() {
  const snap = await getDocs(query(collection(db, 'shoppingList'), orderBy('createdAt', 'asc')));
  return snap.docs.map(docToData);
}
export async function addItemToShoppingList(itemName) {
  const title = toTitleCase(itemName);
  const ref = await addDoc(collection(db, 'shoppingList'), {
    name: title,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name: title, createdAt: new Date() };
}
export async function removeItemFromShoppingList(itemId) {
  await deleteDoc(doc(db, 'shoppingList', itemId));
}

// ---------- Inventory ----------
export async function getInventory() {
  const snap = await getDocs(query(collection(db, 'inventory')));
  return snap.docs.map(docToData);
}

// Merge-aware add; accepts madeOn as "YYYY-MM-DD" or Date; sets name/title-cased
export async function addNewInventoryItem(itemData) {
  const title = toTitleCase(itemData.name || '');
  const lower = title.toLowerCase();
  const qty = Math.max(0, Number(itemData.cubesLeft || 0));
  const madeOnParsed = parseYMD(itemData.madeOn); // <— accept string

  // Try match by normalized name
  const q1 = query(collection(db, 'inventory'), where('nameLower', '==', lower));
  const s1 = await getDocs(q1);
  if (!s1.empty) {
    const ref = doc(db, 'inventory', s1.docs[0].id);
    const cur = Number(s1.docs[0].data().cubesLeft || 0);
    await updateDoc(ref, {
      name: title,
      nameLower: lower,
      cubesLeft: cur + qty,
      status: itemData.status || 'Frozen',
      // Only set madeOn if user provided one
      ...(madeOnParsed ? { madeOn: madeOnParsed } : {}),
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id, name: title };
  }

  // Create new
  const ref = await addDoc(collection(db, 'inventory'), {
    name: title,
    nameLower: lower,
    cubesLeft: qty,
    status: itemData.status || 'Frozen',
    createdAt: serverTimestamp(),
    madeOn: madeOnParsed || serverTimestamp(), // <— set if provided
    hidden: !!itemData.hidden,
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, name: title, createdAt: new Date() };
}

export async function updateExistingInventoryItem(itemId, newCubesLeft) {
  await updateDoc(doc(db, 'inventory', itemId), { cubesLeft: Number(newCubesLeft || 0), updatedAt: serverTimestamp() });
}
export async function updateInventoryItemStatus(itemId, status) {
  await updateDoc(doc(db, 'inventory', itemId), { status, updatedAt: serverTimestamp() });
}
export async function setInventoryHidden(itemId, hidden) {
  await updateDoc(doc(db, 'inventory', itemId), { hidden: !!hidden, updatedAt: serverTimestamp() });
}
// Accepts "YYYY-MM-DD" or Date
export async function updateInventoryMadeOn(itemId, madeOnDate) {
  const d = parseYMD(madeOnDate);
  if (!d) throw new Error('Invalid date');
  await updateDoc(doc(db, 'inventory', itemId), { madeOn: d, updatedAt: serverTimestamp() });
}

export async function logUsageAndUpdateInventory(item, newCubesLeft, amountUsed, isTrash) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'inventory', item.id), { cubesLeft: newCubesLeft, updatedAt: serverTimestamp() });

  const historyRef = doc(collection(db, 'history'));
  const entry = {
    name: toTitleCase(item.name),
    amount: amountUsed,
    type: isTrash ? 'wasted' : 'eaten',
    timestamp: serverTimestamp(),
  };
  batch.set(historyRef, entry);
  await batch.commit();
  return { ...entry, id: historyRef.id, timestamp: new Date() };
}

// ---------- Recipes ----------
export async function getRecipes() {
  const snap = await getDocs(query(collection(db, 'recipes'), orderBy('createdAt', 'desc')));
  return snap.docs.map(docToData);
}
export async function addRecipe(recipeData) {
  const ref = await addDoc(collection(db, 'recipes'), { ...recipeData, createdAt: serverTimestamp() });
  return { id: ref.id, ...recipeData, createdAt: new Date() };
}
export async function deleteRecipe(recipeId) {
  await deleteDoc(doc(db, 'recipes', recipeId));
}

// ---------- Planner ----------
export async function getMealPlans() {
  const snap = await getDocs(query(collection(db, 'mealPlans'), orderBy('date', 'asc')));
  return snap.docs.map(docToData);
}
export async function addMealPlan(planData) {
  const ref = await addDoc(collection(db, 'mealPlans'), {
    ...planData,
    date: new Date(planData.date),
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...planData };
}
export async function deleteMealPlan(planId) {
  await deleteDoc(doc(db, 'mealPlans', planId));
}
