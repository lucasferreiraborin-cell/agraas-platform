/**
 * Controladoria — Plano de contas.
 *
 * Tab 1: Plano de contas (chart_of_accounts) — código, nome, natureza, tipo.
 * Tab 2: Lançamentos contábeis últimos 30 dias (accounting_entries) com saldo
 *        acumulado por conta.
 *
 * Server Component. Filtro de tab via searchParams (?tab=lancamentos).
 * Defensivo: tabelas podem não existir ainda.
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/EmptyState";
import Link from "next/link";
import { BookOpen, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export const dynamic = "force-dynamic";

type Account = {
  id: string;
  code: string | null;
  name: string | null;
  nature: string | null;
  account_type: string | null;
  parent_code: string | null;
  is_active: boolean | null;
};

type Entry = {
  id: string;
  entry_date: string | null;
  description: string | null;
  account_code: string | null;
  account_name: string | null;
  debit_amount: number | null;
  credit_amount: number | null;
  entry_type: string | null;
  source_id: string | null;
};

const TABS = [
  { value: "contas", label: "Plano de contas" },
  { value: "lancamentos", label: "Lançamentos" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "lancamentos" ? "lancamentos" : "contas";

  const supabase = await createSupabaseServerClient();

  // Plano de contas
  let accounts: Account[] = [];
  try {
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name, nature, account_type, parent_code, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(300);
    accounts = (data ?? []) as Account[];
  } catch {
    accounts = [];
  }

  // Lançamentos últimos 30d
  let entries: Entry[] = [];
  if (tab === "lancamentos") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const isoCutoff = cutoff.toISOString().split("T")[0];

    try {
      const { data } = await supabase
        .from("accounting_entries")
        .select(
          "id, entry_date, description, account_code, account_name, debit_amount, credit_amount, entry_type, source_id",
        )
        .gte("entry_date", isoCutoff)
        .order("entry_date", { ascending: false })
        .limit(200);
      entries = (data ?? []) as Entry[];
    } catch {
      entries = [];
    }
  }

  // Saldo por conta = soma débitos - soma créditos
  const balanceByCode = new Map<string, number>();
  for (const e of entries) {
    if (!e.account_code) continue;
    const prev = balanceByCode.get(e.account_code) ?? 0;
    balanceByCode.set(
      e.account_code,
      prev + Number(e.debit_amount ?? 0) - Number(e.credit_amount ?? 0),
    );
  }

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Controladoria · Plano de contas"
        title="Plano de contas"
        description="Estrutura contábil do produtor rural com lançamentos automáticos a partir de NF-e revisadas."
      />

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/controladoria/contas${t.value !== "contas" ? `?tab=${t.value}` : ""}`}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t.value
                ? "border-b-2 border-[var(--primary)] text-[var(--primary-hover)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "contas" ? (
        <section className="ag-card overflow-hidden">
          {accounts.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={BookOpen}
                title="Plano de contas vazio"
                text="O plano de contas padrão Agraas será provisionado quando a migration fiscal estiver aplicada."
              />
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Natureza</th>
                  <th>Tipo</th>
                  <th className="text-right">Saldo 30d</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const saldo = balanceByCode.get(a.code ?? "") ?? null;
                  return (
                    <tr key={a.id}>
                      <td className="font-mono text-sm text-[var(--text-muted)]">
                        {a.code ?? "—"}
                      </td>
                      <td className="font-medium">{a.name ?? "—"}</td>
                      <td>
                        <NatureChip nature={a.nature} />
                      </td>
                      <td className="text-sm text-[var(--text-secondary)]">
                        {typeLabel(a.account_type)}
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {saldo === null ? (
                          <span className="text-[var(--text-muted)]">—</span>
                        ) : (
                          <span
                            className={
                              saldo >= 0 ? "text-[var(--primary-hover)]" : "text-red-600"
                            }
                          >
                            {saldo >= 0 ? "" : "-"}R${" "}
                            {Math.abs(saldo).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className="ag-card overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={ArrowDownToLine}
                title="Sem lançamentos nos últimos 30 dias"
                text="Lançamentos são gerados automaticamente quando uma NF-e é aprovada na revisão."
              />
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Conta</th>
                  <th>Descrição</th>
                  <th className="text-right">Débito</th>
                  <th className="text-right">Crédito</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-sm">{formatDate(e.entry_date)}</td>
                    <td>
                      {e.account_code && (
                        <span className="text-xs font-mono text-[var(--text-muted)] mr-1">
                          {e.account_code}
                        </span>
                      )}
                      <span className="text-sm">{e.account_name ?? "—"}</span>
                    </td>
                    <td
                      className="max-w-[220px] truncate text-sm text-[var(--text-secondary)]"
                      title={e.description ?? ""}
                    >
                      {e.description ?? "—"}
                    </td>
                    <td className="text-right tabular-nums text-sm">
                      {e.debit_amount && Number(e.debit_amount) > 0 ? (
                        <span className="text-[var(--primary-hover)]">
                          R${" "}
                          {Number(e.debit_amount).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums text-sm">
                      {e.credit_amount && Number(e.credit_amount) > 0 ? (
                        <span className="text-amber-700">
                          R${" "}
                          {Number(e.credit_amount).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td>
                      {e.entry_type ? (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {e.entry_type}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function typeLabel(t: string | null | undefined): string {
  const map: Record<string, string> = {
    asset: "Ativo",
    liability: "Passivo",
    equity: "Patrimônio",
    revenue: "Receita",
    expense: "Despesa",
  };
  if (!t) return "—";
  return map[t] ?? t;
}

function NatureChip({ nature }: { nature: string | null | undefined }) {
  if (!nature) return <span className="text-sm text-[var(--text-muted)]">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    devedora: { label: "Devedora", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    credora: { label: "Credora", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    debit: { label: "Devedora", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    credit: { label: "Credora", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const cfg = map[nature.toLowerCase()] ?? {
    label: nature,
    cls: "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
