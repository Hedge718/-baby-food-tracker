// src/scripts/normalizeData.js
import { db } from "../firebase";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

// "butter", "  BUTTER  " -> "Butter"
const toTitleCase = (s = "") => {
  const clean = String(s).trim().replace(/\s+/g, " ").toLowerCase();
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
};
// Normalization key for grouping
const keyOf = (s = "") => String(s).trim().replace(/\s+/g, " ").toLowerCase();

async function normalizeInventory({ dryRun = true } = {}) {
  const snap = await getDocs(collection(db, "inventory"));
  const groups = new Map();

  snap.forEach((d) => {
    const data = d.data();
    const key = keyOf(data.name ?? "");
    const entry = { id: d.id, ...data, cubesLeft: Number(data.cubesLeft ?? 0) };
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  let updates = 0,
    deletes = 0,
    groupsTouched = 0;

  for (const [key, items] of groups.entries()) {
    if (key === "") continue;

    // Choose primary: most recently updated/created
    items.sort(
      (a, b) =>
        (b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) -
        (a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0)
    );
    const primary = items[0];
    const dupes = items.slice(1);

    const total = items.reduce((sum, it) => sum + Number(it.cubesLeft || 0), 0);
    const nameTitle = toTitleCase(primary.name || key);

    // Skip if already normalized and no dupes to merge
    const alreadyOk =
      dupes.length === 0 &&
      primary.name === nameTitle &&
      primary.nameLower === key &&
      Number(primary.cubesLeft || 0) === total;
    if (alreadyOk) continue;

    groupsTouched++;

    if (dryRun) {
      console.log(
        `[DRY] inventory "${nameTitle}": keep ${primary.id}, set cubes=${total}, delete [${dupes
          .map((d) => d.id)
          .join(", ")}]`
      );
      continue;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, "inventory", primary.id), {
      name: nameTitle,
      nameLower: key,
      cubesLeft: total,
      updatedAt: serverTimestamp(),
    });
    updates++;

    for (const dupe of dupes) {
      batch.delete(doc(db, "inventory", dupe.id));
      deletes++;
    }
    await batch.commit();
  }

  return { groupsTouched, updates, deletes };
}

async function normalizeShoppingList({ dryRun = true } = {}) {
  const snap = await getDocs(collection(db, "shoppingList"));
  const groups = new Map();

  snap.forEach((d) => {
    const data = d.data();
    const key = keyOf(data.name ?? data.text ?? "");
    const entry = { id: d.id, ...data };
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  let updates = 0,
    deletes = 0,
    groupsTouched = 0;

  for (const [key, items] of groups.entries()) {
    if (key === "") continue;

    // Keep the earliest created item (or just the first if no timestamps)
    items.sort(
      (a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
    );
    const primary = items[0];
    const dupes = items.slice(1);

    const nameTitle = toTitleCase(primary.name || primary.text || key);
    const needsUpdate = primary.name !== nameTitle || dupes.length > 0;

    if (dryRun) {
      if (needsUpdate) {
        console.log(
          `[DRY] shoppingList "${nameTitle}": keep ${primary.id}, delete [${dupes
            .map((d) => d.id)
            .join(", ")}]`
        );
      }
      continue;
    }

    if (needsUpdate) {
      const batch = writeBatch(db);
      batch.update(doc(db, "shoppingList", primary.id), { name: nameTitle });
      updates++;
      for (const dupe of dupes) {
        batch.delete(doc(db, "shoppingList", dupe.id));
        deletes++;
      }
      await batch.commit();
      groupsTouched++;
    }
  }

  return { groupsTouched, updates, deletes };
}

export async function runNormalization({ dryRun = true } = {}) {
  const inv = await normalizeInventory({ dryRun });
  const shop = await normalizeShoppingList({ dryRun });
  console.log("Inventory:", inv);
  console.log("ShoppingList:", shop);
  return { inventory: inv, shoppingList: shop };
}
