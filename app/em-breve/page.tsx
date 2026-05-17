import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Em breve",
  description: "Esta área da Agraas está temporariamente fora do caminho crítico. O foco atual é pecuária bovina.",
  robots: { index: false, follow: false },
};

export default function EmBrevePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <div className="max-w-xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
          Em breve
        </p>
        <h1 className="mt-4 text-[2rem] font-semibold tracking-[-.02em] text-[var(--text-primary)] sm:text-[2.4rem]">
          Esta área voltará em breve.
        </h1>
        <p className="mt-5 text-[1rem] leading-7 text-[var(--text-secondary)]">
          O foco atual da Agraas é pecuária bovina. Frentes adjacentes —
          portal de compradores, ovinos/caprinos, aves e agricultura —
          estão temporariamente fora do caminho crítico, mas voltam
          conforme o cronograma evolui.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="ag-button-primary rounded-full px-6 py-3 text-sm font-semibold"
          >
            Voltar para a home
          </Link>
          <Link
            href="/painel"
            className="ag-button-secondary rounded-full px-6 py-3 text-sm font-semibold"
          >
            Ir para o painel
          </Link>
        </div>
      </div>
    </main>
  );
}
