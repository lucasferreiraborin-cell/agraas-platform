import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Calendar, MapPin } from "lucide-react";
import PoultryEventForm from "@/app/components/PoultryEventForm";

type Batch = {
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
  notes: string | null;
  property_id: string | null;
};

type BatchEvent = {
  id: string;
  event_type: string;
  date: string;
  value: number | null;
  notes: string | null;
  operator: string | null;
};

type PropertyRow = { id: string; name: string };

const SPECIES_LABEL: Record<string, string> = { frango: "Frango", peru: "Peru", pato: "Pato" };

const STATUS_STYLE: Record<string, { badge: string; label: string; bg: string; border: string }> = {
  alojado:       { badge: "bg-blue-100 text-blue-700 border-blue-300",      label: "Alojado",         bg: "bg-blue-50",    border: "border-blue-200"    },
  em_crescimento:{ badge: "bg-emerald-100 text-emerald-700 border-emerald-300", label: "Em crescimento", bg: "bg-emerald-50", border: "border-emerald-200" },
  pronto_abate:  { badge: "bg-amber-100 text-amber-700 border-amber-300",   label: "Pronto p/ abate", bg: "bg-amber-50",   border: "border-amber-200"   },
  abatido:       { badge: "bg-gray-100 text-gray-600 border-gray-300",      label: "Abatido",         bg: "bg-gray-50",    border: "border-gray-200"    },
};

