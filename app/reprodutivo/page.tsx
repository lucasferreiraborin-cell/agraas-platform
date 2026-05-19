import { createSupabaseServerClient } from "@/lib/supabase-server";
import ReproGauge  from "@/app/components/charts/ReproGaugeWrapper";
import IABreakdown from "@/app/components/charts/IABreakdownWrapper";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/EmptyState";

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="ag-section-title">{title}</h2>
      {sub && <p className="ag-section-subtitle">{sub}</p>}
    </div>
  );
}

function pct(v: number | null) {
  if (v == null) return "—";
  const clamped = Math.max(0, Math.min(100, v));
  return `${clamped.toFixed(2)}%`;
}
function num(v: number | null) {
  return v != null ? v.toLocaleString("pt-BR") : "—";
}
function kg(v: number | null) {
  return v != null ? `${Number(v).toFixed(0)} kg` : "—";
}

export default async function ReprodutivoPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: seasons }, { data: iaServices }, { data: stockSummary }] = await Promise.all([
    supabase
      .from("reproductive_seasons")
      .select("*")
      .order("season_start", { ascending: false })
      .limit(1),
    supabase
      .from("reproductive_ia_services")
      .select("*")
      .order("service_number"),
    supabase
      .from("reproductive_stock_summary")
      .select("*"),
  ]);

  const season = seasons?.[0] ?? null;
  const seasonId = season?.id ?? null;
  const ia = (iaServices ?? []).filter(s => s.season_id === seasonId);
  const stock = (stockSummary ?? []).filter(s => {
    // match season's client
    return true;
  });
  const stockRows = stock.filter(s => s.category !== "Total");
  const stockTotal = stock.find(s => s.category === "Total");

  // % das fêmeas aptas que foram efetivamente inseminadas (clamped 0-100)
  const aptPct = season
    ? Math.min(
        100,
        ((season.females_inseminated ?? 0) / Math.max(season.apt_count ?? 1, 1)) * 100,
      )
    : null;

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Módulo Reprodutivo"
        title="Reprodutivo"
        description={
          season
            ? `Estação ${new Date(season.season_start).toLocaleDateString("pt-BR")} — ${new Date(season.season_end).toLocaleDateString("pt-BR")}`
            : "Gestão da estação de monta, índices reprodutivos, partos e desmame."
        }
      />

      {!season ? (
        <EmptyState title="Nenhum dado reprodutivo registrado ainda" />
      ) : (
        <>
          {/* Estação de Monta — KPIs */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Estação de Monta" sub="Indicadores do período atual" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Período"
                value={`${new Date(season.season_start).toLocaleDateString("pt-BR")} — ${new Date(season.season_end).toLocaleDateString("pt-BR")}`}
                sub="início — fim"
              />
              <KpiCard label="Fêmeas inseminadas" value={num(season.females_inseminated)} sub={`${num(season.total_inseminations)} inseminações totais`} />
              <KpiCard label="Taxa de prenhez" value={pct(season.pregnancy_rate)} sub="prenhas / total aptas" />
              <KpiCard label="Taxa concepção IA" value={pct(season.avg_conception_rate)} sub="média das 3 IAs" />
            </div>
          </section>

          {/* Serviços de IA */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Breakdown por Serviço de IA" sub="Taxa de concepção acumulada por repasse" />
            {ia.length === 0 ? (
              <EmptyState title="Nenhum serviço de IA registrado" />
            ) : (
              <IABreakdown rows={ia} />
            )}
          </section>

          {/* Gauge APTAS */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Cobertura de Inseminação" sub="% das fêmeas aptas que foram inseminadas" />
            {aptPct != null ? (
              <ReproGauge
                pct={aptPct}
                apt={season.apt_count ?? 0}
                inseminated={season.females_inseminated ?? 0}
                toInseminate={season.to_inseminate ?? 0}
              />
            ) : (
              <EmptyState title="Dados insuficientes para o gauge" />
            )}
          </section>

          {/* Estoque Reprodutores */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Estoque de Reprodutores" sub="Categoria × status reprodutivo" />
            {stockRows.length === 0 ? (
              <EmptyState title="Nenhum dado de estoque registrado" />
            ) : (
              <div className="overflow-x-auto">
                <table className="ag-table w-full">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Total</th>
                      <th>Prenha</th>
                      <th>Servida</th>
                      <th>Vazia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.map(row => {
                      // Disambiguate "Novilha" vs "Novilha 2a cria" with friendly labels
                      const label = row.category === "Novilha"            ? "Novilha 1ª Cria"
                                  : row.category === "Novilha 2a cria"    ? "Novilha 2ª Cria"
                                  : row.category;
                      return (
                        <tr key={row.category}>
                          <td className="font-medium text-[var(--text-primary)]">{label}</td>
                          <td>{num(row.total)}</td>
                          <td className="text-green-600 font-medium">{num(row.pregnant)}</td>
                          <td className="text-amber-600 font-medium">{num(row.served)}</td>
                          <td className="text-red-500 font-medium">{num(row.empty)}</td>
                        </tr>
                      );
                    })}
                    {stockTotal && (
                      <tr className="border-t-2 border-[var(--border)] font-semibold">
                        <td className="text-[var(--text-primary)]">Total</td>
                        <td>{num(stockTotal.total)}</td>
                        <td className="text-green-600">{num(stockTotal.pregnant)}</td>
                        <td className="text-amber-600">{num(stockTotal.served)}</td>
                        <td className="text-red-500">{num(stockTotal.empty)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Partos */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Partos" sub="Nascimentos, perdas e mortes no período" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Partos realizados" value={num(season.births_performed)} sub="total do período" />
              <KpiCard label="Nascidos vivos" value={`${num(season.born_alive)} (${pct(season.born_alive != null && season.births_performed ? (season.born_alive / season.births_performed) * 100 : null)})`} sub="% nascimentos / partos" />
              <KpiCard label="Perdas gestacionais" value={`${num(season.pregnancy_losses)} (${pct(season.pregnancy_losses != null && season.births_performed ? (season.pregnancy_losses / season.births_performed) * 100 : null)})`} sub="abortos / natimortos" />
              <KpiCard label="Mortes de gestante" value={`${num(season.gestant_deaths)} (${pct(season.gestant_deaths != null && season.births_performed ? (season.gestant_deaths / season.births_performed) * 100 : null)})`} sub="vacas perdidas" />
            </div>

            {/* ── Tendências ────────────────────────────────────────────── */}
            {(() => {
              const META_PRENHEZ = 75;
              const META_GPD = 0.800;
              const META_MORTALIDADE = 3;
              const prenhezRate = season.pregnancy_rate ?? 0;
              const gpdAvg = season.avg_gpd != null ? Number(season.avg_gpd) : 0;
              const totalParidas = (season.born_alive ?? 0) + (season.pregnancy_losses ?? 0);
              const mortalidadeNeonatal = totalParidas > 0 ? ((season.deaths_maternity ?? 0) / totalParidas) * 100 : 0;

              const prenhezOk = prenhezRate >= META_PRENHEZ;
              const gpdOk = gpdAvg >= META_GPD;
              const mortOk = mortalidadeNeonatal < META_MORTALIDADE;

              return (
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Tendências da estação
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Taxa de prenhez vs meta</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className={`text-2xl font-bold ${prenhezOk ? "text-emerald-600" : "text-amber-600"}`}>
                          {prenhezRate.toFixed(1)}%
                        </p>
                        <span className="text-xs text-[var(--text-muted)]">/ {META_PRENHEZ}%</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${prenhezOk ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {prenhezOk ? "Atingida" : `${(META_PRENHEZ - prenhezRate).toFixed(1)}% abaixo`}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">GPD médio ao desmame</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className={`text-2xl font-bold ${gpdOk ? "text-emerald-600" : "text-amber-600"}`}>
                          {gpdAvg.toFixed(3).replace(".", ",")}
                        </p>
                        <span className="text-xs text-[var(--text-muted)]">kg/dia</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${gpdOk ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {gpdOk ? "Bom" : "Atenção"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Mortalidade neonatal</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className={`text-2xl font-bold ${mortOk ? "text-emerald-600" : "text-red-500"}`}>
                          {mortalidadeNeonatal.toFixed(2).replace(".", ",")}%
                        </p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${mortOk ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                          {mortOk ? "Saudável" : "Crítico"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Desmame */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Desmame" sub="Indicadores de desmame por sexo" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Desmamados" value={num(season.total_weaned)} sub={`${num(season.deaths_maternity)} mortes na maternidade`} />
              <KpiCard label="Idade média" value={`${num(season.avg_weaning_age_days)} dias`} sub="ao desmame" />
              <KpiCard label="Peso médio" value={kg(season.avg_weaning_weight)} sub="ao desmame" />
              <KpiCard label="GPD médio" value={season.avg_gpd != null ? `${Number(season.avg_gpd).toFixed(3)} kg/dia` : "—"} sub="ganho por dia" />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="ag-table w-full">
                <thead>
                  <tr>
                    <th>Sexo</th>
                    <th>Quantidade</th>
                    <th>Peso médio (kg)</th>
                    <th>GPD (kg/dia)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-[var(--text-primary)]">Macho</td>
                    <td>{num(season.males_qty)}</td>
                    <td>{kg(season.males_avg_weight)}</td>
                    <td>{season.males_gpd != null ? Number(season.males_gpd).toFixed(3) : "—"}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-[var(--text-primary)]">Fêmea</td>
                    <td>{num(season.females_qty)}</td>
                    <td>{kg(season.females_avg_weight)}</td>
                    <td>{season.females_gpd != null ? Number(season.females_gpd).toFixed(3) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Dias Perdidos */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Dias Perdidos por Categoria" sub="Eficiência reprodutiva por grupo" />
            <div className="overflow-x-auto">
              <table className="ag-table w-full">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Animais</th>
                    <th>Dias perdidos / animal</th>
                    <th>Total dias</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-[var(--text-primary)]">Vacas em descanso</td>
                    <td>{num(season.lost_vacas_descanso2)}</td>
                    <td className="text-red-500 font-semibold">{num(season.lost_days_descanso2)}</td>
                    <td>{num((season.lost_vacas_descanso2 ?? 0) * (season.lost_days_descanso2 ?? 0))}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-[var(--text-primary)]">Descanso &gt;30 dias</td>
                    <td>{num(season.lost_vacas_descanso203)}</td>
                    <td className="text-amber-500 font-semibold">{num(season.lost_days_descanso203)}</td>
                    <td>{num((season.lost_vacas_descanso203 ?? 0) * (season.lost_days_descanso203 ?? 0))}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-[var(--text-primary)]">DG &gt;30 dias</td>
                    <td>{num(season.lost_vacas_dg687)}</td>
                    <td className="text-amber-500 font-semibold">{num(season.lost_days_dg687)}</td>
                    <td>{num((season.lost_vacas_dg687 ?? 0) * (season.lost_days_dg687 ?? 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
