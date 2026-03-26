import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { TrendingUp, Weight, ShieldCheck, BarChart3, Info } from "lucide-react";
import MarketCalculator from "@/app/components/MarketCalculator";

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

const CEPEA_PRICES = [
  { produto: "Boi gordo (arroba carcaça)", preco: "R$ 330,00", unidade: "@", variacao: "+1,2%", up: true },
  { produto: "Bezerro",                    preco: "R$ 1.850,00", unidade: "cab.", variacao: "+0,8%", up: true },
  { produto: "Vaca gorda (arroba)",        preco: "R$ 290,00", unidade: "@", variacao: "-0,3%", up: false },
  { produto: "Novilho precoce",            preco: "R$ 340,00", unidade: "@", variacao: "+1,5%", up: true },
];

function formatSex(v: string | null) {
  if (!v) return "—";
  const m: Record<string, string> = { male: "🐂 Macho", female: "🐄 Fêmea", macho: "🐂 Macho", femea: "🐄 Fêmea", "fêmea": "🐄 Fêmea" };
  return m[v.toLowerCase()] ?? v;
}
function formatDate(v: string | null) { return v ? new Date(v).toLocaleDateString("pt-BR") : "—"; }
function formatStatus(v: string | null) {
  const m: Record<string, string> = { active: "Ativo", sold: "Vendido", slaughtered: "Abatido", inactive: "Inativo" };
  return m[(v ?? "").toLowerCase()] ?? (v ?? "—");
}
function statusCls(v: string | null) {
  const n = (v ?? "").toLowerCase();
  if (n === "active") return "ag-badge ag-badge-green";
  if (n === "sold")   return "ag-badge bg-blue-50 text-blue-700 border border-blue-200";
  return "ag-badge";
}

export default async function MarketPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("agraas_market_animals")
    .select("*")
    .order("total_score", { ascending: false });

  const animals: MarketAnimalRow[] = (data as MarketAnimalRow[] | null) ?? [];
  const totalAnimals   = animals.length;
  const avgScore       = totalAnimals > 0 ? Math.round(animals.reduce((a, r) => a + Number(r.total_score ?? 0), 0) / totalAnimals) : 0;
  const avgWeight      = totalAnimals > 0 ? Math.round(animals.reduce((a, r) => a + Number(r.last_weight ?? 0), 0) / totalAnimals) : 0;
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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Agraas Market</span>
            <h1 className="ag-page-title">Inteligência de Mercado</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Cotações CEPEA de referência, calculadora de valor do rebanho e visão comercial dos animais certificados.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/scores" className="ag-button-primary">Ver ranking</Link>
              <Link href="/animais" className="ag-button-secondary">Base animal</Link>
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

      {/* ── CEPEA Cotações ────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="ag-section-title">Cotações de referência</h2>
            <p className="ag-section-subtitle">Preços indicativos CEPEA — {today}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            <Info size={12} />
            Atualizar manualmente
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CEPEA_PRICES.map(p => (
            <div key={p.produto} className="ag-kpi-card">
              <p className="ag-kpi-label leading-snug">{p.produto}</p>
              <p className="ag-kpi-value text-[var(--primary)]">{p.preco}</p>
              <p className="sub">por {p.unidade}</p>
              <span className={`mt-1 inline-block text-xs font-semibold ${p.up ? "text-emerald-600" : "text-red-600"}`}>
                {p.variacao} (7d)
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Calculadora ───────────────────────────────────────────────────── */}
      <MarketCalculator totalAnimals={totalAnimals} avgWeight={avgWeight} />

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
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Animal</th>
                  <th className="text-left">Fazenda</th>
                  <th className="text-left">Sexo</th>
                  <th className="text-right">Peso</th>
                  <th className="text-center">Score</th>
                  <th className="text-left">Certificações</th>
                  <th className="text-center">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {animals.map(a => {
                  const score = Number(a.total_score ?? 0);
                  const scoreColor = score >= 70 ? "#5d9c44" : score >= 40 ? "#d9a343" : "#d64545";
                  return (
                    <tr key={a.animal_id} className="group">
                      <td>
                        <p className="font-semibold">{a.internal_code ?? a.animal_id}</p>
                        <p className="text-xs text-[var(--text-muted)]">{formatDate(a.birth_date)}</p>
                      </td>
                      <td className="max-w-[150px] truncate text-[var(--text-secondary)]">{a.property_name ?? "—"}</td>
                      <td className="text-sm">{formatSex(a.sex)}</td>
                      <td className="text-right tabular-nums font-medium">{a.last_weight ? `${a.last_weight} kg` : "—"}</td>
                      <td className="text-center">
                        <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border"
                          style={{ color: scoreColor, borderColor: scoreColor + "40", backgroundColor: scoreColor + "12" }}>
                          {score}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(a.certifications) && a.certifications.length > 0
                            ? a.certifications.slice(0, 2).map(c => <span key={c.code} className="ag-badge ag-badge-green text-[10px]">{c.name}</span>)
                            : <span className="ag-badge text-[10px]">Sem certificação</span>
                          }
                        </div>
                      </td>
                      <td className="text-center"><span className={statusCls(a.status)}>{formatStatus(a.status)}</span></td>
                      <td>
                        <Link href={`/animais/${a.animal_id}`}
                          className="text-xs font-medium text-[var(--primary)] opacity-0 group-hover:opacity-100 transition hover:underline">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
