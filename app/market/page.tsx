import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCotacaoArroba } from "@/lib/cotacao";
import Link from "next/link";
import { TrendingUp, Weight, ShieldCheck, BarChart3, Info } from "lucide-react";
import MarketCalculator from "@/app/components/MarketCalculator";
import MarketTable, { type MarketRow } from "@/app/components/MarketTable";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { PageHeader } from "@/app/components/ui/PageHeader";

type MarketAnimalRow = {
  animal_id: string;
  internal_code: string | null;
  sex: string | null;
  birth_date: string | null;
  property_name: string | null;
  total_score: number | null;
  sanitary_score: number | null;
  operational_score: number | null;
  continuity_score: number | null;
  last_weight: number | null;
  certifications: { code: string; name: string }[] | null;
  status: string | null;
};

type CepeaPrice = { produto: string; preco: string; unidade: string; updated_at: string | null };
type WeightRow = { animal_id: string; weight: number; weighing_date: string | null };
type HalalCert = { animal_id: string };

export default async function MarketPage() {
  const supabase = await createSupabaseServerClient();
  const cotacaoSnap = await getCotacaoArroba();
  const [
    { data, error },
    { data: weightsData },
    { data: halalData },
    { data: settingsData },
  ] = await Promise.all([
    supabase
      .from("agraas_market_animals")
      .select("*")
      .order("total_score", { ascending: false }),
    supabase
      .from("weights")
      .select("animal_id, weight, weighing_date")
      .order("weighing_date", { ascending: false }),
    supabase
      .from("animal_certifications")
      .select("animal_id")
      .eq("certification_name", "Halal")
      .eq("status", "active"),
    supabase
      .from("platform_settings")
      .select("key, value, updated_at")
      .in("key", ["cotacao_arroba", "cotacao_boi_gordo", "cotacao_bezerro", "cotacao_vaca_gorda", "cotacao_novilho_precoce"]),
  ]);

  const rawAnimals: MarketAnimalRow[] = (data as MarketAnimalRow[] | null) ?? [];

  // Mapa de último peso real por animal
  const latestWeight = new Map<string, number>();
  for (const w of (weightsData ?? []) as WeightRow[]) {
    if (!latestWeight.has(w.animal_id) && w.weight > 0) {
      latestWeight.set(w.animal_id, w.weight);
    }
  }

  // Set de animais com Halal ativo
  const halalSet = new Set(((halalData ?? []) as HalalCert[]).map(h => h.animal_id));

  // Mescla last_weight real e flag halal
  const animals = rawAnimals.map(a => ({
    ...a,
    last_weight: latestWeight.get(a.animal_id) ?? a.last_weight ?? null,
    has_halal: halalSet.has(a.animal_id) || (a.certifications?.some(c => c.name?.toLowerCase().includes("halal")) ?? false),
  }));

  const settings = new Map((settingsData ?? []).map((s: { key: string; value: string; updated_at: string | null }) => [s.key, s]));
  const fmtPrice = (v: string | undefined) => v ? `R$ ${Number(v).toFixed(2).replace(".", ",")}` : "—";
  const cepeaPrices: CepeaPrice[] = [
    { produto: "Boi gordo (arroba carcaça)", preco: fmtPrice(settings.get("cotacao_boi_gordo")?.value ?? settings.get("cotacao_arroba")?.value), unidade: "@", updated_at: settings.get("cotacao_boi_gordo")?.updated_at ?? settings.get("cotacao_arroba")?.updated_at ?? null },
    { produto: "Bezerro",                    preco: fmtPrice(settings.get("cotacao_bezerro")?.value),        unidade: "cab.", updated_at: settings.get("cotacao_bezerro")?.updated_at ?? null },
    { produto: "Vaca gorda (arroba)",        preco: fmtPrice(settings.get("cotacao_vaca_gorda")?.value),     unidade: "@",    updated_at: settings.get("cotacao_vaca_gorda")?.updated_at ?? null },
    { produto: "Novilho precoce",            preco: fmtPrice(settings.get("cotacao_novilho_precoce")?.value), unidade: "@",   updated_at: settings.get("cotacao_novilho_precoce")?.updated_at ?? null },
  ];
  const totalAnimals   = animals.length;
  const withScore      = animals.filter(a => Number(a.total_score ?? 0) > 0);
  const avgScore       = withScore.length > 0 ? Math.round(withScore.reduce((a, r) => a + Number(r.total_score), 0) / withScore.length) : 0;
  // Peso médio só de animais com pesagem real (>0)
  const withWeight     = animals.filter(a => a.last_weight != null && a.last_weight > 0);
  const avgWeight      = withWeight.length > 0
    ? Math.round(withWeight.reduce((a, r) => a + Number(r.last_weight), 0) / withWeight.length)
    : 0;
  const certifiedCount = animals.filter(a => Array.isArray(a.certifications) && a.certifications.length > 0).length;
  const pctCert        = totalAnimals > 0 ? Math.round((certifiedCount / totalAnimals) * 100) : 0;

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const kpis = [
    { label: "Animais disponíveis", value: totalAnimals,         sub: "no market",          icon: BarChart3,   iconBg: "bg-[var(--primary-soft)]", iconCl: "text-[var(--primary)]" },
    { label: "Score médio",         value: avgScore,              sub: "qualidade da base",  icon: TrendingUp,  iconBg: "bg-blue-50",               iconCl: "text-blue-600"         },
    { label: "Peso médio",          value: `${avgWeight} kg`,     sub: "estimativa de mercado", icon: Weight,   iconBg: "bg-amber-50",              iconCl: "text-amber-600"        },
    { label: "Certificados",        value: `${certifiedCount} (${pctCert}%)`, sub: "com chancela", icon: ShieldCheck, iconBg: "bg-emerald-50",     iconCl: "text-emerald-600"      },
  ];

  return (
    <main className="space-y-8">

      <PageHeader
        badge="Agraas Market"
        title="Inteligência de Mercado"
        description="Cotações CEPEA de referência, calculadora de valor do rebanho e visão comercial dos animais certificados."
        actions={
          <>
            <Link href="/scores" className="ag-button-primary">Ver ranking</Link>
            <Link href="/animais" className="ag-button-secondary">Base animal</Link>
          </>
        }
        panel={
          <div className="grid gap-3 sm:grid-cols-2">
            {kpis.map(kpi => (
              <KpiCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                sub={kpi.sub}
                icon={kpi.icon}
                iconBg={kpi.iconBg}
              />
            ))}
          </div>
        }
      />

      {/* ── CEPEA Cotações ────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="ag-section-title">Cotações de referência</h2>
            <p className="ag-section-subtitle">Preços indicativos CEPEA — {today}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
            <Info size={12} />
            Dados via CEPEA / cotação manual
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cepeaPrices.map(p => (
            <div key={p.produto} className="ag-kpi-card">
              <p className="ag-kpi-label leading-snug">{p.produto}</p>
              <p className="ag-kpi-value text-[var(--primary)]">{p.preco}</p>
              <p className="sub">por {p.unidade}</p>
              {p.updated_at && (
                <span className="mt-1 inline-block text-[10px] text-[var(--text-muted)]">
                  Atualizado: {new Date(p.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Calculadora ───────────────────────────────────────────────────── */}
      <MarketCalculator totalAnimals={totalAnimals} avgWeight={avgWeight} cotacaoAtual={cotacaoSnap.value} />

      {/* ── Animais elegíveis ─────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Animais elegíveis</h2>
            <p className="ag-section-subtitle">Score, peso, propriedade e certificações</p>
          </div>
          <span className="ag-badge">{totalAnimals} ativos</span>
        </div>

        {error ? (
          <p className="text-sm text-[var(--danger)]">Erro ao carregar o marketplace.</p>
        ) : animals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhum animal disponível.</p>
          </div>
        ) : (
          <MarketTable rows={animals as MarketRow[]} />
        )}
      </section>
    </main>
  );
}
