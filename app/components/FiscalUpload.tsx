"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle, FileX } from "lucide-react";

export default function FiscalUpload() {
  const [dragging, setDragging]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [result, setResult]           = useState<{ note_id: string; numero_nota: string; total_items: number; alerts_count: number; status: string } | null>(null);
  const [error, setError]             = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  async function uploadFile(file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xml") && !name.endsWith(".pdf")) {
      setError("Formato não suportado. Envie um arquivo .xml ou .pdf.");
      return;
    }

    // Feedback imediato — antes mesmo do fetch iniciar
    setLoading(true);
    setError("");
    setResult(null);
    setCurrentFile(file.name);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const form = new FormData();
      form.append("xml", file);
      const res = await fetch("/api/fiscal/parse-xml", { method: "POST", body: form, signal: controller.signal });
      if (!res.ok) {
        let msg = "Erro ao processar arquivo.";
        try { const j = await res.json(); msg = j.error ?? msg; } catch { /* plain text */ }
        setError(msg);
        return;
      }
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setResult(json);
      router.refresh();
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") {
        setError("Tempo limite excedido (30s). Tente novamente.");
      } else {
        setError("Erro de conexão. Verifique sua rede e tente novamente.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  const isPdf = currentFile?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        style={{ minHeight: "160px" }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 text-center transition ${
          dragging
            ? "border-[var(--primary)] bg-[var(--primary-soft)]"
            : loading
              ? "cursor-default border-[var(--border)] bg-[var(--surface-soft)]"
              : "border-[var(--primary)]/40 hover:border-[var(--primary)] hover:bg-emerald-50/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xml,.pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />

        {loading ? (
          <>
            <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {isPdf ? "Extraindo dados do PDF com IA…" : "Processando XML…"}
              </p>
              {currentFile && (
                <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate max-w-[240px]">{currentFile}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
              <Upload size={22} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">Arraste o XML ou PDF da NF-e aqui</p>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">ou clique para selecionar • aceita .xml e .pdf</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <FileX size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-4">
          <CheckCircle size={20} className="shrink-0 text-emerald-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              NF-e nº {result.numero_nota} importada com sucesso
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {result.total_items} {result.total_items === 1 ? "item" : "itens"} •{" "}
              {result.alerts_count > 0 ? (
                <span className="text-amber-600">{result.alerts_count} alerta{result.alerts_count > 1 ? "s" : ""}</span>
              ) : (
                <span className="text-emerald-600">sem alertas</span>
              )}
            </p>
          </div>
          <button onClick={() => router.push(`/fiscal/${result.note_id}`)} className="ag-button-primary shrink-0">
            Ver nota
          </button>
        </div>
      )}
    </div>
  );
}
