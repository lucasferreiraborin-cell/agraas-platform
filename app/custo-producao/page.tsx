import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCotacaoArroba } from "@/lib/cotacao";
import Link from "next/link";
import { DollarSign, TrendingUp, Plus } from "lucide-react";
import CustoProducaoTable, { type CustoRow } from "@/app/components/CustoProducaoTable";

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
type AssignRow = { animal_id: string; lot_id: string };
type LotRow = { id: string; name: string | null };

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function CustoProducaoPage() {
  const supabase = await createSupabaseServerClient();
  const cotacaoSnap = await getCotacaoArroba();

  const [
    { data: costsData },
    { data: animalsData },
    { data: weightsData },
    { data: scoresData },
    { data: assignData },
    { data: lotsData },
  ] = await Promise.all([
    supabase.from("animal_cost_summary").select("animal_id, total_input_cost, total_cost"),
    supabase.from("animals").select("id, internal_code, breed, sex").eq("status", "Ativo").order("internal_code"),
    supabase.from("weights").select("animal_id, weight").order("weighing_date", { ascending: false }),
    supabase.from("animal_scores").select("animal_id, total_score"),
    supabase.from("animal_lot_assignments").select("animal_id, lot_id").is("exit_date", null),
    supabase.from("lots").select("id, name"),
  ]);

  const costMap = new Map((costsData ?? []).map((c: CostRow) => [c.animal_id, c]));
  const weightMap = new Map<string, number>();
  for (const w of (weightsData ?? []) as WeightRow[]) {
    if (!weightMap.has(w.animal_id)) weightMap.set(w.animal_id, w.weight);
  }
  const scoreMap = new Map((scoresData ?? []).map((s: ScoreRow) => [s.animal_id, s.total_score ?? 0]));
  const lotNameMap = new Map((lotsData ?? []).map((l: LotRow) => [l.id, l.name ?? "—"]));
  const animalLotMap = new Map<string, string>();
  for (const a of (assignData ?? []) as AssignRow[]) {
    if (!animalLotMap.has(a.animal_id)) {
      animalLotMap.set(a.animal_id, lotNameMap.get(a.lot_id) ?? "Sem lote");
    }
  }
  const cotacao = cotacaoSnap.value;
  const animals = (animalsData ?? []) as AnimalRow[];

  const rows: CustoRow[] = animals.map(a => {
    const cost = costMap.get(a.id);
    const weight = weightMap.get(a.id) ?? 0;
    const arrobas = weight / 30;
    const valorCepea = arrobas * cotacao;
    const totalCost = Number(cost?.total_cost ?? 0);
    const roi = valorCepea - totalCost;
    const roiPct = totalCost > 0 ? (roi / totalCost) * 100 : 0;
    return {
      id: a.id,
      internal_code: a.internal_code,
      breed: a.breed,
      weight,
      score: Number(scoreMap.get(a.id) ?? 0),
      totalCost,
      valorCepea,
      roi,
      roiPct,
      lot_code: animalLotMap.get(a.id) ?? "Sem lote",
    };
  });

  const totalInvestido = rows.reduce((s, r) => s + r.totalCost, 0);
  const custoMedio = rows.length > 0 ? totalInvestido / rows.length : 0;
  const elegiveis = rows.filter(r => r.totalCost > 0);
  const roiMedio = elegiveis.length > 0
    ? elegiveis.reduce((s, r) => s + r.roiPct, 0) / elegiveis.length
    : 0;

  const dataHoje = new Date().toLocaleDateString("pt-BR");

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
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                ROI projetado · CEPEA R$ {cotacao.toFixed(0)}/@ · ref. {dataHoje}
              </p>
            </div>
          </div>
          <Link href="/custos" className="ag-button-primary flex items-center gap-2">
            <Plus size={16} /> Registrar custo
          </Link>
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
        <CustoProducaoTable rows={rows} />
      )}
    </main>
  );
}
