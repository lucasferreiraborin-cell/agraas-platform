"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(214,69,69,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle size={24} className="text-red-500" />
        </div>

        <p className="mt-6 font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-red-500">
          Algo deu errado
        </p>
        <h2 className="mt-4 text-[1.75rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
          Ocorreu um erro inesperado.
        </h2>
        <p className="mt-3 text-[.9375rem] leading-[1.7] text-[var(--text-muted)]">
          Nossa equipe foi notificada. Tente novamente ou volte ao início.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-[.75rem] text-[var(--text-muted)]">
            Ref: <span className="text-[var(--text-secondary)]">{error.digest}</span>
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[.875rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)]"
          >
            <RotateCcw size={14} />
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] px-6 py-3 text-[.875rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
          >
            <Home size={14} />
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
