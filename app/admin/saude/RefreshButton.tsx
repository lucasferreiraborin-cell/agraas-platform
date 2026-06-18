"use client";

/**
 * Botão "Atualizar mercado agora" — admin força refresh imediato dos fetchers.
 * Reusa CRON_SECRET via endpoint /api/admin/market/refresh (server-side bridge).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleRefresh() {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/market/refresh", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro");
        setResult(`${json.total_signals ?? 0} sinais coletados`);
        router.refresh();
      } catch (e) {
        setResult(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-[--text-secondary]">{result}</span>
      )}
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className="ag-button-primary inline-flex items-center gap-2 disabled:opacity-60"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Atualizar mercado agora
      </button>
    </div>
  );
}
