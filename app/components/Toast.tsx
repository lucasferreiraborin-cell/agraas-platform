"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
};

let toastId = 0;
const listeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

export function showToast(message: string, type: ToastType = "success") {
  const toast: ToastMessage = { id: ++toastId, message, type };
  toasts = [...toasts, toast];
  listeners.forEach(fn => fn(toasts));
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== toast.id);
    listeners.forEach(fn => fn(toasts));
  }, 4000);
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const fn = (t: ToastMessage[]) => setItems([...t]);
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl text-sm font-medium text-white transition-all ${
            item.type === "success" ? "bg-[#4f8a38]"
            : item.type === "error" ? "bg-[#c0392b]"
            : "bg-[#2d6a8f]"
          }`}
        >
          <span>{item.type === "success" ? "✓" : item.type === "error" ? "✕" : "ℹ"}</span>
          {item.message}
        </div>
      ))}
    </div>
  );
}
