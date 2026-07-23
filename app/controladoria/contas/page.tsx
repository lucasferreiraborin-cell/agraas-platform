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
  subtype: string | null;
  parent_id: string | null;
  is_active: boolean | null;
};

// accounting_entries: partida dobrada. UM `amount` + duas contas (FK).
// Não existem account_code/account_name/debit_amount/credit_amount/entry_type.
type Entry = {
  id: string;
  entry_date: string | null;
  description: string | null;
  amount: number | null;
  debit_account_id: string | null;
  credit_account_id: string | null;
  source_type: string | null;
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

  // Plano de contas. Colunas reais: `subtype` (não account_type) e `parent_id`
  // (não parent_code). Sem elas a query inteira falhava e a lista vinha vazia.
  let accounts: Account[] = [];
  {
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name, nature, subtype, parent_id, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(300);
    if (error) console.error("[controladoria/contas] chart_of_accounts:", error);
    accounts = (data ?? []) as Account[];
  }

  // Lookup id → {code,name} das contas para resolver débito/crédito dos
  // lançamentos sem precisar de join custoso (contas já carregadas em memória).
  const accountById = new Map<string, { code: string | null; name: string | null }>();
  for (const a of accounts) accountById.set(a.id, { code: a.code, name: a.name });

  // Lançamentos últimos 30d (partida dobrada: amount + FKs débito/crédito).
  let entries: Entry[] = [];
  if (tab === "lancamentos") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const isoCutoff = cutoff.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("accounting_entries")
      .select(
        "id, entry_date, description, amount, debit_account_id, credit_account_id, source_type, source_id",
      )
      .gte("entry_date", isoCutoff)
      .order("entry_date", { ascending: false })
      .limit(200);
    if (error) console.error("[controladoria/contas] accounting_entries:", error);
    entries = (data ?? []) as Entry[];
  }

  // Saldo por conta (id): a conta debitada soma +amount; a creditada, -amount.
  const balanceByAccountId = new Map<string, number>();
  for (const e of entries) {
    const amt = Number(e.amount ?? 0);
    if (e.debit_account_id) {
      balanceByAccountId.set(
        e.debit_account_id,
        (balanceByAccountId.get(e.debit_account_id) ?? 0) + amt,
      );
    }
    if (e.credit_account_id) {
      balanceByAccountId.set(
        e.credit_account_id,
        (balanceByAccountId.get(e.credit_account_id) ?? 0) - amt,
      );
    }
  }

  // Rótulo "código · nome" de uma conta a partir do id (para colunas Déb/Créd).
  const accountLabel = (accountId: string | null): string => {
    if (!accountId) return "—";
    const a = accountById.get(accountId);
    if (!a) return "—";
    return [a.code, a.name].filter(Boolean).join(" · ") || "—";
  };

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
                  const saldo = balanceByAccountId.get(a.id) ?? null;
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
                        {typeLabel(a.subtype)}
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
                  <th>Histórico</th>
                  <th>Débito</th>
                  <th>Crédito</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-sm">{formatDate(e.entry_date)}</td>
                    <td
                      className="max-w-[240px] truncate text-sm text-[var(--text-secondary)]"
                      title={e.description ?? ""}
                    >
                      {e.description ?? "—"}
                    </td>
                    <td className="text-sm text-[var(--primary-hover)]">
                      {accountLabel(e.debit_account_id)}
                    </td>
                    <td className="text-sm text-amber-700">
                      {accountLabel(e.credit_account_id)}
                    </td>
                    <td className="text-right tabular-nums text-sm font-medium">
                      {e.amount == null || Number(e.amount) === 0 ? (
                        <span className="text-[var(--text-muted)]">—</span>
                      ) : (
                        `R$ ${Number(e.amount).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}`
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

// Traduz `chart_of_accounts.subtype` (opex, cogs, ppe, ...) para PT.
// Mantém os antigos rótulos de classe como fallback e devolve o valor cru
// quando não mapeado — sempre renderiza dado real, nunca vazio.
function typeLabel(t: string | null | undefined): string {
  const map: Record<string, string> = {
    // subtypes reais do plano de contas
    current_asset: "Ativo circulante",
    non_current_asset: "Ativo não circulante",
    biological: "Ativo biológico",
    inventory: "Estoque",
    receivable: "Contas a receber",
    financial: "Financeiro",
    ppe: "Imobilizado",
    animal_purchase: "Compra de animais",
    current_liability: "Passivo circulante",
    non_current_liability: "Passivo não circulante",
    payable: "Contas a pagar",
    loan: "Empréstimos",
    tax_payable: "Tributos a recolher",
    tax_credit: "Créditos tributários",
    equity_capital: "Capital social",
    equity_adjustment: "Ajuste de patrimônio",
    reserve: "Reservas",
    retained: "Lucros acumulados",
    fair_value_change: "Variação valor justo",
    sales_revenue: "Receita de vendas",
    other_revenue: "Outras receitas",
    revenue_deduction: "Deduções de receita",
    cogs: "CMV",
    opex: "Despesas operacionais",
    // fallback: classes antigas
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
    // valores reais de chart_of_accounts.nature (classe contábil)
    asset: { label: "Ativo", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    liability: { label: "Passivo", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    equity: { label: "Patrimônio", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    revenue: { label: "Receita", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    expense: { label: "Despesa", cls: "bg-red-50 text-red-700 border-red-200" },
    cost: { label: "Custo", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    // fallback devedora/credora
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
