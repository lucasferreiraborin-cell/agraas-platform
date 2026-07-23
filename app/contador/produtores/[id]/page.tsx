/**
 * Contador — Dossiê fiscal de produtor vinculado.
 *
 * Balancete simplificado + NF-e recentes + link de exportação LCDPR.
 * Só acessível por admin ou quando vínculo partners_accountants existir.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { funruralValue, funruralRateLabel } from "@/lib/funrural";
import { requirePersona, CONTADOR_ROUTES } from "@/lib/persona-resolver";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  BookOpen,
  FileText,
  Landmark,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type InvoiceRow = {
  id: string;
  number: string | null;
  issued_at: string | null;
  gross_value: number | null;
  direction: string | null;
  status: string | null;
};

// accounting_entries usa partida dobrada: UM `amount` + dois FKs de conta
// (debit_account_id / credit_account_id → chart_of_accounts). Não existem
// colunas debit_amount/credit_amount/account_name — schema drift antigo.
type EntryRow = {
  id: string;
  entry_date: string | null;
  amount: number | null;
  description: string | null;
  debit_account_id: string | null;
  credit_account_id: string | null;
};

export default async function ContadorProdutorPage({ params }: Params) {
  const { id: producerId } = await params;
  const ctx = await requirePersona(CONTADOR_ROUTES);
  const db = createSupabaseServiceClient();

  // Valida vínculo (ou admin)
  if (ctx.realRole !== "admin") {
    const { data: link } = await db
      .from("partners_accountants")
      .select("status")
      .eq("contador_client_id", ctx.clientId)
      .eq("producer_client_id", producerId)
      .eq("status", "active")
      .single();
    if (!link) redirect("/contador");
  }

  // Dados do produtor — inclui campos fiscais para a alíquota FUNRURAL
  // parametrizada (funrural_rate/tax_regime, LC 224/2025).
  const { data: producer } = await db
    .from("clients")
    .select("id, name, email, funrural_rate, tax_regime")
    .eq("id", producerId)
    .single();
  if (!producer) notFound();

  // NF-e recentes (30 dias)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const isoCutoff = cutoff.toISOString().split("T")[0];

  let invoices: InvoiceRow[] = [];
  try {
    const { data, error } = await db
      .from("fiscal_invoices")
      .select("id, number, issued_at, gross_value, direction, status")
      .eq("client_id", producerId)
      .gte("issued_at", isoCutoff)
      .order("issued_at", { ascending: false })
      .limit(50);
    if (error) console.error("[contador/dossie] fiscal_invoices:", error.message);
    invoices = (data ?? []) as unknown as InvoiceRow[];
  } catch {
    invoices = [];
  }

  // Lançamentos (balancete últimos 30d)
  let entries: EntryRow[] = [];
  try {
    const { data, error } = await db
      .from("accounting_entries")
      .select("id, entry_date, amount, description, debit_account_id, credit_account_id")
      .eq("client_id", producerId)
      .gte("entry_date", isoCutoff)
      .order("entry_date", { ascending: false })
      .limit(100);
    if (error) console.error("[contador/dossie] accounting_entries:", error.message);
    entries = (data ?? []) as unknown as EntryRow[];
  } catch {
    entries = [];
  }

  // Nome/código das contas para o balancete: lookup em chart_of_accounts pelos
  // FKs de débito/crédito (partida dobrada). Two-step para não depender de join.
  const accountIds = Array.from(
    new Set(
      entries
        .flatMap((e) => [e.debit_account_id, e.credit_account_id])
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const accountById = new Map<string, { code: string | null; name: string | null }>();
  if (accountIds.length > 0) {
    const { data: accts, error: acctErr } = await db
      .from("chart_of_accounts")
      .select("id, code, name")
      .in("id", accountIds);
    if (acctErr) console.error("[contador/dossie] chart_of_accounts:", acctErr.message);
    for (const a of accts ?? []) {
      accountById.set(a.id, { code: a.code, name: a.name });
    }
  }
  const acctLabel = (id: string | null): string => {
    if (!id) return "—";
    const a = accountById.get(id);
    if (!a) return "—";
    return [a.code, a.name].filter(Boolean).join(" ") || "—";
  };

  // FUNRURAL mês corrente
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().split("T")[0];
  const funruralMes = invoices
    .filter(
      (i) =>
        i.direction === "saida" &&
        i.issued_at &&
        i.issued_at >= monthStartIso,
    )
    .reduce((s, i) => s + funruralValue(Number(i.gross_value ?? 0), producer), 0);
  const funruralLabel = funruralRateLabel(producer);

  // Total lançado no balancete: em partida dobrada cada lançamento tem UM
  // valor (amount) que movimenta uma conta a débito e outra a crédito.
  const totalLancado = entries.reduce((s, e) => s + Number(e.amount ?? 0), 0);

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PersonaShell ctx={ctx}>
      <div className="mx-auto max-w-6xl px-8 py-10">
        <Link
          href="/contador"
          className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white/90 mb-6"
        >
          <ArrowLeft size={14} />
          Portfólio
        </Link>

        {/* Header */}
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">
              Dossiê fiscal · Produtor
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-white">{producer.name}</h1>
            <p className="mt-1.5 text-sm text-white/55">{producer.email}</p>
          </div>
          <a
            href={`/api/export/lcdpr?clientId=${producerId}`}
            target="_blank"
            rel="noopener"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/8 inline-flex items-center gap-2"
          >
            <FileText size={14} />
            Exportar LCDPR
          </a>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <DarkKpi
            label="NF-e últimos 30d"
            value={invoices.length}
            icon={Receipt}
          />
          <DarkKpi
            label={`FUNRURAL (mês) · ${funruralLabel}`}
            value={fmt(funruralMes)}
            icon={Landmark}
          />
          <DarkKpi
            label="Lançamentos 30d"
            value={entries.length}
            icon={BookOpen}
          />
        </div>

        {/* NF-e recentes */}
        <section className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="text-lg font-semibold text-white">NF-e recentes (30 dias)</h2>
            <Receipt size={16} className="text-white/45" />
          </div>
          {invoices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-white/45 text-center">
              Nenhuma NF-e nos últimos 30 dias.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/3">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-white/55">
                    <th className="px-6 py-3">Número</th>
                    <th className="px-6 py-3">Emissão</th>
                    <th className="px-6 py-3">Direção</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-t border-white/6 hover:bg-white/3"
                    >
                      <td className="px-6 py-3 font-medium text-white">
                        {inv.number ?? inv.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-3 text-white/75">
                        {formatDate(inv.issued_at)}
                      </td>
                      <td className="px-6 py-3 text-white/75">
                        {inv.direction === "entrada"
                          ? "Entrada"
                          : inv.direction === "saida"
                          ? "Saída"
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-white/85">
                        {inv.gross_value == null
                          ? "—"
                          : fmt(Number(inv.gross_value))}
                      </td>
                      <td className="px-6 py-3">
                        <StatusDot status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Balancete simplificado */}
        <section className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="text-lg font-semibold text-white">Balancete simplificado (30 dias)</h2>
            <BookOpen size={16} className="text-white/45" />
          </div>
          {entries.length === 0 ? (
            <p className="px-6 py-8 text-sm text-white/45 text-center">
              Nenhum lançamento contábil no período.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/3">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/55">
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Lançamento</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr
                        key={e.id}
                        className="border-t border-white/6 hover:bg-white/3"
                      >
                        <td className="px-6 py-3 align-top text-white/75">
                          {formatDate(e.entry_date)}
                        </td>
                        <td className="px-6 py-3 text-white/85">
                          <div>{e.description ?? "—"}</div>
                          <div className="mt-0.5 text-[11px] text-white/45">
                            <span className="font-mono">D</span> {acctLabel(e.debit_account_id)}
                            {"  ·  "}
                            <span className="font-mono">C</span> {acctLabel(e.credit_account_id)}
                          </div>
                        </td>
                        <td className="px-6 py-3 align-top text-right tabular-nums text-white/85">
                          {e.amount && Number(e.amount) > 0
                            ? fmt(Number(e.amount))
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-white/3">
                <span className="text-xs text-white/55">Total lançado (30 dias)</span>
                <span className="text-sm text-white/85">
                  <strong className="text-white">{fmt(totalLancado)}</strong>
                </span>
              </div>
            </>
          )}
        </section>
      </div>
    </PersonaShell>
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

function StatusDot({ status }: { status: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    pending_review: { label: "Pendente", color: "#F59E0B" },
    reviewed: { label: "Revisada", color: "#10B981" },
    rejected: { label: "Rejeitada", color: "#EF4444" },
  };
  const cfg = map[status ?? ""] ?? { label: status ?? "—", color: "#9CA3AF" };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: cfg.color }}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

function DarkKpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/55">
        <Icon size={12} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
