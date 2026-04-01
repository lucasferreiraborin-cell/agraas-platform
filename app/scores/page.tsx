import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Trophy, TrendingUp, ShieldCheck, Star } from "lucide-react";
import ScoresFilter from "@/app/components/ScoresFilter";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type ScoreRow = {
  animal_id: string;
  internal_code: string | null;
  total_score: number | null;
  current_property_name: string | null;
  active_certifications: string[] | null;
  animal_status: string | null;
  sex: string | null;
  breed: string | null;
};
type AnimalBaseRow = { id: string; agraas_id: string | null; birth_date: string | null };
type Row = ScoreRow & { agraas_id: string | null; birth_date: string | null };

function ScoreCircleLarge({ score, size = 72 }: { score: number; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.max(0, Math.min(100, score)) / 100 * circ;
  const color = score >= 70 ? "#5d9c44" : score >= 40 ? "#d9a343" : "#d64545";
  const track = score >= 70 ? "#e0f0d8" : score >= 40 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default async function ScoresPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: scoreData },
    { data: animalBaseData },
  ] = await Promise.all([
    supabase.from("agraas_master_passport")
      .select("animal_id, internal_code, total_score, current_property_name, active_certifications, animal_status, sex, breed")
      .order("total_score", { ascending: false })
      .limit(100),
    supabase.from("animals").select("id, agraas_id, birth_date"),
  ]);

  const rawRows: ScoreRow[] = (scoreData as ScoreRow[] | null) ?? [];
  const baseMap = new Map((animalBaseData as AnimalBaseRow[] | null ?? []).map(a => [a.id, a]));

  const rows: Row[] = rawRows.map(item => ({
    ...item,
    agraas_id:  baseMap.get(item.animal_id)?.agraas_id  ?? null,
    birth_date: baseMap.get(item.animal_id)?.birth_date ?? null,
  }));

  const withScore   = rows.filter(r => typeof r.total_score === "number");
  const avgScore    = withScore.length > 0 ? Math.round(withScore.reduce((a, r) => a + Number(r.total_score), 0) / withScore.length) : 0;
  const topScore    = withScore.length > 0 ? Math.max(...withScore.map(r => Number(r.total_score))) : 0;
  const certified   = rows.filter(r => Array.isArray(r.active_certifications) && r.active_certifications.length > 0).length;
  const pctCert     = rows.length > 0 ? Math.round((certified / rows.length) * 100) : 0;

  // Distribuição por faixa
  const ranges = [
    { label: "0–20",   min: 0,  max: 20  },
    { label: "20–40",  min: 20, max: 40  },
    { label: "40–60",  min: 40, max: 60  },
    { label: "60–80",  min: 60, max: 80  },
    { label: "80–100", min: 80, max: 101 },
  ].map(r => ({ ...r, count: withScore.filter(row => Number(row.total_score) >= r.min && Number(row.total_score) < r.max).length }));
  const maxCount = Math.max(...ranges.map(r => r.count), 1);

  const colorForRange = (min: number) =>
    min >= 80 ? "#5d9c44" : min >= 60 ? "#8dbc5f" : min >= 40 ? "#d9a343" : min >= 20 ? "#f59e0b" : "#d64545";

  // Fazendas únicas para o filtro
  const fazendas = Array.from(new Set(rows.map(r => r.current_property_name).filter(Boolean) as string[])).sort();

  // Pódio
  const podium = rows.slice(0, 3);

  const kpis = [
    { label: "Animais ranqueados", value: rows.length,      sub: "total avaliado",         icon: Trophy,      iconBg: "bg-[var(--primary-soft)]", iconCl: "text-[var(--primary)]" },
    { label: "Score médio",        value: avgScore,          sub: "média da base",           icon: TrendingUp,  iconBg: "bg-blue-50",               iconCl: "text-blue-600"         },
    { label: "Certificados",       value: `${certified} (${pctCert}%)`, sub: "com conformidade",  icon: ShieldCheck, iconBg: "bg-emerald-50",            iconCl: "text-emerald-600"      },
    { label: "Melhor score",       value: topScore,          sub: "maior nível de confiança", icon: Star,        iconBg: "bg-amber-50",              iconCl: "text-amber-600"        },
  ];

  return (
    <main className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Ranking Agraas</span>
            <h1 className="ag-page-title">Ranking de Score Animal</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Score 0–100 baseado em sanidade, operacional e rastreabilidade. Filtre por fazenda ou categoria.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">Ver animais</Link>
              <Link href="/market" className="ag-button-secondary">Agraas Market</Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-3 sm:grid-cols-2">
              {kpis.map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="ag-kpi-card">
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                      <Icon size={17} className={kpi.iconCl} />
                    </div>
                    <p className="mt-3 ag-kpi-label">{kpi.label}</p>
                    <p className="ag-kpi-value">{kpi.value}</p>
                    <p className="sub">{kpi.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Gráfico de distribuição ───────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div>
          <h2 className="ag-section-title">Distribuição de scores</h2>
          <p className="ag-section-subtitle">Concentração de animais por faixa de pontuação</p>
        </div>
        <div className="space-y-3">
          {ranges.map(r => {
            const pct = Math.round((r.count / maxCount) * 100);
            const color = colorForRange(r.min);
            return (
              <div key={r.label} className="flex items-center gap-4">
                <span className="w-14 shrink-0 text-xs font-medium text-[var(--text-muted)]">{r.label}</span>
                <div className="flex-1 h-7 rounded-xl bg-[var(--surface-soft)] overflow-hidden">
                  <div className="h-full rounded-xl transition-all duration-500 flex items-center px-3"
                    style={{ width: `${Math.max(pct, r.count > 0 ? 4 : 0)}%`, backgroundColor: color }}>
                    {r.count > 0 && (
                      <span className="text-[11px] font-bold text-white">{r.count}</span>
                    )}
                  </div>
                </div>
                <span className="w-8 text-right text-sm font-semibold text-[var(--text-primary)] tabular-nums">{r.count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pódio ─────────────────────────────────────────────────────────── */}
      {podium.length > 0 && (
        <section className="ag-card-strong p-8 space-y-5">
          <h2 className="ag-section-title">Pódio da base</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {podium.map((item, i) => {
              const score = Number(item.total_score ?? 0);
              const medal = ["🥇","🥈","🥉"][i];
              return (
                <Link key={item.animal_id} href={`/animais/${item.animal_id}`}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--primary)]/30 hover:bg-[var(--primary-soft)] transition">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{medal}</span>
                    <div className="flex items-center gap-2">
                      <ScoreCircleLarge score={Math.round(score)} size={60} />
                      {item.active_certifications?.some(c => c.toLowerCase().includes("halal"))
                        ? <HalalBadgeSVG size={60} />
                        : <div style={{ width: 60, height: 60 }} />
                      }
                    </div>
                  </div>
                  <p className="mt-3 font-semibold text-[var(--text-primary)]">{item.internal_code ?? item.animal_id}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.current_property_name ?? "—"}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(item.active_certifications ?? []).slice(0, 2).map(c => (
                      <span key={c} className="ag-badge ag-badge-green text-[10px]">{c}</span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tabela com filtros (client component) ─────────────────────────── */}
      <ScoresFilter rows={rows} fazendas={fazendas} />

    </main>
  );
}
