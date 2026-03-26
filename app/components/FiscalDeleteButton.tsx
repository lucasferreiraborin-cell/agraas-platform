"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function FiscalDeleteButton({ noteId }: { noteId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;
    setLoading(true);
    try {
      await fetch("/api/fiscal/delete", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ note_id: noteId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Excluir nota"
      className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