const EVENT_STYLE: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  vacina:     { icon: "💉", color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"    },
  racao:      { icon: "🌾", color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"   },
  mortalidade:{ icon: "⚠️", color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"     },
  pesagem:    { icon: "⚖️", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  abate:      { icon: "🏭", color: "text-gray-700",    bg: "bg-gray-50",    border: "border-gray-200"    },
};

const EVENT_LABEL: Record<string, string> = {
  vacina: "Vacinação", racao: "Ração", mortalidade: "Mortalidade", pesagem: "Pesagem", abate: "Abate",
};

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export default async function AveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: batchData }, { data: eventsData }, { data: propData }] = await Promise.all([
    supabase
      .from("poultry_batches")
      .select("id, batch_code, species, breed, housing_date, initial_count, current_count, mortality_count, average_weight_kg, feed_conversion, integrator_name, status, notes, property_id")
      .eq("id", id)
      .single(),
    supabase
      .from("poultry_batch_events")
      .select("id, event_type, date, value, notes, operator")
      .eq("batch_id", id)
      .order("date", { ascending: true }),
    supabase.from("properties").select("id, name"),
  ]);

  if (!batchData) notFound();

  const batch: Batch        = batchData as Batch;
  const events: BatchEvent[] = (eventsData ?? []) as BatchEvent[];
  const propMap = new Map(((propData ?? []) as PropertyRow[]).map(p => [p.id, p.name]));

  const style      = STATUS_STYLE[batch.status] ?? STATUS_STYLE.alojado;
  const mortality  = batch.initial_count > 0 ? ((batch.mortality_count / batch.initial_count) * 100).toFixed(1) : "—";
  const highMort   = Number(mortality) > 5;

  // Pesagens para gráfico de evolução
  const weighings = events
    .filter(e => e.event_type === "pesagem" && e.value != null)
    .map(e => ({ date: e.date, kg: e.value! }));
  const maxKg = Math.max(...weighings.map(w => w.kg), 0.1);

  const kpis = [
    { label: "Aves atuais",       value: batch.current_count.toLocaleString("pt-BR"), sub: "cabeças", color: "text-emerald-600" },
    { label: "Mortalidade",       value: `${mortality}%`, sub: `${batch.mortality_count} aves`,      color: highMort ? "text-red-600" : "text-[var(--text-primary)]" },
    { label: "Peso médio",        value: batch.average_weight_kg != null ? `${batch.average_weight_kg} kg` : "—", sub: "último registro", color: "text-[var(--text-primary)]" },
    { label: "Conv. alimentar",   value: batch.feed_conversion != null ? `${batch.feed_conversion}` : "—", sub: "kg ração / kg ganho", color: "text-[var(--text-primary)]" },
  ];

  return (
    <main className="space-y-8">
      <Link href="/aves" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
        <ArrowLeft size={14} /> Aves & Frangos
      </Link>

      {/* Header */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="ag-badge ag-badge-green">{SPECIES_LABEL[batch.species] ?? batch.species}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${style.badge}`}>{style.label}</span>
              </div>
              <h1 className="ag-page-title mt-4">{batch.batch_code}</h1>
              <div className="mt-3 flex flex-wrap gap-5 text-sm text-[var(--text-secondary)]">
                {batch.breed && <span>{batch.breed}</span>}
                {batch.integrator_name && <span>{batch.integrator_name}</span>}
                <span className="flex items-center gap-1.5"><Calendar size={13} />Alojamento: {formatDate(batch.housing_date)}</span>
                {batch.property_id && (
                  <span className="flex items-center gap-1.5"><MapPin size={13} />{propMap.get(batch.property_id) ?? "—"}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                {batch.initial_count.toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-[var(--text-muted)]">alojados inicialmente</p>
            </div>
          </div>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{k.label}</p>
              <p className={`mt-1 text-2xl font-bold tracking-tight ${k.color}`}>{k.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{k.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Evolução de peso */}
        {weighings.length > 0 && (
          <section className="ag-card-strong p-8 space-y-5">
            <div>
              <h2 className="ag-section-title">Evolução de peso médio</h2>
              <p className="ag-section-subtitle">Pesagens registradas no ciclo</p>
            </div>
            <div className="space-y-3">
              {weighings.map((w, i) => {
                const pct  = Math.round((w.kg / maxKg) * 100);
                const color = w.kg >= 2.5 ? "#2d9b6f" : w.kg >= 1.5 ? "#d4930a" : "#3b82f6";
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-[var(--text-muted)]">{formatDate(w.date)}</span>
                    <div className="flex-1 h-7 rounded-xl bg-[var(--surface-soft)] overflow-hidden">
                      <div className="h-full rounded-xl flex items-center px-3 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }}>
                        <span className="text-[11px] font-bold text-white">{w.kg} kg</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Meta abate frango: ~2,8 kg</p>
          </section>
        )}

        {/* Alertas de mortalidade */}
        {highMort && (
          <section className="ag-card-strong p-8 space-y-4">
            <h2 className="ag-section-title flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} /> Alerta de mortalidade
            </h2>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-semibold text-red-700">Mortalidade acima de 5%</p>
              <p className="mt-1 text-sm text-red-600">
                {batch.mortality_count} aves perdidas de {batch.initial_count.toLocaleString("pt-BR")} alojadas ({mortality}%).
                Verificar causas nos eventos registrados.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Timeline de eventos */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Timeline de eventos</h2>
            <p className="ag-section-subtitle">Histórico de vacinas, pesagens, ração e mortalidade</p>
          </div>
          <PoultryEventForm batchId={batch.id} />
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhum evento registrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...events].reverse().map(ev => {
              const s = EVENT_STYLE[ev.event_type] ?? { icon: "📋", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" };
              return (
                <div key={ev.id} className={`flex items-start gap-4 rounded-2xl border p-4 ${s.bg} ${s.border}`}>
                  <span className="text-xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`text-sm font-semibold ${s.color}`}>{EVENT_LABEL[ev.event_type] ?? ev.event_type}</span>
                      {ev.value != null && (
                        <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                          {ev.event_type === "pesagem" ? `${ev.value} kg` :
                           ev.event_type === "mortalidade" ? `${ev.value} aves` :
                           ev.event_type === "racao" ? `${ev.value} kg ração` :
                           ev.value}
                        </span>
                      )}
                      {ev.operator && (
                        <span className="text-xs text-[var(--text-muted)]">{ev.operator}</span>
                      )}
                    </div>
                    {ev.notes && <p className="mt-1 text-sm text-[var(--text-secondary)]">{ev.notes}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatDate(ev.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Seção de abate */}
      {batch.status === "abatido" && (
        <section className="ag-card-strong p-8 space-y-4">
          <h2 className="ag-section-title">Registro de abate</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="ag-kpi-card">
              <p className="ag-kpi-label">Aves abatidas</p>
              <p className="ag-kpi-value">{batch.current_count.toLocaleString("pt-BR")}</p>
              <p className="sub">de {batch.initial_count.toLocaleString("pt-BR")} alojadas</p>
            </div>
            <div className="ag-kpi-card">
              <p className="ag-kpi-label">Peso médio final</p>
              <p className="ag-kpi-value">{batch.average_weight_kg != null ? `${batch.average_weight_kg} kg` : "—"}</p>
              <p className="sub">por cabeça</p>
            </div>
            <div className="ag-kpi-card">
              <p className="ag-kpi-label">Conversão alimentar</p>
              <p className="ag-kpi-value">{batch.feed_conversion != null ? batch.feed_conversion : "—"}</p>
              <p className="sub">kg ração / kg ganho</p>
            </div>
          </div>
          {batch.notes && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">{batch.notes}</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
