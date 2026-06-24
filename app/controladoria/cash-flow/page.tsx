/**
 * Controladoria — Cash flow.
 *
 * Gráfico de barras entradas vs saídas últimos 12 meses (via fiscal_invoices
 * agrupadas por mês) + tabela cash_flow_projections para os próximos meses.
 *
 * Server Component. Chart delegado a CashFlowChart (client).
 * Defensivo: tabelas podem não existir ainda.
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { TrendingUp, TrendingDown, DollarSign, CalendarClock } from "lucide-react";
import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

// Recharts chart — client-only
const CashFlowChart = dynamicImport(
  () => import("@/app/components/controladoria/CashFlowChart"),
  { ssr: false },
);

type MonthBucket = {
  month: string;       // "YYYY-MM"
  entradas: number;
  saidas: number;
  saldo: number;
};

type Projection = {
  id: string;
  projection_month: string | null;
  projected_inflow: number | null;
  projected_outflow: number | null;
  notes: string | null;
};

function monthLabel(ym: string): string {
  // "2025-03" → "Mar/25"
  const [y, m] = ym.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const idx = parseInt(m, 10) - 1;
  return `${months[idx] ?? m}/${y.slice(2)}`;
}

export default async function CashFlowPage() {
  const supabase = await createSupabaseServerClient();

  // ── Histórico 12 meses via fiscal_invoices ────────────────────────────────
  const cutoff12 = new Date();
  cutoff12.setMonth(cutoff12.getMonth() - 11);
  cutoff12.setDate(1);
  const isoCutoff = cutoff12.toISOString().split("T")[0];

  type InvoiceRow = {
    emission_date: string | null;
    total_amount: number | null;
    direction: string | null;
  };

  let invoices: InvoiceRow[] = [];
  try {
    const { data } = await supabase
      .from("fiscal_invoices")
      .select("emission_date, total_amount, direction")
      .gte("emission_date", isoCutoff)
      .not("total_amount", "is", null);
    invoices = (data ?? []) as InvoiceRow[];
  } catch {
    invoices = [];
  }

  // Agrupa por mês
  const buckets = new Map<string, { entradas: number; saidas: number }>();
  for (const inv of invoices) {
    if (!inv.emission_date) continue;
    const ym = inv.emission_date.slice(0, 7); // "YYYY-MM"
    if (!buckets.has(ym)) buckets.set(ym, { entradas: 0, saidas: 0 });
    const bucket = buckets.get(ym)!;
    const amount = Number(inv.total_amount ?? 0);
    if (inv.direction === "inbound") bucket.entradas += amount;
    else if (inv.direction === "outbound") bucket.saidas += amount;
  }

  // Preenche todos os 12 meses (mesmo sem dados)
  const allMonths: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    allMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  let saldoAcum = 0;
  const chartData: MonthBucket[] = allMonths.map((ym) => {
    const b = buckets.get(ym) ?? { entradas: 0, saidas: 0 };
    saldoAcum += b.entradas - b.saidas;
    return { month: monthLabel(ym), entradas: b.entradas, saidas: b.saidas, saldo: saldoAcum };
  });

  const hasHistory = invoices.length > 0;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalEntradas = chartData.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = chartData.reduce((s, m) => s + m.saidas, 0);
  const saldoFinal = totalEntradas - totalSaidas;

  // ── Projeções ─────────────────────────────────────────────────────────────
  let projections: Projection[] = [];
  const todayIso = new Date().toISOString().split("T")[0];
  try {
    const { data } = await supabase
      .from("cash_flow_projections")
      .select("id, projection_month, projected_inflow, projected_outflow, notes")
      .gte("projection_month", todayIso)
      .order("projection_month", { ascending: true })
      .limit(12);
    projections = (data ?? []) as Projection[];
  } catch {
    projections = [];
  }

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Controladoria · Cash flow"
        title="Fluxo de caixa"
        description="Entradas e saídas dos últimos 12 meses por NF-e processadas, com projeção futura."
      />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Receita bruta 12m"
          value={hasHistory ? fmt(totalEntradas) : "—"}
          sub={hasHistory ? "NF-e de entrada" : "Aguardando dados fiscais"}
          icon={TrendingUp}
          tone="positive"
        />
        <KpiCard
          label="Despesas 12m"
          value={hasHistory ? fmt(totalSaidas) : "—"}
          sub={hasHistory ? "NF-e de saída" : "Aguardando dados fiscais"}
          icon={TrendingDown}
          tone={totalSaidas > totalEntradas ? "warning" : "default"}
        />
        <KpiCard
          label="Saldo acumulado"
          value={hasHistory ? fmt(saldoFinal) : "—"}
          sub={hasHistory ? "Receita − despesas" : "Aguardando dados fiscais"}
          icon={DollarSign}
          tone={saldoFinal >= 0 ? "positive" : "danger"}
        />
        <KpiCard
          label="Projeções futuras"
          value={projections.length > 0 ? `${projections.length} meses` : "—"}
          sub={projections.length > 0 ? "Cenário base" : "Sem projeções cadastradas"}
          icon={CalendarClock}
        />
      </section>

      {/* Gráfico */}
      <section className="ag-card-strong p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Entradas vs Saídas — últimos 12 meses</h2>
            <p className="ag-section-subtitle">
              Barras: entradas (verde) e saídas (âmbar). Linha tracejada: saldo acumulado.
            </p>
          </div>
        </div>
        {hasHistory ? (
          <CashFlowChart data={chartData} />
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Sem histórico fiscal ainda"
            text="Importe NF-e no módulo Notas para gerar o gráfico de fluxo de caixa."
          />
        )}
      </section>

      {/* Projeções */}
      <section className="ag-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="ag-section-title">Projeções</h2>
          <p className="ag-section-subtitle">Cenário base para os próximos meses.</p>
        </div>
        {projections.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={CalendarClock}
              title="Sem projeções cadastradas"
              text="As projeções de caixa serão exibidas aqui quando geradas a partir do histórico fiscal."
            />
          </div>
        ) : (
          <table className="ag-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th className="text-right">Entrada prevista</th>
                <th className="text-right">Saída prevista</th>
                <th className="text-right">Saldo previsto</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => {
                const inflow = Number(p.projected_inflow ?? 0);
                const outflow = Number(p.projected_outflow ?? 0);
                const net = inflow - outflow;
                return (
                  <tr key={p.id}>
                    <td className="font-medium">
                      {p.projection_month
                        ? monthLabel(p.projection_month.slice(0, 7))
                        : "—"}
                    </td>
                    <td className="text-right tabular-nums text-[var(--primary-hover)]">
                      {fmt(inflow)}
                    </td>
                    <td className="text-right tabular-nums text-amber-700">
                      {fmt(outflow)}
                    </td>
                    <td
                      className={`text-right tabular-nums font-semibold ${
                        net >= 0 ? "text-[var(--primary-hover)]" : "text-red-600"
                      }`}
                    >
                      {net >= 0 ? "" : "-"}
                      {fmt(Math.abs(net))}
                    </td>
                    <td className="text-sm text-[var(--text-secondary)]">
                      {p.notes ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
