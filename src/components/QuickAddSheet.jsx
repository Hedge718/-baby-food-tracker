import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickAddSheet({ open, onClose, tab, setTab, children }) {
  // Close on ESC
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#1f2937] rounded-t-2xl p-4 pb-[calc(16px+env(safe-area-inset-bottom))] max-w-screen-sm mx-auto shadow-2xl"
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "spring", damping: 28 }}
          >
            <div className="flex gap-2 mb-3">
              {["Feeding", "Inventory", "Shopping"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 rounded-full border text-sm ${
                    tab === t
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-transparent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
