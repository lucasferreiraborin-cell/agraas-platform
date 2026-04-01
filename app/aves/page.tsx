import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Bird, Plus, AlertTriangle } from "lucide-react";

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
  property_id: string | null;
};

type PropertyRow = { id: string; name: string };

const SPECIES_LABEL: Record<string, string> = { frango: "Frango", peru: "Peru", pato: "Pato" };

const STATUS_STYLE: Record<string, { bg: string; border: string; badge: string; label: string; dot: string }> = {
  alojado:       { bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700 border-blue-200",     label: "Alojado",         dot: "bg-blue-500"   },
  em_crescimento:{ bg: "bg-emerald-50",border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Em crescimento", dot: "bg-emerald-500"},
  pronto_abate:  { bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700 border-amber-200",   label: "Pronto p/ abate", dot: "bg-amber-500"  },
  abatido:       { bg: "bg-gray-50",   border: "border-gray-200",   badge: "bg-gray-100 text-gray-600 border-gray-200",      label: "Abatido",         dot: "bg-gray-400"   },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function AvesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: batchData }, { data: propertiesData }] = await Promise.all([
    supabase
      .from("poultry_batches")
      .select("id, batch_code, species, breed, housing_date, initial_count, current_count, mortality_count, average_weight_kg, feed_conversion, integrator_name, status, property_id")
      .order("housing_date", { ascending: false }),
    supabase.from("properties").select("id, name"),
  ]);

  const batches: BatchRow[]    = (batchData ?? []) as BatchRow[];
  const properties: PropertyRow[] = (propertiesData ?? []) as PropertyRow[];
  const propMap = new Map(properties.map(p => [p.id, p.name]));

  const active       = batches.filter(b => b.status !== "abatido");
  const totalBirds   = active.reduce((s, b) => s + b.current_count, 0);
  const mortalidades = batches.filter(b => b.initial_count > 0).map(b => (b.mortality_count / b.initial_count) * 100);
  const avgMortality = mortalidades.length > 0
    ? (mortalidades.reduce((s, m) => s + m, 0) / mortalidades.length).toFixed(1)
    : "—";
  const conversoes   = batches.filter(b => b.feed_conversion != null).map(b => b.feed_conversion!);
  const avgConversion = conversoes.length > 0
    ? (conversoes.reduce((s, c) => s + c, 0) / conversoes.length).toFixed(2)
    : "—";

  const kpis = [
    { label: "Lotes ativos",       value: active.length,   sub: "em produção",            color: "text-[var(--text-primary)]" },
    { label: "Aves alojadas",      value: totalBirds.toLocaleString("pt-BR"), sub: "cabeças ativas", color: "text-emerald-600" },
    { label: "Mortalidade média",  value: `${avgMortality}%`, sub: "do plantel",          color: avgMortality !== "—" && Number(avgMortality) > 5 ? "text-red-600" : "text-[var(--text-primary)]" },
    { label: "Conv. alimentar",    value: avgConversion,   sub: "kg ração / kg ganho",    color: "text-[var(--text-primary)]" },
  ];

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Pecuária Expandida</span>
            <h1 className="ag-page-title">Aves & Frangos</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Gestão por lote — frango, peru e pato. Acompanhe mortalidade, conversão alimentar e status de abate.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/aves/novo" className="ag-button-primary flex items-center gap-2">
                <Plus size={15} /> Novo lote
              </Link>
            </div>
          </div>
          <div className="ag-hero-panel">
            <div className="grid grid-cols-2 gap-3">
              {kpis.map(k => (
                <div key={k.label} className="ag-kpi-card">
                  <p className="ag-kpi-label">{k.label}</p>
                  <p className={`ag-kpi-value ${k.color}`}>{k.value}</p>
                  <p className="sub">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cards de lotes */}
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
              const style      = STATUS_STYLE[b.status] ?? STATUS_STYLE.alojado;
              const mortality  = b.initial_count > 0 ? ((b.mortality_count / b.initial_count) * 100).toFixed(1) : "—";
              const highMort   = Number(mortality) > 5;
              return (
                <Link
                  key={b.id}
                  href={`/aves/${b.id}`}
                  className={`block rounded-3xl border p-6 transition hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5 ${style.bg} ${style.border}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${style.dot}`} />
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                        {b.batch_code}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {SPECIES_LABEL[b.species] ?? b.species}{b.breed ? ` · ${b.breed}` : ""}
                      </p>
                      {b.integrator_name && (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{b.integrator_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {b.current_count.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">aves</p>
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
                      <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                        {b.feed_conversion != null ? b.feed_conversion : "—"}
                      </p>
                    </div>
                  </div>

                  {b.property_id && (
                    <p className="mt-3 text-xs text-[var(--text-muted)]">
                      {propMap.get(b.property_id) ?? ""}
                    </p>
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
