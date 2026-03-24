import { createSupabaseServerClient } from "@/lib/supabase-server";
import dynamic from "next/dynamic";

const ReproGauge  = dynamic(() => import("@/app/components/charts/ReproGauge"),   { ssr: false });
const IABreakdown = dynamic(() => import("@/app/components/charts/IABreakdown"),  { ssr: false });

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="ag-card flex flex-col gap-1 p-5">
      <p className="ag-kpi-label">{label}</p>
      <p className="ag-kpi-value">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="ag-section-title">{title}</h2>
      {sub && <p className="ag-section-subtitle">{sub}</p>}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[80px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-6 py-8 text-sm text-[var(--text-muted)]">
      {label}
    </div>
  );
}

function pct(v: number | null) {
  return v != null ? `${v.toFixed(2)}%` : "—";
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

  const aptPct = season
    ? ((season.apt_count ?? 0) / Math.max(season.females_inseminated ?? 1, 1)) * 100
    : null;

  const gaugeArc = aptPct != null ? Math.min(aptPct / 100, 1) : 0;
  // SVG semi-circle: radius=70, center=(90,90), arc from 180° to 0°
  const r = 70;
  const cx = 90;
  const cy = 90;
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;
  const fillAngle = gaugeArc * Math.PI;
  const fillX = cx + r * Math.cos(Math.PI - fillAngle);
  const fillY = cy - r * Math.sin(Math.PI - fillAngle);
  const largeArc = gaugeArc > 0.5 ? 1 : 0;

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden p-8 lg:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0.00)_70%)]" />
        <div className="ag-badge ag-badge-green mb-4">Módulo Reprodutivo</div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] lg:text-4xl">
          Reprodutivo
        </h1>
        <p className="mt-3 max-w-xl text-[1rem] leading-7 text-[var(--text-secondary)]">
          {season
            ? `Estação ${new Date(season.season_start).toLocaleDateString("pt-BR")} — ${new Date(season.season_end).toLocaleDateString("pt-BR")}`
            : "Gestão da estação de monta, índices reprodutivos, partos e desmame."}
        </p>
      </section>

      {!season ? (
        <EmptyState label="Nenhum dado reprodutivo registrado ainda" />
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
              <EmptyState label="Nenhum serviço de IA registrado" />
            ) : (
              <IABreakdown rows={ia} />
            )}
          </section>

          {/* Gauge APTAS */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Fêmeas Aptas" sub="Percentual apto para inseminação" />
            {aptPct != null ? (
              <ReproGauge
                pct={aptPct}
                apt={season.apt_count ?? 0}
                inseminated={season.females_inseminated ?? 0}
                toInseminate={season.to_inseminate ?? 0}
              />
            ) : (
              <EmptyState label="Dados insuficientes para o gauge" />
            )}
          </section>

          {/* Estoque Reprodutores */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Estoque de Reprodutores" sub="Categoria × status reprodutivo" />
            {stockRows.length === 0 ? (
              <EmptyState label="Nenhum dado de estoque registrado" />
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
                    {stockRows.map(row => (
                      <tr key={row.category}>
                        <td className="font-medium text-[var(--text-primary)]">{row.category}</td>
                        <td>{num(row.total)}</td>
                        <td className="text-green-600 font-medium">{num(row.pregnant)}</td>
                        <td className="text-amber-600 font-medium">{num(row.served)}</td>
                        <td className="text-red-500 font-medium">{num(row.empty)}</td>
                      </tr>
                    ))}
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
