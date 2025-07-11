import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

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

export async function getInventory() {
  const snap = await getDocs(query(collection(db, 'inventory'), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getHistory() {
  const snap = await getDocs(query(collection(db, 'history'), orderBy('timestamp', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMealPlans() {
  const snap = await getDocs(query(collection(db, 'mealPlans'), orderBy('date')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRecipes() {
  const snap = await getDocs(collection(db, 'recipes'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}