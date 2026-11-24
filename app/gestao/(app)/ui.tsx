import Link from "next/link";
import type { ReactNode } from "react";

/** Componentes visuais do Agraas Gestão — simples, densos, legíveis no celular. */

export function Titulo({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2rem]">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-[.9rem] text-[var(--text-secondary)]">{subtitulo}</p>}
      </div>
      {acao && <div className="flex shrink-0 flex-wrap gap-2">{acao}</div>}
    </div>
  );
}

type Tom = "neutro" | "verde" | "alerta" | "perigo";
const TOM_TEXTO: Record<Tom, string> = {
  neutro: "text-[var(--text-primary)]",
  verde: "text-[var(--primary)]",
  alerta: "text-[#8a6208]",
  perigo: "text-[var(--danger)]",
};

export function Kpi({ rotulo, valor, detalhe, tom = "neutro", href }: {
  rotulo: string; valor: string; detalhe?: string; tom?: Tom; href?: string;
}) {
  const corpo = (
    <div className="h-full min-w-0 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] transition sm:p-5">
      <p className="text-[.74rem] font-medium text-[var(--text-muted)]">{rotulo}</p>
      <p className={`mt-1.5 truncate text-[clamp(1.05rem,5vw,1.4rem)] font-semibold tracking-[-0.03em] tabular-nums sm:text-[1.65rem] ${TOM_TEXTO[tom]}`} title={valor}>{valor}</p>
      {detalhe && <p className="mt-1 text-[.78rem] text-[var(--text-muted)]">{detalhe}</p>}
    </div>
  );
  return href ? <Link href={href} className="block rounded-3xl transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">{corpo}</Link> : corpo;
}

export function Cartao({ titulo, acao, children, className = "" }: {
  titulo?: string; acao?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)] ${className}`}>
      {(titulo || acao) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
          {titulo && <h2 className="text-[.95rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{titulo}</h2>}
          {acao}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-6 py-12 text-center">
      <p className="text-[.95rem] font-semibold text-[var(--text-primary)]">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-[.85rem] text-[var(--text-muted)]">{texto}</p>
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}

export function EmAtivacao({ modulo }: { modulo: string }) {
  return (
    <Vazio
      titulo={`${modulo} em ativação`}
      texto="Este módulo está sendo ligado à sua conta. Volte em instantes."
    />
  );
}

const SELO: Record<Tom, string> = {
  neutro: "bg-black/5 text-[var(--text-secondary)]",
  verde: "bg-[var(--primary-soft)] text-[var(--primary-hover)]",
  alerta: "bg-amber-100 text-amber-800",
  perigo: "bg-red-100 text-red-700",
};
export function Selo({ children, tom = "neutro" }: { children: ReactNode; tom?: Tom }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${SELO[tom]}`}>{children}</span>;
}

export function BotaoLink({ href, children, primario = false }: { href: string; children: ReactNode; primario?: boolean }) {
  return (
    <Link
      href={href}
      className={primario
        ? "inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-[.85rem] font-semibold text-white shadow-[var(--shadow-green)] transition hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        : "inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white px-5 py-2.5 text-[.85rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"}
    >
      {children}
    </Link>
  );
}

export const btnPrimario =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-[.85rem] font-semibold text-white shadow-[var(--shadow-green)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";
export const btnSecundario =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-white px-5 py-2.5 text-[.85rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";
export const campo =
  "w-full rounded-2xl border border-[var(--border-strong)] bg-white px-3.5 py-3 text-[1rem] sm:text-[.9rem] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
export const rotuloCampo = "mb-1.5 block text-[.78rem] font-semibold text-[var(--text-secondary)]";

/** Tabela responsiva: rola na horizontal no celular sem estourar a página. */
export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] text-left text-[.85rem]">{children}</table>
    </div>
  );
}
export const th = "border-b border-[var(--border)] px-3 py-2.5 text-[.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]";
export const td = "border-b border-[var(--border)] px-3 py-3 align-middle text-[var(--text-primary)]";
