"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="ag-card-strong max-w-md p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
          !
        </div>
        <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">
          Algo deu errado
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={reset} className="ag-button-primary">
            Tentar novamente
          </button>
          <a href="/" className="ag-button-secondary">
            Voltar ao painel
          </a>
        </div>
      </div>
    </div>
  );
}
