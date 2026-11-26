import Link from "next/link";
import type { ReactNode } from "react";

/** Peças visuais do estoque que o ui.tsx compartilhado não tem. */

export type AbaEstoque =
  | "saldos" | "entrada" | "saida" | "movimentacoes" | "tanque" | "produtos" | "almoxarifados" | "categorias" | "precos";

const ABAS: Array<{ chave: AbaEstoque; href: string; rotulo: string }> = [
  { chave: "saldos", href: "/gestao/estoque", rotulo: "Saldos" },
  { chave: "entrada", href: "/gestao/estoque/entrada", rotulo: "Entrada de notas" },
  { chave: "saida", href: "/gestao/estoque/saida", rotulo: "Saídas" },
  { chave: "movimentacoes", href: "/gestao/estoque/movimentacoes", rotulo: "Movimentações" },
  { chave: "tanque", href: "/gestao/estoque/tanque", rotulo: "Conferência do tanque" },
  { chave: "produtos", href: "/gestao/estoque/produtos", rotulo: "Produtos" },
  { chave: "almoxarifados", href: "/gestao/estoque/almoxarifados", rotulo: "Almoxarifados" },
  { chave: "categorias", href: "/gestao/estoque/categorias", rotulo: "Categorias" },
  { chave: "precos", href: "/gestao/estoque/precos", rotulo: "Preços pagos" },
];

/** Seções do estoque. No celular a fileira rola sozinha, sem empurrar a página. */
export function AbasEstoque({ ativo, pendentes }: { ativo: AbaEstoque; pendentes?: number }) {
  return (
    <nav aria-label="Seções do estoque" className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {ABAS.map((a) => {
          const on = a.chave === ativo;
          return (
            <li key={a.chave}>
              <Link
                href={a.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[.82rem] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                  on
                    ? "bg-[var(--primary)] text-white"
                    : "border border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
                }`}
              >
                {a.rotulo}
                {a.chave === "entrada" && pendentes !== undefined && pendentes > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[.7rem] tabular-nums ${on ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"}`}
                    aria-label={`${pendentes} ${pendentes === 1 ? "nota a conferir" : "notas a conferir"}`}
                  >
                    {pendentes}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type TomAviso = "ok" | "erro" | "alerta" | "info";
const TOM_AVISO: Record<TomAviso, string> = {
  ok: "border-[var(--border)] bg-[var(--primary-soft)] text-[var(--primary-hover)]",
  erro: "border-red-200 bg-red-50 text-red-700",
  alerta: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)]",
};

/** Faixa de aviso. `erro` usa role=alert; os demais, status. */
export function Aviso({ tom = "info", children, className = "" }: { tom?: TomAviso; children: ReactNode; className?: string }) {
  return (
    <div role={tom === "erro" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-[.85rem] ${TOM_AVISO[tom]} ${className}`}>
      {children}
    </div>
  );
}

const QTD = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const CUSTO_MIUDO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const CUSTO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Quantidade com até 3 casas ("1.968", "0,125"). */
export function qtd(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "—" : QTD.format(v);
}

/** Quantidade com unidade ("1.968 L"). */
export function qtdUn(v: number | null | undefined, unidade: string | null | undefined): string {
  const q = qtd(v);
  return q === "—" ? q : `${q}${unidade ? ` ${unidade}` : ""}`;
}

/** Custo unitário: centavos a partir de R$ 1; abaixo disso, até 4 casas (R$ 0,0061 por mL). */
export function custoUnit(v: number | null | undefined, unidade?: string | null): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = Math.abs(v) >= 1 ? CUSTO.format(v) : CUSTO_MIUDO.format(v);
  return unidade ? `${s}/${unidade}` : s;
}

/** Quem fez: o próprio usuário, a carga do sistema ou outra pessoa da conta. */
export function rotuloResponsavel(criadoPor: string | null | undefined, userId: string): string {
  if (!criadoPor) return "Sistema";
  return criadoPor === userId ? "Você" : "Outro usuário";
}

/** Barra proporcional decorativa (o número vem sempre em texto ao lado). */
export function Barra({ fracao, tom = "verde" }: { fracao: number; tom?: "verde" | "alerta" | "perigo" }) {
  const p = Math.max(0, Math.min(1, Number.isFinite(fracao) ? fracao : 0));
  const cor = tom === "perigo" ? "bg-[var(--danger)]" : tom === "alerta" ? "bg-amber-500" : "bg-[var(--primary)]";
  return (
    <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.round(p * 1000) / 10}%` }} />
    </div>
  );
}

export const linkTexto =
  "font-semibold text-[var(--primary-hover)] underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";
