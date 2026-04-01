import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Rabbit } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type LivestockRow = {
  id: string;
  internal_code: string | null;
  species: string;
  score: number | null;
  weight_kg: number | null;
  status: string;
  certifications: string[];
};

function ScoreRing({ score }: { score: number }) {
  const r = 18; const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = score >= 75 ? "#2d9b6f" : score >= 50 ? "#d4930a" : "#c0392b";
  const track = score >= 75 ? "#d1fae5" : score >= 50 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 44, height: 44 }}>
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

export default async function OvinosDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: animalsData },
    { data: quarantineData },
    { data: carenciaData },
  ] = await Promise.all([
    supabase.from("livestock_species")
      .select("id, internal_code, species, score, weight_kg, status, certifications")
      .in("species", ["ovino", "caprino"]),
    supabase.from("pre_shipment_quarantine")
      .select("animal_id").eq("status", "em_quarentena"),
    supabase.from("livestock_applications")
      .select("animal_id").gt("withdrawal_date", today),
  ]);

  const animals = (animalsData ?? []) as LivestockRow[];
  const quarantineIds = new Set((quarantineData ?? []).map((q: { animal_id: string }) => q.animal_id));
  const carenciaIds   = new Set((carenciaData   ?? []).map((c: { animal_id: string }) => c.animal_id));

  const total      = animals.length;
  const withScore  = animals.filter(a => a.score != null);
  const avgScore   = withScore.length > 0
    ? Math.round(withScore.reduce((s, a) => s + (a.score ?? 0), 0) / withScore.length)
    : 0;
  const avgWeight  = animals.filter(a => a.weight_kg != null).length > 0
    ? Math.round(animals.reduce((s, a) => s + (a.weight_kg ?? 0), 0) / animals.filter(a => a.weight_kg != null).length * 10) / 10
    : 0;
  const emQuarentena = animals.filter(a => a.status === "quarantine" || quarantineIds.has(a.id)).length;
  const halalCount   = animals.filter(a => a.certifications?.includes("Halal")).length;
  const carenciaCount = animals.filter(a => carenciaIds.has(a.id)).length;

  const kpis = [
    { label: "Total",              value: total,           sub: "ovinos e caprinos",    color: "text-[var(--text-primary)]" },
    { label: "Score médio",        value: avgScore,         sub: "média da base",         color: avgScore >= 75 ? "text-emerald-600" : "text-amber-600" },
    { label: "Em quarentena",      value: emQuarentena,     sub: "pré-embarque",          color: emQuarentena > 0 ? "text-amber-600" : "text-[var(--text-primary)]" },
    { label: "Halal certificados", value: halalCount,       sub: "certificação ativa",    color: halalCount > 0 ? "text-emerald-600" : "text-[var(--text-muted)]" },
    { label: "Em carência",        value: carenciaCount,    sub: "restrição sanitária",   color: carenciaCount > 0 ? "text-red-600" : "text-[var(--text-primary)]" },
    { label: "Peso médio",         value: `${avgWeight} kg`, sub: "rebanho atual",        color: "text-blue-600" },
  ];

  // Distribuição de scores
  const bands = [
    { label: "< 40",   min: 0,  max: 39,  color: "bg-red-400" },
    { label: "40–59",  min: 40, max: 59,  color: "bg-amber-400" },
    { label: "60–79",  min: 60, max: 79,  color: "bg-blue-400" },
    { label: "≥ 80",   min: 80, max: 100, color: "bg-emerald-500" },
  ];
  const scoredAnimals = animals.filter(a => a.score != null);
  const bandCounts = bands.map(b => ({
    ...b,
    count: scoredAnimals.filter(a => (a.score ?? 0) >= b.min && (a.score ?? 0) <= b.max).length,
  }));
  const maxBandCount = Math.max(1, ...bandCounts.map(b => b.count));

  // Top 3 por score
  const top3 = [...animals]
    .filter(a => a.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

  return (
    <main className="space-y-8">
      {/* ── Hero KPIs ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="ag-badge ag-badge-green">Pecuária Expandida</span>
              <h1 className="ag-page-title mt-3">Dashboard Ovinos & Caprinos</h1>
              <p className="mt-2 text-[1rem] text-[var(--text-secondary)]">
                Visão executiva do rebanho de pequenos ruminantes
              </p>
            </div>
            <Link href="/ovinos" className="ag-button-secondary flex items-center gap-2 mt-1">
              <Rabbit size={14} /> Ver rebanho
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Distribuição de scores ── */}
        <section className="ag-card-strong p-8 space-y-5">
          <div>
            <h2 className="ag-section-title">Distribuição de Scores</h2>
            <p className="ag-section-subtitle">{scoredAnimals.length} animais com score calculado</p>
          </div>
          {scoredAnimals.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nenhum score calculado ainda.</p>
          ) : (
            <div className="space-y-4">
              {bandCounts.map(b => (
                <div key={b.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--text-secondary)]">{b.label}</span>
                    <span className="tabular-nums text-[var(--text-muted)]">{b.count} animal{b.count !== 1 ? "is" : ""}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div className={`h-full rounded-full transition-all ${b.color}`}
                      style={{ width: `${Math.round((b.count / maxBandCount) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Top 3 por score ── */}
        <section className="ag-card-strong p-8 space-y-5">
          <div>
            <h2 className="ag-section-title">Top 3 — Score</h2>
            <p className="ag-section-subtitle">Melhores animais por Agraas Score</p>
          </div>
          {top3.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nenhum score disponível.</p>
          ) : (
            <div className="space-y-4">
              {top3.map((a, i) => (
                <Link key={a.id} href={`/ovinos/${a.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)] transition group">
                  <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                      {a.internal_code ?? a.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{a.species}</p>
                  </div>
                  {a.certifications?.includes("Halal") && <HalalBadgeSVG size={28} />}
                  {a.score != null && <ScoreRing score={a.score} />}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
