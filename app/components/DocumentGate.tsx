"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, FileCheck, AlertTriangle, Lock } from "lucide-react";

export type ParsedDoc = {
  header: {
    numero_nota:       string;
    emitente_nome:     string;
    emitente_cnpj:     string;
    data_emissao:      string;
    valor_total:       number;
    destinatario_nome: string;
    destinatario_cnpj: string;
  };
  items: {
    descricao:      string;
    quantidade:     number;
    unidade:        string;
    valor_unitario: number;
    valor_total:    number;
  }[];
  ia_failed?: boolean;
};

export type GateMode = "idle" | "uploading" | "verified" | "manual";

interface DocumentGateProps {
  /** API endpoint — deve aceitar POST com FormData contendo campo "xml" */
  endpoint?: string;
  /** Modo atual — controlado pelo componente pai */
  mode: GateMode;
  /** Texto resumido mostrado no banner verde após parse bem-sucedido */
  verifiedSummary?: string;
  /** Chamado com dados do documento após parse bem-sucedido */
  onParsed: (data: ParsedDoc) => void;
  /** Chamado quando usuário escolhe inserção manual */
  onManual: () => void;
  /** Chamado quando usuário quer trocar o documento (volta para idle) */
  onReset: () => void;
  /** Conteúdo do formulário — exibido apenas quando mode === 'verified' ou 'manual' */
  children: React.ReactNode;
}

/**
 * DocumentGate — wrapper que bloqueia o formulário até um documento
 * NF-e (XML/PDF) ser processado.
 *
 * Estados:
 *  idle      → mostra área de upload + botão "Inserir manualmente"
 *  uploading → spinner enquanto API processa
 *  verified  → banner verde + formulário com campos pré-preenchidos
 *  manual    → banner amarelo "Dado não verificado" + formulário editável
 */
export default function DocumentGate({
  endpoint = "/api/parse-doc",
  mode,
  verifiedSummary,
  onParsed,
  onManual,
  onReset,
  children,
}: DocumentGateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    // sinaliza uploading via onParsed com objeto especial — o pai deve
    // setar mode = "uploading" imediatamente, mas a gestão de estado
    // fica no pai. Aqui disparamos o upload e chamamos onParsed ao final.
    const form = new FormData();
    form.append("xml", file);
    try {
      const res  = await fetch(endpoint, { method: "POST", body: form });
      const json = await res.json();
      if (res.ok) {
        onParsed(json as ParsedDoc);
      } else {
        setUploadError(json.error ?? "Erro ao processar documento");
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch {
      setUploadError("Erro de conexão");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Área de upload (idle ou uploading) ── */}
      {(mode === "idle" || mode === "uploading") && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-6 space-y-4">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              Documento NF-e
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Importe um arquivo .xml ou .pdf para preencher os campos automaticamente
            </p>
          </div>

          <label
            className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed px-5 py-4 transition ${
              mode === "uploading"
                ? "opacity-60 pointer-events-none border-[var(--border)]"
                : "border-[var(--primary)]/30 hover:border-[var(--primary)]/60 hover:bg-[var(--primary-soft)]"
            }`}
          >
            {mode === "uploading"
              ? <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
              : <Upload size={18} className="text-[var(--primary)]" />
            }
            <span className="text-sm font-medium text-[var(--primary-hover)]">
              {mode === "uploading"
                ? "Processando documento…"
                : "Clique para selecionar arquivo .xml ou .pdf"
              }
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".xml,.pdf"
              className="hidden"
              onChange={handleFile}
              disabled={mode === "uploading"}
            />
          </label>

          {uploadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          <button
            type="button"
            onClick={onManual}
            className="text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text-secondary)] transition"
          >
            Inserir manualmente (sem documento)
          </button>
        </div>
      )}

      {/* ── Banner verde: documento verificado ── */}
      {mode === "verified" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <FileCheck size={18} className="mt-0.5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700">
              Documento verificado
            </p>
            {verifiedSummary && (
              <p className="text-xs text-emerald-600 mt-0.5 truncate">{verifiedSummary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-xs text-emerald-600 underline underline-offset-2 hover:text-emerald-700 transition"
          >
            Trocar
          </button>
        </div>
      )}

      {/* ── Banner amarelo: inserção manual ── */}
      {mode === "manual" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-700">
            Inserção manual — campos sem documento verificado receberão badge
            &ldquo;Dado não verificado&rdquo;
          </p>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-xs text-amber-600 underline underline-offset-2 hover:text-amber-700 transition"
          >
            Usar documento
          </button>
        </div>
      )}

      {/* ── Formulário — só aparece após gate resolvido ── */}
      {(mode === "verified" || mode === "manual") && children}
    </div>
  );
}

// ── Subcomponentes de campo ─────────────────────────────────────────────────

/** Campo bloqueado: veio do documento. Fundo verde claro + ícone cadeado. */
export function LockedField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
        <Lock size={11} className="shrink-0 text-emerald-500" />
        <span className="font-medium text-emerald-700 truncate">{value}</span>
      </div>
    </div>
  );
}

/** Badge "Dado não verificado" — usado em listagens e passaporte. */
export function UnverifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 whitespace-nowrap">
      <AlertTriangle size={9} />
      Dado não verificado
    </span>
  );
}
