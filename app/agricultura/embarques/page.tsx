import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Ship } from "lucide-react";

type Shipment = {
  id: string;
  contract_number: string | null;
  culture: string;
  quantity_tons: number;
  destination_country: string | null;
  destination_port: string | null;
  vessel_name: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  status: string;
};

type Tracking = {
  shipment_id: string;
  stage: string;
  stage_date: string;
  quantity_confirmed_tons: number | null;
  quantity_lost_tons: number;
  location_name: string | null;
};

const STAGE_ORDER = ["fazenda","armazem","transportadora","porto_origem","navio","porto_destino","entregue"];
const STAGE_LABEL: Record<string,string> = {
  fazenda:"Fazenda",armazem:"Armazém",transportadora:"Transportadora",
  porto_origem:"Porto Origem",navio:"Navio",porto_destino:"Porto Destino",entregue:"Entregue",
};
const CULTURE_LABEL: Record<string,string> = { soja:"Soja",milho:"Milho",trigo:"Trigo",acucar:"Açúcar",cafe:"Café" };
const STATUS_BADGE: Record<string,string> = {
  planejado:"bg-gray-100 text-gray-600 border-gray-200",
  carregando:"bg-blue-100 text-blue-700 border-blue-200",
  embarcado:"bg-indigo-100 text-indigo-700 border-indigo-200",
  em_transito:"bg-amber-100 text-amber-700 border-amber-200",
  entregue:"bg-emerald-100 text-emerald-700 border-emerald-200",
};
const STATUS_LABEL: Record<string,string> = {
  planejado:"Planejado",carregando:"Carregando",embarcado:"Embarcado",em_transito:"Em trânsito",entregue:"Entregue",
};

