import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Bird, Plus, AlertTriangle, ShieldCheck } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type BatchRow = {
  id: string;
  batch_code: string;
  species: string;
  breed: string | null;
  housing_date: string;
  initial_count: number;
  current_count: number;
  mortality_count: number;
  average_weight_kg: number | null;
  feed_conversion: number | null;
  integrator_name: string | null;
  status: string;
  score: number | null;
  halal_certified: boolean;
  sif_certified: boolean;
};

const SPECIES_LABEL: Record<string, string> = { frango: "Frango", peru: "Peru", pato: "Pato" };

const STATUS_STYLE: Record<string, { bg: string; border: string; badge: string; label: string; dot: string }> = {
  alojado:        { bg: "bg-blue-50",    border: "border-blue-200",    badge: "bg-blue-100 text-blue-700 border-blue-200",       label: "Alojado",         dot: "bg-blue-500"    },
  em_crescimento: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Em crescimento", dot: "bg-emerald-500" },
  pronto_abate:   { bg: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-700 border-amber-200",    label: "Pronto p/ abate", dot: "bg-amber-500"   },
  abatido:        { bg: "bg-gray-50",    border: "border-gray-200",    badge: "bg-gray-100 text-gray-600 border-gray-200",       label: "Abatido",         dot: "bg-gray-400"    },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function ScoreRing({ score }: { score: number }) {
  const r = 18; const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = score >= 75 ? "#2d9b6f" : score >= 50 ? "#d4930a" : "#c0392b";
  const track = score >= 75 ? "#d1fae5" : score >= 50 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: 44, height: 44 }}>
      <svg width={44} height={44} viewBox="0 0 44 44">
        <circle cx={22} cy={22} r={r} fill="none" stroke={track} strokeWidth="4" />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 22 22)" />
      </svg>
      <span className="absolute text-[11px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default async function AvesDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: batchData }, { data: carenciaData }] = await Promise.all([
    supabase.from("poultry_batches")
      .select("id, batch_code, species, breed, housing_date, initial_count, current_count, mortality_count, average_weight_kg, feed_conversion, integrator_name, status, score, halal_certified, sif_certified")
      .order("housing_date", { ascending: false }),
    supabase.from("poultry_batch_events")
      .select("batch_id").eq("event_type", "vacina").gt("withdrawal_date", today),
  ]);

  const batches = (batchData ?? []) as BatchRow[];
  const carenciaBatchIds = new Set((carenciaData ?? []).map((r: { batch_id: string }) => r.batch_id));

  const active = batches.filter(b => b.status !== "abatido");
  const totalBirds = active.reduce((s, b) => s + b.current_count, 0);

  const mortalidades = batches.filter(b => b.initial_count > 0).map(b => (b.mortality_count / b.initial_count) * 100);
  const avgMortality = mortalidades.length > 0
    ? (mortalidades.reduce((s, m) => s + m, 0) / mortalidades.length).toFixed(1)
    : "—";

  const conversoes = batches.filter(b => b.feed_conversion != null).map(b => b.feed_conversion!);
  const avgConversion = conversoes.length > 0
    ? (conversoes.reduce((s, c) => s + c, 0) / conversoes.length).toFixed(2)
    : "—";

  const halalCount   = batches.filter(b => b.halal_certified).length;
  const carenciaCount = batches.filter(b => carenciaBatchIds.has(b.id)).length;

  const kpis = [
    { label: "Lotes ativos",       value: active.length,                         sub: "em produção",          color: "text-[var(--text-primary)]" },
    { label: "Aves alojadas",      value: totalBirds.toLocaleString("pt-BR"),    sub: "cabeças ativas",       color: "text-emerald-600" },
    { label: "Mortalidade média",  value: `${avgMortality}%`,                    sub: "do plantel",           color: avgMortality !== "—" && Number(avgMortality) > 3 ? "text-red-600" : "text-[var(--text-primary)]" },
    { label: "Conv. alimentar",    value: avgConversion,                          sub: "kg ração / kg ganho",  color: "text-[var(--text-primary)]" },
    { label: "Lotes com Halal",    value: halalCount,                             sub: "certificação ativa",   color: halalCount > 0 ? "text-emerald-600" : "text-[var(--text-muted)]" },
    { label: "Em carência",        value: carenciaCount,                          sub: "lotes com restrição",  color: carenciaCount > 0 ? "text-red-600" : "text-[var(--text-primary)]" },
  ];

  return (
    <main className="space-y-8">
      {/* ── Hero KPIs ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="ag-badge ag-badge-green">Pecuária Expandida</span>
              <h1 className="ag-page-title mt-3">Dashboard Aves & Frangos</h1>
              <p className="mt-2 text-[1rem] text-[var(--text-secondary)]">
                Visão executiva da avicultura — lotes, mortalidade, conversão e certificações
              </p>
            </div>
            <Link href="/aves/novo" className="ag-button-primary flex items-center gap-2 mt-1">
              <Plus size={14} /> Novo lote
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="ag-kpi-card">
                <p className="ag-kpi-label">{k.label}</p>
                <p className={`ag-kpi-value ${k.color}`}>{k.value}</p>
                <p className="sub">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cards por lote ── */}
      {batches.length === 0 ? (
        <section className="ag-card-strong p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bird size={36} className="text-[var(--text-muted)] mb-4" />
            <p className="text-sm text-[var(--text-muted)]">Nenhum lote avícola cadastrado.</p>
            <Link href="/aves/novo" className="mt-4 ag-button-primary flex items-center gap-2">
              <Plus size={14} /> Cadastrar primeiro lote
            </Link>
          </div>
        </section>
      ) : (
        <section className="ag-card-strong p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="ag-section-title">Lotes avícolas</h2>
            <span className="ag-badge ag-badge-dark">{batches.length} lotes</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {batches.map(b => {
              const style       = STATUS_STYLE[b.status] ?? STATUS_STYLE.alojado;
              const mortPct     = b.initial_count > 0 ? (b.mortality_count / b.initial_count) * 100 : 0;
              const mortality   = b.initial_count > 0 ? mortPct.toFixed(1) : "—";
              const highMort    = mortPct > 3;
              const emCarencia  = carenciaBatchIds.has(b.id);
              return (
                <Link key={b.id} href={`/aves/${b.id}`}
                  className={`block rounded-3xl border p-6 transition hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5 ${style.bg} ${style.border}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style.badge}`}>{style.label}</span>
                        {emCarencia && (
                          <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">em carência</span>
                        )}
                      </div>
                      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{b.batch_code}</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {SPECIES_LABEL[b.species] ?? b.species}{b.breed ? ` · ${b.breed}` : ""}
                      </p>
                      {b.integrator_name && <p className="mt-1 text-xs text-[var(--text-muted)]">{b.integrator_name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {b.score != null && <ScoreRing score={b.score} />}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{b.current_count.toLocaleString("pt-BR")}</p>
                        <p className="text-xs text-[var(--text-muted)]">aves</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-black/5 pt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Alojamento</p>
                      <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{formatDate(b.housing_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Mortalidade</p>
                      <p className={`mt-0.5 text-sm font-bold ${highMort ? "text-red-600" : "text-[var(--text-primary)]"}`}>
                        {mortality}%
                        {highMort && <AlertTriangle size={11} className="inline ml-1" />}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Conv. alimentar</p>
                      <p className={`mt-0.5 text-sm font-medium ${b.feed_conversion != null && b.feed_conversion < 1.8 ? "text-emerald-600 font-bold" : "text-[var(--text-primary)]"}`}>
                        {b.feed_conversion != null ? b.feed_conversion : "—"}
                      </p>
                    </div>
                  </div>

                  {(b.halal_certified || b.sif_certified) && (
                    <div className="mt-3 flex items-center gap-2">
                      {b.halal_certified && <HalalBadgeSVG size={24} />}
                      {b.sif_certified && (
                        <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          <ShieldCheck size={10} /> SIF
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
