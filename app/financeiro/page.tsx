import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DollarSign } from "lucide-react";
import FinanceiroTabs from "@/app/components/financeiro/FinanceiroTabs";
import type { FinanceiroData } from "@/app/components/financeiro/FinanceiroTabs";
import type { MonthRow, CashRow } from "@/app/components/financeiro/FinanceiroCharts";

type SaleRow = { sale_date: string | null; total_value: number | null; weight_kg: number | null; roi: number | null };
type CostRow = { animal_id: string; total_input_cost: number; labor_cost: number; other_costs: number; total_cost: number };
type AppRow = { application_date: string | null; total_cost: number | null; product_name: string | null };
type FiscalRow = { data_emissao: string | null; valor_total: number | null };
type StockRow = { quantity: number | null; unit_cost: number | null };
type AnimalRow = { id: string; category: string | null };
type ScoreRow = { animal_id: string; total_score: number | null };
type SettingRow = { key: string; value: string | null };

export default async function FinanceiroPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: salesData },
    { data: costsData },
    { data: appsData },
    { data: fiscalData },
    { data: stockData },
    { data: animalsData },
    { data: scoresData },
    { data: settingsData },
    { data: slaughterData },
  ] = await Promise.all([
    supabase.from("sales").select("sale_date, total_value, weight_kg, roi").order("sale_date"),
    supabase.from("animal_cost_summary").select("animal_id, total_input_cost, labor_cost, other_costs, total_cost"),
    supabase.from("applications").select("application_date, total_cost, product_name"),
    supabase.from("fiscal_notes").select("data_emissao, valor_total").eq("status", "validada"),
    supabase.from("stock_batches").select("quantity, unit_cost"),
    supabase.from("animals").select("id, category").eq("status", "Ativo"),
    supabase.from("animal_scores").select("animal_id, total_score"),
    supabase.from("platform_settings").select("key, value").eq("key", "cotacao_arroba"),
    supabase.from("slaughter_records").select("slaughter_date, total_value"),
  ]);

  const sales = (salesData ?? []) as SaleRow[];
  const costs = (costsData ?? []) as CostRow[];
  const apps = (appsData ?? []) as AppRow[];
  const fiscalNotes = (fiscalData ?? []) as FiscalRow[];
  const stock = (stockData ?? []) as StockRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const scores = (scoresData ?? []) as ScoreRow[];
  const cotacao = Number((settingsData as SettingRow[] | null)?.[0]?.value ?? 330);
  const slaughterRecs = (slaughterData ?? []) as { slaughter_date: string | null; total_value: number | null }[];

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const receitaVendas = sales.reduce((s, r) => s + Number(r.total_value ?? 0), 0);
  const receitaAbates = slaughterRecs.reduce((s, r) => s + Number(r.total_value ?? 0), 0);
  const receitaTotal = receitaVendas + receitaAbates;

  const custoTotal = costs.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);
  const resultado = receitaTotal - custoTotal;
  const margem = receitaTotal > 0 ? (resultado / receitaTotal) * 100 : 0;

  const salesWithRoi = sales.filter(s => s.roi != null && Number(s.roi) !== 0);
  const roiMedio = salesWithRoi.length > 0
    ? salesWithRoi.reduce((s, r) => s + Number(r.roi), 0) / salesWithRoi.length
    : resultado > 0 && custoTotal > 0 ? (resultado / custoTotal) * 100 : 0;

  const totalArrobas = sales.reduce((s, r) => s + (Number(r.weight_kg ?? 0) / 30), 0);
  const custoPorArroba = totalArrobas > 0 ? custoTotal / totalArrobas : 0;

  // ── Monthly data (from events + sales) ──────────────────────────────────────
  const monthMap = new Map<string, { receita: number; custo: number }>();
  const addMonth = (date: string | null, field: "receita" | "custo", value: number) => {
    if (!date) return;
    const key = date.slice(0, 7); // YYYY-MM
    const cur = monthMap.get(key) ?? { receita: 0, custo: 0 };
    cur[field] += value;
    monthMap.set(key, cur);
  };

  for (const s of sales) addMonth(s.sale_date, "receita", Number(s.total_value ?? 0));
  for (const s of slaughterRecs) addMonth(s.slaughter_date, "receita", Number(s.total_value ?? 0));
  for (const a of apps) addMonth(a.application_date, "custo", Number(a.total_cost ?? 0));
  for (const f of fiscalNotes) addMonth(f.data_emissao, "custo", Number(f.valor_total ?? 0));

  const monthlyData: MonthRow[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => ({
      month: new Date(key + "-01").toLocaleDateString("pt-BR", { month: "short" }),
      receita: Math.round(val.receita * 100) / 100,
      custo: Math.round(val.custo * 100) / 100,
    }));

  // ── DRE ─────────────────────────────────────────────────────────────────────
  const custoInsumos = apps.reduce((s, a) => s + Number(a.total_cost ?? 0), 0);
  const custoAlimentacao = Math.round(costs.reduce((s, c) => s + Number(c.total_input_cost ?? 0), 0) * 0.6); // ~60% of input = alimentação
  const custoMaoObra = costs.reduce((s, c) => s + Number(c.labor_cost ?? 0), 0);
  const outrosCustos = costs.reduce((s, c) => s + Number(c.other_costs ?? 0), 0);

  // ── Cash flow ──────────────────────────────────────────────────────────────
  type CashEntry = { date: string; amount: number };
  const cashEntries: CashEntry[] = [];
  for (const s of sales) if (s.sale_date) cashEntries.push({ date: s.sale_date, amount: Number(s.total_value ?? 0) });
  for (const s of slaughterRecs) if (s.slaughter_date) cashEntries.push({ date: s.slaughter_date, amount: Number(s.total_value ?? 0) });
  for (const a of apps) if (a.application_date) cashEntries.push({ date: a.application_date, amount: -Number(a.total_cost ?? 0) });
  for (const f of fiscalNotes) if (f.data_emissao) cashEntries.push({ date: f.data_emissao, amount: -Number(f.valor_total ?? 0) });

  cashEntries.sort((a, b) => a.date.localeCompare(b.date));

  let saldo = 0;
  const realCash: CashRow[] = cashEntries.map(e => {
    saldo += e.amount;
    return { label: new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), saldo: Math.round(saldo * 100) / 100 };
  });

  // Projection 90 days
  const last90 = cashEntries.filter(e => {
    const d = new Date(e.date);
    return d.getTime() > Date.now() - 90 * 86400000;
  });
  const avgDailyNet = last90.length > 0
    ? last90.reduce((s, e) => s + e.amount, 0) / 90
    : 0;

  const projectionStart = realCash.length;
  const projected: CashRow[] = [];
  let projSaldo = saldo;
  for (let d = 1; d <= 90; d += 15) {
    projSaldo += avgDailyNet * 15;
    const date = new Date(Date.now() + d * 86400000);
    projected.push({
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      saldo: Math.round(projSaldo * 100) / 100,
      isProjection: true,
    });
  }

  const cashFlow = [...realCash, ...projected];

  // ── Balanço ────────────────────────────────────────────────────────────────
  const scoreMap = new Map(scores.map(s => [s.animal_id, Number(s.total_score ?? 0)]));
  const animaisVendaCount = animals.filter(a =>
    !["Touro reprodutor", "Vaca gestante", "Vaca lactante"].includes(a.category ?? "")
  ).length;
  const precoMedioVenda = sales.length > 0
    ? sales.reduce((s, r) => s + Number(r.total_value ?? 0), 0) / sales.length
    : cotacao * 15; // fallback: 15@ × cotação
  const animaisVenda = animaisVendaCount * precoMedioVenda;

  const estoqueInsumos = stock.reduce((s, b) => s + (Number(b.quantity ?? 0) * Number(b.unit_cost ?? 0)), 0);
  const contasReceber = 0; // placeholder

  const reprodutores = animals.filter(a =>
    ["Touro reprodutor", "Vaca gestante", "Vaca lactante"].includes(a.category ?? "")
  );
  const animaisReproducao = reprodutores.reduce((s, a) => {
    const score = scoreMap.get(a.id) ?? 0;
    const base = cotacao * 15; // ~15@ base
    const premium = score >= 80 ? 1.2 : score >= 60 ? 1.1 : 1.0;
    return s + base * premium;
  }, 0);

  const ativoFixo = 0; // input manual — placeholder

  const contasPagar = fiscalNotes.reduce((s, f) => s + Number(f.valor_total ?? 0), 0) * 0.1; // ~10% pendente
  const financiamentos = 0; // input manual

  const finData: FinanceiroData = {
    kpis: { receitaTotal, custoTotal, resultado, margem, roiMedio, custoPorArroba },
    monthlyData,
    dre: { receitaVendas, receitaAbates, custoInsumos, custoAlimentacao, custoMaoObra, outrosCustos },
    cashFlow,
    cashProjectionStart: projectionStart,
    balanco: { animaisVenda, estoqueInsumos, contasReceber, animaisReproducao, ativoFixo, contasPagar, financiamentos },
  };

  return (
    <main className="space-y-6">
      {/* Hero */}
      <section className="ag-card-strong p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <DollarSign size={20} className="text-[var(--primary)]" />
          </span>
          <div>
            <h1 className="ag-page-title leading-none">Painel Financeiro</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              DRE, fluxo de caixa e balanço patrimonial da operação pecuária
            </p>
          </div>
        </div>
      </section>

      <FinanceiroTabs data={finData} />
    </main>
  );
}
