import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Wheat, Ship, Layers, Warehouse, Plus } from "lucide-react";

const AgricultureMap = dynamic(
  async () => (await import("@/app/components/AgricultureMap")).default,
  {
    ssr: false,
    loading: () => <div style={{ height: "400px", background: "#f0f4ef", borderRadius: "8px" }} />,
  }
);

type Farm     = { id: string; name: string; city: string; state: string; lat: number; lng: number; total_area_ha: number | null };
type Field    = { id: string; field_code: string; field_name: string | null; culture: string; area_ha: number | null; status: string; polygon_coordinates: { lat: number; lng: number }[] | null; farm_id: string };
type Shipment = { id: string; contract_number: string | null; culture: string; quantity_tons: number; destination_country: string | null; destination_port: string | null; vessel_name: string | null; departure_date: string | null; status: string };
type Tracking = { shipment_id: string; stage: string; stage_date: string };

const STAGE_ORDER = ["fazenda","armazem","transportadora","porto_origem","navio","porto_destino","entregue"];
const STAGE_LABEL: Record<string,string> = { fazenda:"Fazenda",armazem:"Armazém",transportadora:"Transportadora",porto_origem:"Porto Origem",navio:"Navio",porto_destino:"Porto Destino",entregue:"Entregue" };
const CULTURE_LABEL: Record<string,string> = { soja:"Soja",milho:"Milho",trigo:"Trigo",acucar:"Açúcar",cafe:"Café" };
const STATUS_BADGE: Record<string,string> = {
  planejado:"bg-gray-100 text-gray-600 border-gray-200", carregando:"bg-blue-100 text-blue-700 border-blue-200",
  embarcado:"bg-indigo-100 text-indigo-700 border-indigo-200", em_transito:"bg-amber-100 text-amber-700 border-amber-200",
  entregue:"bg-emerald-100 text-emerald-700 border-emerald-200",
};
const STATUS_LABEL: Record<string,string> = { planejado:"Planejado",carregando:"Carregando",embarcado:"Embarcado",em_transito:"Em trânsito",entregue:"Entregue" };

