/**
 * /banco/analytics — Indicadores agregados do portfólio.
 *
 * Distribuição de score por faixa, evolução temporal (placeholder),
 * concentração geográfica. Tudo restrito ao portfólio do banco.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { BANK_VIEW_ENABLED } from "@/lib/feature-flags";
import { requirePersona, BANCO_ROUTES } from "@/lib/persona-resolver";
import { scoreClassification } from "@/lib/personas";
import { TrendingUp, Activity, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BancoAnalyticsPage() {
  if (!BANK_VIEW_ENABLED) redirect("/em-breve");

  const ctx = await requirePersona(BANCO_ROUTES);
  const db = createSupabaseServiceClient();

  const { data: relationships } = await db
    .from("bank_producer_relationships")
    .select("producer_client_id, granted_by_producer")
    .eq("bank_client_id", ctx.clientId)
    .eq("status", "active")
    .eq("granted_by_producer", true);

  const producerIds = (relationships ?? []).map((r) => r.producer_client_id);

  const { data: producerScores } = producerIds.length
    ? await db.from("producer_scores").select("client_id, score_total").in("client_id", producerIds)
    : { data: [] };

  const { data: farmScores } = producerIds.length
    ? await db.from("farm_scores").select("client_id, score_total, animals_count_active, property_id").in("client_id", producerIds)
    : { data: [] };

  const { data: properties } = producerIds.length
    ? await db.from("properties").select("id, state, area_ha").in("client_id", producerIds)
    : { data: [] };

  // Distribuição por faixa
  const faixas = [
    { label: "Excelente", min: 80, max: 100, color: "#16a34a", count: 0 },
    { label: "Bom", min: 65, max: 80, color: "#65a30d", count: 0 },
    { label: "Regular", min: 50, max: 65, color: "#ca8a04", count: 0 },
    { label: "Atenção", min: 35, max: 50, color: "#ea580c", count: 0 },
    { label: "Crítico", min: 0, max: 35, color: "#dc2626", count: 0 },
  ];

  for (const ps of producerScores ?? []) {
    const s = Number(ps.score_total);
    const f = faixas.find((x) => s >= x.min && s <= x.max);
    if (f) f.count++;
  }
  const total = producerScores?.length ?? 0;

  // Concentração por UF (das propriedades dos produtores no portfólio)
  const ufCount = new Map<string, number>();
  for (const p of properties ?? []) {
    const uf = (p.state ?? "").toUpperCase();
    if (!uf) continue;
    ufCount.set(uf, (ufCount.get(uf) ?? 0) + 1);
  }
  const ufRanking = [...ufCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalAreaHa = (properties ?? []).reduce((acc, p) => acc + Number(p.area_ha ?? 0), 0);
  const totalAnimais = (farmScores ?? []).reduce((acc, f) => acc + (f.animals_count_active ?? 0), 0);
  const scoreMedio = total > 0
    ? (producerScores ?? []).reduce((acc, p) => acc + Number(p.score_total), 0) / total
    : 0;

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-7xl mx-auto px-8 py-10">
        <header className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
            Analytics · Visão do portfólio
          </div>
          <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
            Indicadores agregados
          </h1>
          <p className="text-[--text-secondary] mt-3 max-w-2xl">
            Visão analítica do portfólio. Todos os produtores incluídos liberaram acesso
            via consentimento explícito.
          </p>
        </header>

        {total === 0 ? (
          <div className="ag-card p-12 text-center">
            <BarChart3 size={36} className="text-[--text-muted] mx-auto mb-3" />
            <p className="text-[--text-secondary]">
              Sem dados de produtores com consentimento ativo. Acesse <strong>Portfólio</strong> para ver pendências.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Kpi label="Produtores" value={total.toString()} />
              <Kpi label="Score médio" value={scoreMedio.toFixed(1)} accent />
              <Kpi label="Animais ativos" value={totalAnimais.toLocaleString("pt-BR")} />
              <Kpi label="Área (ha)" value={Math.round(totalAreaHa).toLocaleString("pt-BR")} />
            </div>

            <section className="ag-card mb-8">
              <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2">
                <Activity size={16} className="text-[--text-secondary]" />
                <h2 className="text-lg font-semibold text-[--text-primary]">
                  Distribuição por faixa de score
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {faixas.map((f) => {
                  const pct = total > 0 ? (f.count / total) * 100 : 0;
                  return (
                    <div key={f.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: f.color }}
                          />
                          <span className="text-sm text-[--text-primary] font-medium">{f.label}</span>
                          <span className="text-xs text-[--text-muted]">({f.min}-{f.max})</span>
                        </div>
                        <span className="text-sm text-[--text-primary] font-semibold">
                          {f.count} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: f.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ag-card">
              <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2">
                <TrendingUp size={16} className="text-[--text-secondary]" />
                <h2 className="text-lg font-semibold text-[--text-primary]">
                  Concentração geográfica · top 5 UF
                </h2>
              </div>
              <div className="p-6">
                {ufRanking.length === 0 ? (
                  <p className="text-sm text-[--text-secondary]">Sem dados de localização</p>
                ) : (
                  <div className="space-y-2">
                    {ufRanking.map(([uf, count]) => {
                      const totalProps = properties?.length ?? 1;
                      const pct = (count / totalProps) * 100;
                      return (
                        <div key={uf} className="flex items-center gap-3">
                          <div className="w-10 text-sm font-mono font-semibold text-[--text-primary]">{uf}</div>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: "var(--persona-accent)" }}
                            />
                          </div>
                          <div className="text-sm text-[--text-primary] font-medium w-16 text-right">{count} fazenda{count !== 1 ? "s" : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </PersonaShell>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="ag-card p-5">
      <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">{label}</div>
      <div className="text-2xl font-bold mt-2" style={{ color: accent ? "var(--persona-accent)" : "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
