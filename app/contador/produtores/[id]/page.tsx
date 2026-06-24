/**
 * Contador — Dossiê fiscal de produtor vinculado.
 *
 * Balancete simplificado + NF-e recentes + link de exportação LCDPR.
 * Só acessível por admin ou quando vínculo partners_accountants existir.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
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
  invoice_number: string | null;
  emission_date: string | null;
  total_amount: number | null;
  direction: string | null;
  status: string | null;
};

type EntryRow = {
  id: string;
  entry_date: string | null;
  account_code: string | null;
  account_name: string | null;
  debit_amount: number | null;
  credit_amount: number | null;
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
      .eq("accountant_client_id", ctx.clientId)
      .eq("producer_client_id", producerId)
      .eq("status", "active")
      .single();
    if (!link) redirect("/contador");
  }

  // Dados do produtor
  const { data: producer } = await db
    .from("clients")
    .select("id, name, email")
    .eq("id", producerId)
    .single();
  if (!producer) notFound();

  // NF-e recentes (30 dias)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const isoCutoff = cutoff.toISOString().split("T")[0];

  let invoices: InvoiceRow[] = [];
  try {
    const { data } = await db
      .from("fiscal_invoices")
      .select("id, invoice_number, emission_date, total_amount, direction, status")
      .eq("client_id", producerId)
      .gte("emission_date", isoCutoff)
      .order("emission_date", { ascending: false })
      .limit(50);
    invoices = (data ?? []) as InvoiceRow[];
  } catch {
    invoices = [];
  }

  // Lançamentos (balancete últimos 30d)
  let entries: EntryRow[] = [];
  try {
    const { data } = await db
      .from("accounting_entries")
      .select("id, entry_date, account_code, account_name, debit_amount, credit_amount")
      .eq("client_id", producerId)
      .gte("entry_date", isoCutoff)
      .order("entry_date", { ascending: false })
      .limit(100);
    entries = (data ?? []) as EntryRow[];
  } catch {
    entries = [];
  }

  // FUNRURAL mês corrente
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().split("T")[0];
  const funruralMes = invoices
    .filter(
      (i) =>
        i.direction === "outbound" &&
        i.emission_date &&
        i.emission_date >= monthStartIso,
    )
    .reduce((s, i) => s + Number(i.total_amount ?? 0) * 0.015, 0);

  // Totais balancete
  const totalDebitos = entries.reduce((s, e) => s + Number(e.debit_amount ?? 0), 0);
  const totalCreditos = entries.reduce((s, e) => s + Number(e.credit_amount ?? 0), 0);

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
            label="FUNRURAL (mês)"
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
                        {inv.invoice_number ?? inv.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-3 text-white/75">
                        {formatDate(inv.emission_date)}
                      </td>
                      <td className="px-6 py-3 text-white/75">
                        {inv.direction === "inbound"
                          ? "Entrada"
                          : inv.direction === "outbound"
                          ? "Saída"
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-white/85">
                        {inv.total_amount == null
                          ? "—"
                          : fmt(Number(inv.total_amount))}
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
                      <th className="px-6 py-3">Conta</th>
                      <th className="px-6 py-3 text-right">Débito</th>
                      <th className="px-6 py-3 text-right">Crédito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr
                        key={e.id}
                        className="border-t border-white/6 hover:bg-white/3"
                      >
                        <td className="px-6 py-3 text-white/75">
                          {formatDate(e.entry_date)}
                        </td>
                        <td className="px-6 py-3 text-white/85">
                          {e.account_code && (
                            <span className="text-white/45 font-mono text-xs mr-1">
                              {e.account_code}
                            </span>
                          )}
                          {e.account_name ?? "—"}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-white/85">
                          {e.debit_amount && Number(e.debit_amount) > 0
                            ? fmt(Number(e.debit_amount))
                            : "—"}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-white/85">
                          {e.credit_amount && Number(e.credit_amount) > 0
                            ? fmt(Number(e.credit_amount))
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-white/3">
                <span className="text-xs text-white/55">Total</span>
                <div className="flex items-center gap-8">
                  <span className="text-sm text-white/85">
                    Déb: <strong className="text-white">{fmt(totalDebitos)}</strong>
                  </span>
                  <span className="text-sm text-white/85">
                    Créd: <strong className="text-white">{fmt(totalCreditos)}</strong>
                  </span>
                </div>
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