function fmtDate(d: string | null) { if (!d) return "—"; return new Date(d).toLocaleDateString("pt-BR"); }
function fmtTons(t: number) { return t.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

export default async function EmbarquesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: shipmentsData }, { data: trackingData }] = await Promise.all([
    supabase
      .from("crop_shipments")
      .select("id, contract_number, culture, quantity_tons, destination_country, destination_port, vessel_name, departure_date, arrival_date, status")
      .order("departure_date", { ascending: true }),
    supabase
      .from("crop_shipment_tracking")
      .select("shipment_id, stage, stage_date, quantity_confirmed_tons, quantity_lost_tons, location_name")
      .order("stage_date", { ascending: false }),
  ]);

  const shipments: Shipment[] = (shipmentsData ?? []) as Shipment[];
  const tracking: Tracking[] = (trackingData ?? []) as Tracking[];

  // Latest stage per shipment + latest confirmed qty
  const shipStageMap = new Map<string, string>();
  const shipConfirmedMap = new Map<string, number | null>();
  for (const t of tracking) {
    if (!shipStageMap.has(t.shipment_id)) {
      shipStageMap.set(t.shipment_id, t.stage);
      shipConfirmedMap.set(t.shipment_id, t.quantity_confirmed_tons);
    }
  }

  const active = shipments.filter(s => s.status !== "entregue");
  const delivered = shipments.filter(s => s.status === "entregue");

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <Ship size={20} className="text-[var(--primary)]" />
          </span>
          <div>
            <h1 className="ag-page-title leading-none">Embarques</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{active.length} ativo{active.length !== 1 ? "s" : ""} · {delivered.length} entregue{delivered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </section>

      {/* Shipment list with horizontal timeline */}
      {shipments.length === 0 && (
        <div className="ag-card-strong py-16 text-center text-sm text-[var(--text-muted)]">
          Nenhum embarque cadastrado.
        </div>
      )}

      {shipments.map(sh => {
        const currentStage = shipStageMap.get(sh.id) ?? null;
        const stageIdx = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;
        const confirmedTons = shipConfirmedMap.get(sh.id) ?? null;
        const lostTons = tracking.filter(t => t.shipment_id === sh.id).reduce((s, t) => s + t.quantity_lost_tons, 0);
        const confirmedPct = confirmedTons != null ? Math.min(100, (confirmedTons / sh.quantity_tons) * 100) : null;

        return (
          <section key={sh.id} className="ag-card-strong overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-8 py-5">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-[var(--text-primary)] text-lg">
                  {sh.contract_number ?? sh.id.slice(0, 8)}
                </p>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_BADGE[sh.status] ?? ""}`}>
                  {STATUS_LABEL[sh.status] ?? sh.status}
                </span>
              </div>
              <Link
                href={`/agricultura/${sh.id}`}
                className="text-sm font-semibold text-[var(--primary-hover)] hover:underline"
              >
                Ver detalhes →
              </Link>
            </div>

            <div className="p-8 space-y-6">
              {/* Info row */}
              <div className="flex flex-wrap gap-6 text-sm text-[var(--text-secondary)]">
                <span><span className="text-[var(--text-muted)] text-xs">Cultura</span><br /><strong className="text-[var(--text-primary)]">{CULTURE_LABEL[sh.culture] ?? sh.culture}</strong></span>
                <span><span className="text-[var(--text-muted)] text-xs">Quantidade</span><br /><strong className="text-[var(--text-primary)]">{fmtTons(sh.quantity_tons)} t</strong></span>
                {confirmedTons != null && (
                  <span><span className="text-[var(--text-muted)] text-xs">Confirmadas</span><br /><strong className="text-emerald-600">{fmtTons(confirmedTons)} t</strong></span>
                )}
                {lostTons > 0 && (
                  <span><span className="text-[var(--text-muted)] text-xs">Perdas</span><br /><strong className="text-red-500">{fmtTons(lostTons)} t</strong></span>
                )}
                <span><span className="text-[var(--text-muted)] text-xs">Destino</span><br /><strong className="text-[var(--text-primary)]">{sh.destination_port ?? sh.destination_country ?? "—"}</strong></span>
                {sh.vessel_name && (
                  <span><span className="text-[var(--text-muted)] text-xs">Navio</span><br /><strong className="text-[var(--text-primary)]">{sh.vessel_name}</strong></span>
                )}
                <span><span className="text-[var(--text-muted)] text-xs">Partida</span><br /><strong className="text-[var(--text-primary)]">{fmtDate(sh.departure_date)}</strong></span>
                {sh.arrival_date && (
                  <span><span className="text-[var(--text-muted)] text-xs">Chegada prevista</span><br /><strong className="text-[var(--text-primary)]">{fmtDate(sh.arrival_date)}</strong></span>
                )}
              </div>

              {/* Confirmed tons progress bar */}
              {confirmedPct != null && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--text-muted)]">Toneladas confirmadas</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{confirmedPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--border)]">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${confirmedPct}%` }} />
                  </div>
                </div>
              )}

              {/* Horizontal stage timeline */}
              <div className="flex items-start gap-0">
                {STAGE_ORDER.map((s, i) => {
                  const done    = stageIdx >= 0 && i <= stageIdx;
                  const current = i === stageIdx + 1;
                  return (
                    <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                      {/* Connector line + dot */}
                      <div className="flex w-full items-center">
                        <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done ? "bg-emerald-500" : "bg-[var(--border)]"}`} />
                        <div className={`h-3 w-3 rounded-full shrink-0 border-2 ${
                          done    ? "border-emerald-500 bg-emerald-500" :
                          current ? "border-blue-500 bg-blue-500 animate-pulse" :
                                    "border-[var(--border)] bg-white"
                        }`} />
                        <div className={`h-0.5 flex-1 ${i === STAGE_ORDER.length - 1 ? "opacity-0" : done ? "bg-emerald-500" : "bg-[var(--border)]"}`} />
                      </div>
                      <span className={`text-center text-[9px] font-semibold leading-tight whitespace-nowrap ${
                        done    ? "text-emerald-600" :
                        current ? "text-blue-600" :
                                  "text-[var(--text-muted)]"
                      }`}>
                        {STAGE_LABEL[s]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