function fmtDate(d: string | null) { if (!d) return "—"; return new Date(d).toLocaleDateString("pt-BR"); }
function fmtTons(t: number) { return t.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

export default async function AgriculturaPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: farmsData },
    { data: fieldsData },
    { data: shipmentsData },
    { data: trackingData },
  ] = await Promise.all([
    supabase.from("farms_agriculture").select("id, name, city, state, lat, lng, total_area_ha").eq("status","active"),
    supabase.from("crop_fields").select("id, field_code, field_name, culture, area_ha, status, polygon_coordinates, farm_id"),
    supabase.from("crop_shipments").select("id, contract_number, culture, quantity_tons, destination_country, destination_port, vessel_name, departure_date, status").order("departure_date", { ascending: true }),
    supabase.from("crop_shipment_tracking").select("shipment_id, stage, stage_date").order("stage_date", { ascending: false }),
  ]);

  const farms:     Farm[]     = (farmsData ?? []) as Farm[];
  const fields:    Field[]    = (fieldsData ?? []) as Field[];
  const shipments: Shipment[] = (shipmentsData ?? []) as Shipment[];
  const tracking:  Tracking[] = (trackingData ?? []) as Tracking[];

  const active     = shipments.filter(s => s.status !== "entregue");
  const totalTons  = shipments.filter(s => s.status === "entregue").reduce((s, sh) => s + sh.quantity_tons, 0);
  const inProd     = fields.filter(f => ["plantado","em_desenvolvimento"].includes(f.status)).length;
  const farmCount  = farms.length;

  // Current stage per shipment
  const shipStageMap = new Map<string, string>();
  for (const t of tracking) {
    if (!shipStageMap.has(t.shipment_id)) shipStageMap.set(t.shipment_id, t.stage);
  }

  const kpis = [
    { label: "Fazendas ativas",       value: farmCount,         sub: "em produção",          icon: Wheat,     color: "text-emerald-600" },
    { label: "Talhões em produção",   value: inProd,            sub: "plantados / crescendo", icon: Layers,    color: "text-blue-600" },
    { label: "Toneladas embarcadas",  value: fmtTons(totalTons),sub: "safra atual",           icon: Ship,      color: "text-indigo-600" },
    { label: "Embarques ativos",      value: active.length,     sub: "em andamento",          icon: Warehouse, color: "text-amber-600" },
  ];

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Módulo Agricultura</span>
            <h1 className="ag-page-title">Dashboard Agrícola</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Rastreabilidade de grãos da fazenda ao porto — soja, milho, trigo e cafés especiais.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/agricultura/embarques" className="ag-button-primary flex items-center gap-2"><Ship size={15} /> Ver embarques</Link>
              <Link href="/agricultura/talhoes" className="ag-button-secondary flex items-center gap-2"><Layers size={15} /> Talhões</Link>
            </div>
          </div>
          <div className="ag-hero-panel">
            <div className="grid grid-cols-2 gap-3">
              {kpis.map(k => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="ag-kpi-card">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                      <Icon size={17} className="text-[var(--primary)]" />
                    </div>
                    <p className="mt-3 ag-kpi-label">{k.label}</p>
                    <p className={`ag-kpi-value ${k.color}`}>{k.value}</p>
                    <p className="sub">{k.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Mapa Leaflet */}
      <section className="ag-card-strong overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
          <div>
            <h2 className="ag-section-title">Mapa de Talhões</h2>
            <p className="ag-section-subtitle">Fazendas e talhões — clique para detalhes</p>
          </div>
          <div className="flex gap-2">
            {[{l:"Soja",c:"bg-emerald-500"},{l:"Milho",c:"bg-amber-500"},{l:"Trigo",c:"bg-amber-900"}].map(x => (
              <span key={x.l} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span className={`h-2.5 w-2.5 rounded-full ${x.c}`} />{x.l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ height: 400 }}>
          <AgricultureMap farms={farms} fields={fields} />
        </div>
      </section>

      {/* Embarques ativos */}
      {active.length > 0 && (
        <section className="ag-card-strong p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="ag-section-title">Embarques ativos</h2>
            <Link href="/agricultura/embarques" className="text-sm font-semibold text-[var(--primary-hover)] hover:underline">Ver todos →</Link>
          </div>
          <div className="space-y-4">
            {active.map(sh => {
              const currentStage = shipStageMap.get(sh.id) ?? null;
              const stageIdx     = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;
              return (
                <Link key={sh.id} href={`/agricultura/${sh.id}`}
                  className="block rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)] transition group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                          {sh.contract_number ?? sh.id.slice(0,8)}
                        </p>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_BADGE[sh.status] ?? ""}`}>
                          {STATUS_LABEL[sh.status] ?? sh.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {CULTURE_LABEL[sh.culture] ?? sh.culture} · {fmtTons(sh.quantity_tons)} t → {sh.destination_port ?? sh.destination_country ?? "—"}
                      </p>
                      {sh.vessel_name && <p className="text-xs text-[var(--text-muted)]">{sh.vessel_name} · {fmtDate(sh.departure_date)}</p>}
                    </div>
                  </div>
                  {/* Mini stage bar */}
                  <div className="mt-4 flex items-center gap-1">
                    {STAGE_ORDER.map((s, i) => {
                      const done    = stageIdx >= 0 && i <= stageIdx;
                      const current = i === stageIdx + 1;
                      return (
                        <div key={s} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`h-1.5 w-full rounded-full ${done ? "bg-emerald-500" : current ? "bg-blue-500 animate-pulse" : "bg-[var(--border)]"}`} />
                          {current && <span className="text-[9px] font-bold text-blue-600 whitespace-nowrap">{STAGE_LABEL[s]}</span>}
                        </div>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
