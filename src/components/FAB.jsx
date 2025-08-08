import React from "react";
import { Plus } from "lucide-react";

export default function FAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Quick Add"
      className="fixed bottom-[88px] right-4 h-14 w-14 rounded-full shadow-xl bg-black text-white grid place-items-center z-50 active:scale-[0.98]"
    >
      <Plus />
    </button>
  );
}
