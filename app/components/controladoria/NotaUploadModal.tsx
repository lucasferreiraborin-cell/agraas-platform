"use client";

/**
 * NotaUploadModal — modal multi-modo para subir NF-e.
 *
 * Quatro modos:
 *  1. XML       (default) — drop XML da SEFAZ, parser determinístico
 *  2. PDF                 — drop PDF (DANFE), extração via IA
 *  3. Áudio               — ditado por voz, transcrição + extração
 *  4. CSV em lote         — planilha consolidada, batch ingest
 *
 * Hierarquia visual: tabs no topo, área de drop dominante no centro,
 * dica contextual abaixo. Default = XML porque é o caminho mais
 * confiável (sem IA, sem ambiguidade) e mais rápido.
 *
 * Sprint G1 entrega a casca; integrações reais (POST /api/controladoria/
 * notas/upload-xml etc.) entram no Sprint G2.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  FileCode2,
  FileText,
  Mic,
  Table2,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Square,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Mode = "xml" | "pdf" | "audio" | "csv";

type ModeConfig = {
  id: Mode;
  label: string;
  short: string;
  icon: LucideIcon;
  accept: string;
  title: string;
  hint: string;
  endpoint: string;
};

const MODES: ModeConfig[] = [
  {
    id: "xml",
    label: "XML da NF-e",
    short: "XML",
    icon: FileCode2,
    accept: ".xml",
    title: "Arraste o XML autorizado da SEFAZ",
    hint: "Parser determinístico · sem IA · classificação imediata.",
    endpoint: "/api/controladoria/notas/upload-xml",
  },
  {
    id: "pdf",
    label: "PDF (DANFE)",
    short: "PDF",
    icon: FileText,
    accept: ".pdf",
    title: "Arraste o DANFE em PDF",
    hint: "Extração via IA · revisão humana obrigatória antes de aplicar ao estoque.",
    endpoint: "/api/controladoria/notas/upload-pdf",
  },
  {
    id: "audio",
    label: "Ditado",
    short: "Áudio",
    icon: Mic,
    accept: "audio/*",
    title: "Grave ou anexe um áudio descrevendo a nota",
    hint: "Útil em campo · transcrição + extração via IA · revisão obrigatória.",
    endpoint: "/api/controladoria/notas/upload-audio",
  },
  {
    id: "csv",
    label: "CSV em lote",
    short: "CSV",
    icon: Table2,
    accept: ".csv,.xlsx",
    title: "Arraste a planilha de notas",
    hint: "Lote consolidado · use o modelo Agraas para evitar rejeição.",
    endpoint: "/api/controladoria/notas/upload-csv",
  },
];

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "recording" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function NotaUploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("xml");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const router = useRouter();

  const current = MODES.find((m) => m.id === mode)!;

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setMode("xml");
      setStatus({ kind: "idle" });
      setDragging(false);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function uploadFile(file: File) {
    setStatus({ kind: "uploading", fileName: file.name });
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", current.id);

      const res = await fetch(current.endpoint, { method: "POST", body: form });

      if (!res.ok) {
        // Backend ainda não existe — degrade gracioso com mensagem clara.
        if (res.status === 404) {
          setStatus({
            kind: "error",
            message:
              "Endpoint ainda em construção (Sprint G2). Arquivo recebido localmente.",
          });
          return;
        }
        let msg = "Falha ao processar.";
        try {
          const j = await res.json();
          msg = j.error ?? msg;
        } catch {
          /* plain */
        }
        setStatus({ kind: "error", message: msg });
        return;
      }

      const json = await res.json().catch(() => ({}));
      setStatus({
        kind: "success",
        message:
          json.message ?? `Arquivo "${file.name}" recebido e em processamento.`,
      });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        message: (err as Error)?.message ?? "Erro inesperado.",
      });
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `ditado-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        await uploadFile(file);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setStatus({ kind: "recording" });
    } catch {
      setStatus({
        kind: "error",
        message:
          "Não foi possível acessar o microfone. Permita o acesso e tente novamente.",
      });
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  const isUploading = status.kind === "uploading";
  const isRecording = status.kind === "recording";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow-strong)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex items-start justify-between border-b border-[var(--border)] px-7 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Controladoria · Notas
            </p>
            <h2
              id="upload-modal-title"
              className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
            >
              Subir NF-e
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
          <div
            role="tablist"
            aria-label="Modo de envio"
            className="flex flex-wrap gap-1"
          >
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => {
                    setMode(m.id);
                    setStatus({ kind: "idle" });
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]"
                      : "text-[var(--text-secondary)] hover:bg-white/70"
                  }`}
                >
                  <Icon size={14} className={active ? "text-[var(--primary)]" : ""} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="px-7 py-6">
          {mode === "audio" ? (
            <AudioStage
              isRecording={isRecording}
              isUploading={isUploading}
              startRecording={startRecording}
              stopRecording={stopRecording}
            />
          ) : (
            <FileDropStage
              current={current}
              dragging={dragging}
              isUploading={isUploading}
              status={status}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClickArea={() => !isUploading && inputRef.current?.click()}
              inputRef={inputRef}
              onPick={(file) => uploadFile(file)}
            />
          )}

          <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
            {current.hint}
          </p>

          {/* ── Feedback ─────────────────────────────────────────────── */}
          {status.kind === "success" && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-4 py-3">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[var(--primary)]"
              />
              <p className="text-sm text-[var(--text-primary)]">
                {status.message}
              </p>
            </div>
          )}
          {status.kind === "error" && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-amber-600"
              />
              <p className="text-sm text-amber-800">{status.message}</p>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-soft)] px-7 py-4">
          <p className="text-xs text-[var(--text-muted)]">
            Modos disponíveis: XML · PDF · Áudio · CSV
          </p>
          <button
            type="button"
            onClick={onClose}
            className="ag-button-secondary"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FileDropStage({
  current,
  dragging,
  isUploading,
  status,
  onDrop,
  onDragOver,
  onDragLeave,
  onClickArea,
  inputRef,
  onPick,
}: {
  current: ModeConfig;
  dragging: boolean;
  isUploading: boolean;
  status: Status;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onClickArea: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
}) {
  const Icon = current.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClickArea}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClickArea();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 text-center transition ${
        dragging
          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
          : isUploading
          ? "cursor-default border-[var(--border)] bg-[var(--surface-soft)]"
          : "border-[var(--primary)]/35 hover:border-[var(--primary)] hover:bg-emerald-50/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={current.accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />

      {isUploading ? (
        <>
          <Loader2 size={26} className="animate-spin text-[var(--primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Processando…
            </p>
            {status.kind === "uploading" && (
              <p className="mt-0.5 max-w-[280px] truncate text-xs text-[var(--text-muted)]">
                {status.fileName}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
            <Icon size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--text-primary)]">
              {current.title}
            </p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              ou clique para selecionar · aceita {current.accept}
            </p>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Upload size={11} />
            Drag &amp; drop suportado
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AudioStage({
  isRecording,
  isUploading,
  startRecording,
  stopRecording,
}: {
  isRecording: boolean;
  isUploading: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[var(--primary)]/35 bg-[var(--surface-soft)] px-8 text-center">
      {isUploading ? (
        <>
          <Loader2 size={26} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Transcrevendo e extraindo dados…
          </p>
        </>
      ) : isRecording ? (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 ring-4 ring-red-500/10">
            <Mic size={22} className="animate-pulse text-red-600" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Gravando…
          </p>
          <button
            type="button"
            onClick={stopRecording}
            className="ag-button-primary inline-flex items-center gap-2"
          >
            <Square size={13} />
            Parar e enviar
          </button>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
            <Mic size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--text-primary)]">
              Ditado por voz
            </p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Útil para registrar uma nota em campo. Fale número, emitente,
              valor e itens.
            </p>
          </div>
          <button
            type="button"
            onClick={startRecording}
            className="ag-button-primary inline-flex items-center gap-2"
          >
            <Mic size={13} />
            Iniciar gravação
          </button>
        </>
      )}
    </div>
  );
}
