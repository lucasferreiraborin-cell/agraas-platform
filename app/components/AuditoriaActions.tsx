"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, FileDown } from "lucide-react";
import { showToast } from "@/app/components/Toast";

export default function AuditoriaActions() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      showToast("Snapshot atualizado.");
    }, 600);
  }

  function handleExport() {
    showToast("Exportação em breve.");
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition disabled:opacity-60"
      >
        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        {refreshing ? "Atualizando…" : "Atualizar snapshot"}
      </button>
      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition"
      >
        <FileDown size={13} />
        Exportar PDF
      </button>
    </div>
  );
}
