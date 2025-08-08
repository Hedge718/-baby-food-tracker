import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence, // optional offline cache
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
  getDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Optional: offline persistence (future API change warning is fine)
enableIndexedDbPersistence(db).catch(() => {});

// ---------- Helpers ----------
const toTitleCase = (s = '') =>
  String(s).trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// Convert Firestore Timestamp fields to JS Date for convenience
const docToData = (snap) => {
  const data = snap.data();
  const converted = { ...data };
  for (const key in converted) {
    if (converted[key] && typeof converted[key].toDate === 'function') {
      converted[key] = converted[key].toDate();
    }
  }
  return { id: snap.id, ...converted };
};

// Parse either a Date or "YYYY-MM-DD" into *local* midnight (fixes off-by-one due to UTC parsing)
function toLocalMidnight(dateish) {
  if (dateish instanceof Date) {
    return new Date(dateish.getFullYear(), dateish.getMonth(), dateish.getDate());
  }
  if (typeof dateish === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateish.trim());
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    // fallback: let JS parse other formats (may be UTC if YYYY-MM-DDTHH:mmZ)
    return new Date(dateish);
  }
  return new Date();
}

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

// Title Case + also store a normalized lower field for future merges
export async function addItemToShoppingList(itemName) {
  const title = toTitleCase(itemName);
  const lower = title.toLowerCase();
  const docRef = await addDoc(collection(db, 'shoppingList'), {
    name: title,
    nameLower: lower,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, name: title, nameLower: lower, createdAt: new Date() };
}
export async function removeItemFromShoppingList(itemId) {
  await deleteDoc(doc(db, 'shoppingList', itemId));
}

// ---------- Inventory ----------
export async function getInventory() {
  const snap = await getDocs(query(collection(db, 'inventory')));
  return snap.docs.map(docToData);
}

// Merge-aware add: Title Case + nameLower; sum cubes if same item exists
export async function addNewInventoryItem(itemData) {
  const title = toTitleCase(itemData.name || '');
  const lower = title.toLowerCase();
  const qty = Number(itemData.cubesLeft || 0);

  // try normalized match first
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
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id, name: title };
  }

  // fallback exact Title Case
  const q2 = query(collection(db, 'inventory'), where('name', '==', title));
  const s2 = await getDocs(q2);
  if (!s2.empty) {
    const ref = doc(db, 'inventory', s2.docs[0].id);
    const cur = Number(s2.docs[0].data().cubesLeft || 0);
    await updateDoc(ref, {
      name: title,
      nameLower: lower,
      cubesLeft: cur + qty,
      status: itemData.status || 'Frozen',
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id, name: title };
  }

  // create new
  const madeOn =
    itemData.madeOn
      ? toLocalMidnight(itemData.madeOn)
      : serverTimestamp();

  const docRef = await addDoc(collection(db, 'inventory'), {
    name: title,
    nameLower: lower,
    cubesLeft: qty,
    status: itemData.status || 'Frozen',
    createdAt: serverTimestamp(),
    madeOn,
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, name: title, createdAt: new Date() };
}

export async function updateExistingInventoryItem(itemId, newCubesLeft) {
  const itemRef = doc(db, 'inventory', itemId);
  await updateDoc(itemRef, { cubesLeft: newCubesLeft, updatedAt: serverTimestamp() });
}

export async function updateInventoryItemStatus(itemId, status) {
  const itemRef = doc(db, 'inventory', itemId);
  await updateDoc(itemRef, { status, updatedAt: serverTimestamp() });
}

// Hide/unhide an inventory item (e.g., to hide zeros you don't want to see)
export async function setInventoryHidden(itemId, hidden) {
  const itemRef = doc(db, 'inventory', itemId);
  await updateDoc(itemRef, {
    hidden: !!hidden,
    updatedAt: serverTimestamp(),
  });
}

// Update the "madeOn" date (aging) for an inventory item — uses *local* midnight
export async function updateInventoryMadeOn(itemId, madeOnDate) {
  const itemRef = doc(db, 'inventory', itemId);
  const date = toLocalMidnight(madeOnDate);
  await updateDoc(itemRef, {
    madeOn: date,
    updatedAt: serverTimestamp(),
  });
}

// Log usage + optionally add to shopping list if depleted
export async function logUsageAndUpdateInventory(item, newCubesLeft, amountUsed, isTrash) {
  const batch = writeBatch(db);
  const inventoryRef = doc(db, 'inventory', item.id);
  batch.update(inventoryRef, { cubesLeft: newCubesLeft, updatedAt: serverTimestamp() });

  const historyRef = doc(collection(db, 'history'));
  const newHistoryEntry = {
    name: toTitleCase(item.name),
    amount: amountUsed,
    type: isTrash ? 'wasted' : 'eaten',
    timestamp: serverTimestamp(),
  };
  batch.set(historyRef, newHistoryEntry);

  if (newCubesLeft <= 0) {
    const lower = toTitleCase(item.name).toLowerCase();
    const shoppingListQuery = query(collection(db, 'shoppingList'), where('nameLower', '==', lower));
    const existingSnap = await getDocs(shoppingListQuery);
    if (existingSnap.empty) {
      const shoppingListRef = doc(collection(db, 'shoppingList'));
      batch.set(shoppingListRef, {
        name: toTitleCase(item.name),
        nameLower: lower,
        createdAt: serverTimestamp(),
      });
    }
  }
  await batch.commit();
  return { ...newHistoryEntry, id: historyRef.id, timestamp: new Date() };
}

// ---------- Recipes ----------
export async function getRecipes() {
  const snap = await getDocs(query(collection(db, 'recipes'), orderBy('createdAt', 'desc')));
  return snap.docs.map(docToData);
}
export async function addRecipe(recipeData) {
  const docRef = await addDoc(collection(db, 'recipes'), { ...recipeData, createdAt: serverTimestamp() });
  return { id: docRef.id, ...recipeData, createdAt: new Date() };
}
export async function deleteRecipe(recipeId) {
  await deleteDoc(doc(db, 'recipes', recipeId));
}

export async function cookRecipeInDb(recipe, inventory) {
  const batch = writeBatch(db);
  const updatedInventoryItems = [];

  for (const ingredient of recipe.ingredients) {
    const inventoryItem = inventory.find(i => i.id === ingredient.itemId);
    if (inventoryItem) {
      const inventoryRef = doc(db, 'inventory', ingredient.itemId);
      const newCubesLeft = inventoryItem.cubesLeft - ingredient.cubesRequired;
      batch.update(inventoryRef, { cubesLeft: newCubesLeft, updatedAt: serverTimestamp() });
      updatedInventoryItems.push({ id: ingredient.itemId, newCubesLeft });
    }
  }
  const historyRef = doc(collection(db, 'history'));
  const totalCubes = recipe.ingredients.reduce((sum, ing) => sum + ing.cubesRequired, 0);
  const newHistoryEntry = { name: recipe.name, amount: totalCubes, type: 'recipe', timestamp: serverTimestamp() };
  batch.set(historyRef, newHistoryEntry);
  await batch.commit();

  return { newHistoryEntry: { ...newHistoryEntry, id: historyRef.id, timestamp: new Date() }, updatedInventoryItems };
}

// ---------- Meal Plans ----------
export async function getMealPlans() {
  const snap = await getDocs(query(collection(db, 'mealPlans'), orderBy('date', 'asc')));
  return snap.docs.map(docToData);
}

// IMPORTANT: store date at *local midnight* to avoid off-by-one in US timezones
export async function addMealPlan(planData) {
  const localDate = toLocalMidnight(planData.date);
  const docRef = await addDoc(collection(db, 'mealPlans'), {
    ...planData,
    date: localDate,
  });
  return { id: docRef.id, ...planData, date: localDate };
}
export async function deleteMealPlan(planId) {
  await deleteDoc(doc(db, 'mealPlans', planId));
}
