import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Brain, AlertTriangle } from "lucide-react";

type BatchRow = {
  id: string;
  batch_number: string;
  quantity: number;
  expiration_date: string | null;
  product_id: string;
};

type ProductRow = {
  id: string;
  name: string;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
  nickname: string | null;
};

type AiPredictionRow = {
  id: string;
  animal_id: string;
  risk_level: string;
  alerts: string[];
  recommendations: string[];
  predicted_score_30d: number | null;
  created_at: string;
  animals: {
    agraas_id: string | null;
    internal_code: string | null;
    nickname: string | null;
  } | null;
};

type WeightRow = {
  animal_id: string;
  weight: number;
  weighing_date: string | null;
};

export default async function AlertasPage() {
  const supabase = await createSupabaseServerClient();

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: batchesData, error: batchesError },
    { data: productsData, error: productsError },
    { data: animalsData, error: animalsError },
    { data: weightsData, error: weightsError },
    { data: aiPredictionsData },
  ] = await Promise.all([
    supabase.from("stock_batches").select("id, batch_number, quantity, expiration_date, product_id"),
    supabase.from("products").select("id, name"),
    supabase.from("animals").select("id, internal_code, agraas_id, nickname"),
    supabase.from("weights").select("animal_id, weight, weighing_date").order("weighing_date", { ascending: false }),
    supabase
      .from("ai_predictions")
      .select("id, animal_id, risk_level, alerts, recommendations, predicted_score_30d, created_at, animals(agraas_id, internal_code, nickname)")
      .gte("created_at", cutoff24h)
      .order("created_at", { ascending: false }),
  ]);

  if (batchesError) console.error("Erro ao buscar lotes sanitários:", batchesError);
  if (productsError) console.error("Erro ao buscar produtos:", productsError);
  if (animalsError) console.error("Erro ao buscar animais:", animalsError);
  if (weightsError) console.error("Erro ao buscar pesagens:", weightsError);

  const batches = (batchesData ?? []) as BatchRow[];
  const products = (productsData ?? []) as ProductRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const aiPredictions = (aiPredictionsData ?? []) as AiPredictionRow[];

  // Group AI predictions by risk level (high first, then medium, skip low if no alerts)
  const highRisk   = aiPredictions.filter(p => p.risk_level === "high");
  const mediumRisk = aiPredictions.filter(p => p.risk_level === "medium" && p.alerts.length > 0);
  const aiAlerts   = [...highRisk, ...mediumRisk];
  const weights = (weightsData ?? []) as WeightRow[];

  const productMap = new Map<string, string>();
  products.forEach((item) => productMap.set(item.id, item.name));

  const latestWeightByAnimal = new Map<string, WeightRow>();
  for (const row of weights) {
    if (!latestWeightByAnimal.has(row.animal_id)) {
      latestWeightByAnimal.set(row.animal_id, row);
    }
  }

  const lowStock = batches.filter((item) => Number(item.quantity) <= 5);

  const today = new Date();
  const expiringSoon = batches.filter((item) => {
    if (!item.expiration_date) return false;
    const diffDays =
      (new Date(item.expiration_date).getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });

  const noRecentWeighing = animals.filter((animal) => {
    const last = latestWeightByAnimal.get(animal.id);
    if (!last?.weighing_date) return true;

    const diffDays =
      (today.getTime() - new Date(last.weighing_date).getTime()) /
      (1000 * 60 * 60 * 24);

    return diffDays > 90;
  });

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Alertas operacionais</div>

            <h1 className="ag-page-title max-w-4xl">
              Monitoramento preventivo da operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              Identifique riscos de estoque, vencimento e ausência de pesagens
              recentes para agir antes que o problema aconteça.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estoque/dashboard" className="ag-button-primary">
                Dashboard sanitário
              </Link>
              <Link href="/produtivo" className="ag-button-secondary">
                Dashboard produtivo
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Estoque crítico"
                value={lowStock.length}
                subtitle="lotes com saldo baixo"
              />
              <MetricCard
                label="Vencendo em 30 dias"
                value={expiringSoon.length}
                subtitle="produtos próximos do vencimento"
              />
              <MetricCard
                label="Sem pesagem recente"
                value={noRecentWeighing.length}
                subtitle="animais há mais de 90 dias sem pesagem"
              />
              <MetricCard
                label="Risco IA"
                value={aiAlerts.length}
                subtitle="animais com risco alto ou médio nas últimas 24h"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Estoque crítico</h2>
              <p className="ag-section-subtitle">
                Lotes sanitários com quantidade baixa.
              </p>
            </div>

            <Link href="/estoque" className="ag-button-secondary">
              Ver estoque
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {lowStock.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum lote com estoque crítico.
              </p>
            ) : (
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td>{productMap.get(item.product_id) ?? "-"}</td>
                      <td>{item.batch_number}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Animais sem pesagem recente</h2>
              <p className="ag-section-subtitle">
                Base para acompanhamento produtivo preventivo.
              </p>
            </div>

            <Link href="/pesagens" className="ag-button-secondary">
              Registrar pesagem
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {noRecentWeighing.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Todos os animais possuem pesagens recentes.
              </p>
            ) : (
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Última pesagem</th>
                  </tr>
                </thead>
                <tbody>
                  {noRecentWeighing.map((animal) => {
                    const last = latestWeightByAnimal.get(animal.id);
                    return (
                      <tr key={animal.id}>
                        <td>{animal.internal_code ?? animal.id}</td>
                        <td>{last?.weighing_date ? new Date(last.weighing_date).toLocaleDateString("pt-BR") : "Nunca"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ── AI Predictions ─────────────────────────────────────────────────── */}
      <section className="ag-card p-8">
        <div className="flex items-center gap-2 mb-6">
          <Brain size={16} className="text-violet-400" />
          <h2 className="ag-section-title mb-0">Alertas preditivos IA</h2>
          <span className="ag-badge ag-badge-dark ml-2">últimas 24h</span>
        </div>

        {aiAlerts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Nenhum animal com risco alto ou médio nas últimas 24 horas. Acesse a página de um animal para gerar uma análise.
          </p>
        ) : (
          <div className="space-y-3">
            {aiAlerts.map((pred) => {
              const animalLabel =
                pred.animals?.nickname ??
                pred.animals?.internal_code ??
                pred.animals?.agraas_id ??
                pred.animal_id;
              const isHigh = pred.risk_level === "high";
              return (
                <div
                  key={pred.id}
                  className={`rounded-xl border p-4 ${
                    isHigh
                      ? "border-red-500/25 bg-red-500/8"
                      : "border-amber-500/20 bg-amber-500/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        size={14}
                        className={isHigh ? "text-red-400" : "text-amber-400"}
                      />
                      <Link
                        href={`/animais/${pred.animal_id}`}
                        className={`font-semibold text-sm hover:underline ${
                          isHigh ? "text-red-300" : "text-amber-300"
                        }`}
                      >
                        {animalLabel}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isHigh
                            ? "bg-red-500/20 text-red-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {pred.risk_level}
                      </span>
                    </div>
                    {pred.predicted_score_30d !== null && (
                      <span className="text-xs text-white/40">
                        Score 30d: <strong className="text-white/70">{pred.predicted_score_30d}</strong>
                      </span>
                    )}
                  </div>
                  {pred.alerts.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {pred.alerts.map((a, i) => (
                        <li key={i} className="text-xs text-white/60">• {a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="ag-kpi-card">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}