import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { DollarSign, TrendingUp } from "lucide-react";

type CostRow = {
  animal_id: string;
  total_input_cost: number;
  total_cost: number;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  breed: string | null;
  sex: string | null;
};

type WeightRow = { animal_id: string; weight: number };
type ScoreRow = { animal_id: string; total_score: number | null };

export default async function CustoProducaoPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: costsData }, { data: animalsData }, { data: weightsData }, { data: scoresData }, { data: cotacaoData }] = await Promise.all([
    supabase.from("animal_cost_summary").select("animal_id, total_input_cost, total_cost"),
    supabase.from("animals").select("id, internal_code, breed, sex").eq("status", "Ativo").order("internal_code"),
    supabase.from("weights").select("animal_id, weight").order("weighing_date", { ascending: false }),
    supabase.from("animal_scores").select("animal_id, total_score"),
    supabase.from("platform_settings").select("value").eq("key", "cotacao_arroba").single(),
  ]);

  const costMap = new Map((costsData ?? []).map((c: CostRow) => [c.animal_id, c]));
  const weightMap = new Map<string, number>();
  for (const w of (weightsData ?? []) as WeightRow[]) {
    if (!weightMap.has(w.animal_id)) weightMap.set(w.animal_id, w.weight);
  }
  const scoreMap = new Map((scoresData ?? []).map((s: ScoreRow) => [s.animal_id, s.total_score ?? 0]));
  const cotacao = Number(cotacaoData?.value ?? 330);
  const animals = (animalsData ?? []) as AnimalRow[];

  const rows = animals.map(a => {
    const cost = costMap.get(a.id);
    const weight = weightMap.get(a.id) ?? 0;
    const arrobas = weight / 30;
    const valorCepea = arrobas * cotacao;
    const totalCost = cost?.total_cost ?? 0;
    const roi = valorCepea - totalCost;
    const roiPct = totalCost > 0 ? ((roi / totalCost) * 100) : 0;
    return { ...a, weight, totalCost, valorCepea, roi, roiPct, score: scoreMap.get(a.id) ?? 0 };
  });

  const totalInvestido = rows.reduce((s, r) => s + r.totalCost, 0);
  const custoMedio = rows.length > 0 ? totalInvestido / rows.length : 0;
  const roiMedio = rows.filter(r => r.totalCost > 0).length > 0
    ? rows.filter(r => r.totalCost > 0).reduce((s, r) => s + r.roiPct, 0) / rows.filter(r => r.totalCost > 0).length : 0;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <DollarSign size={20} className="text-[var(--primary)]" />
            </span>
            <div>
              <h1 className="ag-page-title leading-none">Custo de Produção</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">ROI projetado pelo valor CEPEA atual (R$ {cotacao.toFixed(0)}/@)</p>
            </div>
          </div>
          <Link href="/custos" className="ag-button-secondary">Registrar custo</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="ag-kpi-card p-5">
          <p className="ag-kpi-label">Total investido</p>
          <p className="ag-kpi-value">{fmt(totalInvestido)}</p>
        </div>
        <div className="ag-kpi-card p-5">
          <p className="ag-kpi-label">Custo médio/animal</p>
          <p className="ag-kpi-value">{fmt(custoMedio)}</p>
        </div>
        <div className="ag-kpi-card p-5">
          <p className="ag-kpi-label">ROI médio</p>
          <p className={`ag-kpi-value ${roiMedio >= 0 ? "text-emerald-600" : "text-red-500"}`}>{roiMedio.toFixed(0)}%</p>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="ag-empty-state">
          <div className="ag-empty-state-icon"><TrendingUp size={24} /></div>
          <p className="ag-empty-state-title">Sem dados de custo</p>
          <p className="ag-empty-state-text">Registre aplicações com custo unitário para ver o ROI projetado.</p>
        </div>
      ) : (
        <section className="ag-card overflow-hidden p-0">
          <table className="ag-table w-full">
            <thead>
              <tr><th>Animal</th><th>Raça</th><th>Peso</th><th>Score</th><th>Custo</th><th>Valor CEPEA</th><th>ROI</th><th>ROI %</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold text-[var(--text-primary)]">
                    <Link href={`/animais/${r.id}`} className="text-[var(--primary-hover)] hover:underline">{r.internal_code ?? r.id.slice(0, 8)}</Link>
                  </td>
                  <td className="text-sm">{r.breed ?? "—"}</td>
                  <td className="text-sm font-medium">{r.weight > 0 ? `${r.weight} kg` : "—"}</td>
                  <td className="text-sm">{r.score}</td>
                  <td className="text-sm">{r.totalCost > 0 ? fmt(r.totalCost) : "—"}</td>
                  <td className="text-sm font-medium">{r.weight > 0 ? fmt(r.valorCepea) : "—"}</td>
                  <td className={`text-sm font-bold ${r.roi >= 0 ? "text-emerald-600" : "text-red-500"}`}>{r.weight > 0 ? fmt(r.roi) : "—"}</td>
                  <td className={`text-sm font-bold ${r.roiPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>{r.totalCost > 0 ? `${r.roiPct.toFixed(0)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
