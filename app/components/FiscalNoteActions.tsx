"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { noteId: string; status: string };

export default function FiscalNoteActions({ noteId, status }: Props) {
  const [analyzing, setAnalyzing]   = useState(false);
  const [applying, setApplying]     = useState(false);
  const [aiResult, setAiResult]     = useState<string | null>(null);
  const [error, setError]           = useState("");
  const router = useRouter();

  async function handleAnalyze() {
    setAnalyzing(true); setError(""); setAiResult(null);
    const res = await fetch("/api/fiscal/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note_id: noteId }) });
    const json = await res.json();
    setAnalyzing(false);
    if (json.error) { setError(json.error); return; }
    setAiResult(json.resumo ?? `Risco geral: ${json.overall_risk}. ${json.suggestions?.join(" ") ?? ""}`);
    router.refresh();
  }

  async function handleApply() {
    setApplying(true); setError("");
    const res = await fetch("/api/fiscal/apply-stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note_id: noteId }) });
    const json = await res.json();
    setApplying(false);
    if (json.error) { setError(json.error); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex gap-2">
        <button onClick={handleAnalyze} disabled={analyzing} className="ag-button-secondary text-sm disabled:opacity-60">
          {analyzing ? "Analisando…" : "Analisar com IA"}
        </button>
        <button onClick={handleApply} disabled={applying || status === "validada"} className="ag-button-primary text-sm disabled:opacity-60">
          {applying ? "Aplicando…" : status === "validada" ? "Aplicado ✓" : "Aplicar ao estoque"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {aiResult && (
        <div className="max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">IA Fiscal: </span>{aiResult}
        </div>
      )}
    </div>
  );
}
