import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-5xl shadow-[var(--shadow-soft)]">
        🐾
      </div>

      <div className="ag-badge ag-badge-green mt-8">Página não encontrada</div>

      <h1 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]">
        404
      </h1>

      <p className="mt-4 max-w-sm text-base leading-7 text-[var(--text-secondary)]">
        Esta página não existe na plataforma Agraas. Verifique o endereço ou volte ao início.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="ag-button-primary">
          Voltar ao painel
        </Link>
        <Link href="/animais" className="ag-button-secondary">
          Ver animais
        </Link>
      </div>
    </main>
  );
}
