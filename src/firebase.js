import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

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

// Helper to convert Firestore timestamps to JS Dates safely
const docToData = (doc) => {
    const data = doc.data();
    const convertedData = {};
    for (const key in data) {
        const value = data[key];
        if (value && typeof value.toDate === 'function') {
            convertedData[key] = value.toDate();
        } else {
            convertedData[key] = value;
        }
    }
    return { id: doc.id, ...convertedData };
};

export async function addInventoryItem(itemData) {
    const docRef = await addDoc(collection(db, 'inventory'), {
      ...itemData,
      createdAt: serverTimestamp() // Add a timestamp
    });
    return { id: docRef.id, ...itemData, createdAt: new Date() }; // Return a complete object for optimistic updates
}

export async function getInventory() {
  const snap = await getDocs(query(collection(db, 'inventory'), orderBy('name')));
  return snap.docs.map(docToData);
}

export async function getHistory() {
  const snap = await getDocs(query(collection(db, 'history'), orderBy('timestamp', 'desc')));
  return snap.docs.map(docToData);
}

export async function getMealPlans() {
  const snap = await getDocs(query(collection(db, 'mealPlans'), orderBy('date')));
  return snap.docs.map(docToData);
}

export async function getRecipes() {
  const snap = await getDocs(collection(db, 'recipes'));
  return snap.docs.map(docToData);
}