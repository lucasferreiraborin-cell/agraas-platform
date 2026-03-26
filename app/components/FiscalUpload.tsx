"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function FiscalUpload() {
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<{ note_id: string; numero_nota: string; total_items: number; alerts_count: number; status: string } | null>(null);
  const [error, setError]         = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(file: File) {
    if (!file.name.endsWith(".xml")) { setError("Apenas arquivos .xml são aceitos."); return; }
    setLoading(true); setError(""); setResult(null);
    const form = new FormData();
    form.append("xml", file);
    const res = await fetch("/api/fiscal/parse-xml", { method: "POST", body: form });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || json.error) { setError(json.error ?? "Erro ao processar XML."); return; }
    setResult(json);
    router.refresh();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-8 py-10 text-center transition ${
          dragging ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-soft)]"
        }`}
      >
        <input ref={inputRef} type="file" accept=".xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Processando XML…</p>
        ) : (
          <>
            <p className="text-[15px] font-medium text-[var(--text-primary)]">Arraste o XML da NF-e aqui</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">ou clique para selecionar o arquivo</p>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="rounded-xl border border-[var(--border)] bg-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">NF-e nº {result.numero_nota} importada</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {result.total_items} {result.total_items === 1 ? "item" : "itens"} •{" "}
              {result.alerts_count > 0 ? (
                <span className="text-amber-600">{result.alerts_count} alerta{result.alerts_count > 1 ? "s" : ""}</span>
              ) : (
                <span className="text-emerald-600">sem alertas</span>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push(`/fiscal/${result.note_id}`)}
            className="ag-button-primary shrink-0"
          >
            Ver nota
          </button>
        </div>
      )}
    </div>
  );
}
