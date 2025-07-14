import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, writeBatch, deleteDoc, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const docToData = (doc) => {
    const data = doc.data();
    const convertedData = { ...data };
    for (const key in convertedData) {
        if (convertedData[key] && typeof convertedData[key].toDate === 'function') {
            convertedData[key] = convertedData[key].toDate();
        }
    }
    return { id: doc.id, ...convertedData };
};

export async function getHistory() {
  const snap = await getDocs(query(collection(db, 'history'), orderBy('timestamp', 'desc')));
  return snap.docs.map(docToData);
}

export async function deleteHistoryItem(historyId) {
    await deleteDoc(doc(db, 'history', historyId));
}

export async function getShoppingList() {
    const snap = await getDocs(query(collection(db, 'shoppingList'), orderBy('createdAt', 'asc')));
    return snap.docs.map(docToData);
}

export async function addItemToShoppingList(itemName) {
    const docRef = await addDoc(collection(db, 'shoppingList'), { name: itemName, createdAt: serverTimestamp() });
    return { id: docRef.id, name: itemName, createdAt: new Date().toISOString() };
}

export async function removeItemFromShoppingList(itemId) {
    await deleteDoc(doc(db, 'shoppingList', itemId));
}

export async function logUsageAndUpdateInventory(item, newCubesLeft, amountUsed, isTrash) {
  const batch = writeBatch(db);
  const inventoryRef = doc(db, 'inventory', item.id);
  batch.update(inventoryRef, { cubesLeft: newCubesLeft });

  const historyRef = doc(collection(db, 'history'));
  batch.set(historyRef, { name: item.name, amount: amountUsed, type: isTrash ? 'wasted' : 'eaten', timestamp: serverTimestamp() });
  
  if (newCubesLeft <= 0) {
    const shoppingListQuery = query(collection(db, 'shoppingList'), where("name", "==", item.name));
    const existingSnap = await getDocs(shoppingListQuery);
    if (existingSnap.empty) {
        const shoppingListRef = doc(collection(db, 'shoppingList'));
        batch.set(shoppingListRef, { name: item.name, createdAt: serverTimestamp() });
    }
  }
  await batch.commit();
}

export async function getInventory() {
  const snap = await getDocs(query(collection(db, 'inventory')));
  return snap.docs.map(docToData);
}

export async function addNewInventoryItem(itemData) {
    const docRef = await addDoc(collection(db, 'inventory'), { name: itemData.name, cubesLeft: itemData.cubesLeft, createdAt: serverTimestamp() });
    return { id: docRef.id, ...itemData, createdAt: new Date() };
}

export async function updateExistingInventoryItem(itemId, newCubesLeft) {
    const itemRef = doc(db, 'inventory', itemId);
    await updateDoc(itemRef, { cubesLeft: newCubesLeft });
}

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
    for (const ingredient of recipe.ingredients) {
        const inventoryItem = inventory.find(i => i.id === ingredient.itemId);
        if (inventoryItem) {
            const inventoryRef = doc(db, 'inventory', ingredient.itemId);
            const newCubesLeft = inventoryItem.cubesLeft - ingredient.cubesRequired;
            batch.update(inventoryRef, { cubesLeft: newCubesLeft });
        }
    }
    const historyRef = doc(collection(db, 'history'));
    const totalCubes = recipe.ingredients.reduce((sum, ing) => sum + ing.cubesRequired, 0);
    batch.set(historyRef, { name: recipe.name, amount: totalCubes, type: 'recipe', timestamp: serverTimestamp() });
    await batch.commit();
}
export async function getMealPlans() {
    const snap = await getDocs(query(collection(db, 'mealPlans'), orderBy('date', 'asc')));
    return snap.docs.map(docToData);
}

export async function addMealPlan(planData) {
    const docRef = await addDoc(collection(db, 'mealPlans'), {
        ...planData,
        date: new Date(planData.date) 
    });
    return { id: docRef.id, ...planData };
}

export async function deleteMealPlan(planId) {
    await deleteDoc(doc(db, 'mealPlans', planId));
}