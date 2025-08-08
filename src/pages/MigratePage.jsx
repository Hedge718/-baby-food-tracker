// src/pages/MigratePage.jsx
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import { db } from "../firebase";
import {
  getDocs,
  collection,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const toTitleCase = (s = "") =>
  String(s).trim().replace(/\s+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

async function chunkedCommit(updater) {
  let batch = writeBatch(db);
  let ops = 0;

  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  await updater({
    update: (ref, data) => {
      batch.update(ref, data);
      ops++;
      if (ops >= 400) return flush(); // keep headroom under Firestore's 500 limit
      return Promise.resolve();
    },
    flush,
  });

  await flush();
}

export default function MigratePage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);

    try {
      let invUpdated = 0;
      let shopUpdated = 0;

      // INVENTORY
      await chunkedCommit(async ({ update }) => {
        const snap = await getDocs(collection(db, "inventory"));
        for (const d of snap.docs) {
          const data = d.data() || {};
          const title = toTitleCase(data.name || "");
          const lower = title.toLowerCase();

          const updates = {};
          if (data.name !== title) updates.name = title;
          if (data.nameLower !== lower) updates.nameLower = lower;
          if (!data.madeOn) {
            // prefer createdAt if it exists, otherwise set now
            updates.madeOn =
              data.createdAt && typeof data.createdAt.toDate === "function"
                ? data.createdAt
                : serverTimestamp();
          }
          if (Object.keys(updates).length) {
            updates.updatedAt = serverTimestamp();
            await update(doc(db, "inventory", d.id), updates);
            invUpdated++;
          }
        }
      });

      // SHOPPING LIST
      await chunkedCommit(async ({ update }) => {
        const snap = await getDocs(collection(db, "shoppingList"));
        for (const d of snap.docs) {
          const data = d.data() || {};
          const title = toTitleCase(data.name || "");
          const lower = title.toLowerCase();

          const updates = {};
          if (data.name !== title) updates.name = title;
          if (data.nameLower !== lower) updates.nameLower = lower;
          if (Object.keys(updates).length) {
            updates.updatedAt = serverTimestamp();
            await update(doc(db, "shoppingList", d.id), updates);
            shopUpdated++;
          }
        }
      });

      setResult({ invUpdated, shopUpdated });
      toast.success(`Migration complete: ${invUpdated} inventory, ${shopUpdated} shopping`);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Migration failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance: Data Migration"
        subtitle="Normalize existing docs (Title Case names, nameLower, and default madeOn)."
      />

      <div className="card p-4 space-y-4">
        <p className="text-sm text-muted">
          This is a one-time safe update:
          <br />• Sets <b>name</b> to Title Case (e.g., “butter” → “Butter”)
          <br />• Adds/updates <b>nameLower</b> for fast merging later
          <br />• Sets <b>madeOn</b> if missing (uses createdAt or now)
        </p>

        <button onClick={run} className="btn-primary h-10 px-4" disabled={running}>
          {running ? "Running…" : "Run migration"}
        </button>

        {result && (
          <div className="text-sm">
            <div>Inventory updated: <b>{result.invUpdated}</b></div>
            <div>Shopping updated: <b>{result.shopUpdated}</b></div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        You can remove this page after running. It’s not linked in the UI; open <code>/migrate</code> directly.
      </p>
    </div>
  );
}
