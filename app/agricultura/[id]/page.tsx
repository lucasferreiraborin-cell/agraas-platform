import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { Ship, MapPin, FileText, CheckCircle2, Clock, Circle } from "lucide-react";
import CropCheckpointForm from "@/app/components/CropCheckpointForm";

type Shipment = {
  id: string;
  contract_number: string | null;
  culture: string;
  quantity_tons: number;
  destination_country: string | null;
  destination_port: string | null;
  origin_port: string | null;
  vessel_name: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  status: string;
};

type Tracking = {
  id: string;
  stage: string;
  stage_date: string;
  quantity_confirmed_tons: number | null;
  quantity_lost_tons: number;
  loss_cause: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  responsible_name: string | null;
  notes: string | null;
};

type StorageMovement = {
  id: string;
  movement_type: string;
  quantity_tons: number;
  humidity_pct: number | null;
  impurity_pct: number | null;
  classification: string | null;
  nfe_key: string | null;
  responsible: string | null;
  movement_date: string;
  notes: string | null;
};

const STAGE_ORDER = ["fazenda","armazem","transportadora","porto_origem","navio","porto_destino","entregue"];
const STAGE_LABEL: Record<string,string> = {
  fazenda:"Fazenda", armazem:"Armazém", transportadora:"Transportadora",
  porto_origem:"Porto Origem", navio:"Navio", porto_destino:"Porto Destino", entregue:"Entregue",
};
const CULTURE_LABEL: Record<string,string> = { soja:"Soja", milho:"Milho", trigo:"Trigo", acucar:"Açúcar", cafe:"Café" };
const STATUS_BADGE: Record<string,string> = {
  planejado:"bg-gray-100 text-gray-600 border-gray-200",
  carregando:"bg-blue-100 text-blue-700 border-blue-200",
  embarcado:"bg-indigo-100 text-indigo-700 border-indigo-200",
  em_transito:"bg-amber-100 text-amber-700 border-amber-200",
  entregue:"bg-emerald-100 text-emerald-700 border-emerald-200",
};
const STATUS_LABEL: Record<string,string> = {
  planejado:"Planejado", carregando:"Carregando", embarcado:"Embarcado",
  em_transito:"Em trânsito", entregue:"Entregue",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function fmtTons(t: number) {
  return t.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}
function maskNfe(key: string) {
  if (key.length < 10) return key;
  return key.slice(0, 6) + "..." + key.slice(-6);
}

export default async function EmbarqueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: shipData }, { data: trackingData }, { data: movementsData }] = await Promise.all([
    supabase
      .from("crop_shipments")
      .select("id, contract_number, culture, quantity_tons, destination_country, destination_port, origin_port, vessel_name, departure_date, arrival_date, status, field_id, storage_id")
      .eq("id", id)
      .single(),
    supabase
      .from("crop_shipment_tracking")
      .select("id, stage, stage_date, quantity_confirmed_tons, quantity_lost_tons, loss_cause, location_name, location_lat, location_lng, responsible_name, notes")
      .eq("shipment_id", id)
      .order("stage_date", { ascending: false }),
    supabase
      .from("crop_storage_movements")
      .select("id, movement_type, quantity_tons, humidity_pct, impurity_pct, classification, nfe_key, responsible, movement_date, notes")
      .order("movement_date", { ascending: true }),
  ]);

  if (!shipData) notFound();

  const sh = shipData as Shipment;
  const tracking: Tracking[] = (trackingData ?? []) as Tracking[];
  const movements: StorageMovement[] = (movementsData ?? []) as StorageMovement[];

  // Current stage
  const latestTracking = tracking[0] ?? null;
  const currentStage = latestTracking?.stage ?? null;
  const stageIdx = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;

  // KPIs
  const totalConfirmed = latestTracking?.quantity_confirmed_tons ?? null;
  const totalLost = tracking.reduce((s, t) => s + t.quantity_lost_tons, 0);
  const pctDelivered = totalConfirmed != null ? Math.min(100, (totalConfirmed / sh.quantity_tons) * 100) : 0;

  return (
    <main className="space-y-8">
      {/* Header */}
      <section className="ag-card-strong p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                <Ship size={20} className="text-[var(--primary)]" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Embarque</p>
                <h1 className="ag-page-title leading-none">{sh.contract_number ?? sh.id.slice(0, 8)}</h1>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_BADGE[sh.status] ?? ""}`}>
                {STATUS_LABEL[sh.status] ?? sh.status}
              </span>
            </div>
            <p className="mt-2 ml-[52px] text-sm text-[var(--text-secondary)]">
              {CULTURE_LABEL[sh.culture] ?? sh.culture} · {fmtTons(sh.quantity_tons)} t
              {sh.origin_port ? ` · ${sh.origin_port}` : ""}
              {sh.destination_port ? ` → ${sh.destination_port}` : sh.destination_country ? ` → ${sh.destination_country}` : ""}
            </p>
            {sh.vessel_name && (
              <p className="mt-0.5 ml-[52px] text-xs text-[var(--text-muted)]">
                {sh.vessel_name} · Partida: {fmtDate(sh.departure_date)}{sh.arrival_date ? ` · Chegada: ${fmtDate(sh.arrival_date)}` : ""}
              </p>
            )}
          </div>
          <CropCheckpointForm shipmentId={sh.id} currentStage={currentStage} />
        </div>
      </section>

      {/* KPI bar */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Toneladas originais",  value: fmtTons(sh.quantity_tons) + " t",  color: "text-[var(--text-primary)]" },
          { label: "Toneladas confirmadas", value: totalConfirmed != null ? fmtTons(totalConfirmed) + " t" : "—", color: "text-emerald-600" },
          { label: "Perdas registradas",   value: totalLost > 0 ? fmtTons(totalLost) + " t" : "0 t",  color: totalLost > 0 ? "text-red-500" : "text-[var(--text-muted)]" },
          { label: "% entregue",           value: pctDelivered > 0 ? pctDelivered.toFixed(1) + "%" : "—", color: "text-indigo-600" },
        ].map(k => (
          <div key={k.label} className="ag-card-strong p-5">
            <p className="ag-kpi-label">{k.label}</p>
            <p className={`ag-kpi-value ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </section>

      {/* Vertical 7-stage timeline */}
      <section className="ag-card-strong p-8 space-y-6">
        <h2 className="ag-section-title">Rastreabilidade — 7 estágios</h2>

        <div className="space-y-0">
          {STAGE_ORDER.map((s, i) => {
            const done    = stageIdx >= 0 && i <= stageIdx;
            const current = i === stageIdx + 1;
            const isLast  = i === STAGE_ORDER.length - 1;

            // Find checkpoints for this stage (most recent first)
            const stageLogs = tracking.filter(t => t.stage === s);

            return (
              <div key={s} className="flex gap-5">
                {/* Vertical connector */}
                <div className="flex flex-col items-center">
                  <div className={`mt-1 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    done    ? "border-emerald-500 bg-emerald-500" :
                    current ? "border-blue-500 bg-blue-50 animate-pulse" :
                              "border-[var(--border)] bg-white"
                  }`}>
                    {done    && <CheckCircle2 size={12} className="text-white" />}
                    {current && <Clock size={10} className="text-blue-500" />}
                    {!done && !current && <Circle size={10} className="text-[var(--border)]" />}
                  </div>
                  {!isLast && (
                    <div className={`mt-1 w-0.5 flex-1 min-h-[32px] ${done ? "bg-emerald-400" : "bg-[var(--border)]"}`} />
                  )}
                </div>

                {/* Stage content */}
                <div className={`pb-6 flex-1 ${isLast ? "pb-0" : ""}`}>
                  <p className={`text-sm font-semibold ${done ? "text-emerald-700" : current ? "text-blue-700" : "text-[var(--text-muted)]"}`}>
                    {STAGE_LABEL[s]}
                  </p>

                  {stageLogs.map(log => (
                    <div key={log.id} className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{fmtDateTime(log.stage_date)}</p>
                        {log.quantity_confirmed_tons != null && (
                          <span className="text-xs font-bold text-emerald-600">{fmtTons(log.quantity_confirmed_tons)} t confirmadas</span>
                        )}
                      </div>
                      {log.location_name && (
                        <p className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <MapPin size={11} className="shrink-0 text-[var(--text-muted)]" /> {log.location_name}
                        </p>
                      )}
                      {log.quantity_lost_tons > 0 && (
                        <p className="text-xs text-red-600 font-medium">
                          Perda: {fmtTons(log.quantity_lost_tons)} t{log.loss_cause ? ` — ${log.loss_cause}` : ""}
                        </p>
                      )}
                      {log.responsible_name && (
                        <p className="text-xs text-[var(--text-muted)]">Resp.: {log.responsible_name}</p>
                      )}
                      {log.notes && (
                        <p className="text-xs text-[var(--text-secondary)] italic">{log.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Documentos fiscais */}
      {movements.length > 0 && (
        <section className="ag-card-strong p-8 space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--primary)]" />
            <h2 className="ag-section-title">Documentos Fiscais</h2>
          </div>
          <div className="space-y-3">
            {movements.map(mv => (
              <div key={mv.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold mr-2 ${
                      mv.movement_type === "entrada"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-red-100 text-red-700 border-red-200"
                    }`}>
                      {mv.movement_type === "entrada" ? "Entrada" : mv.movement_type === "saida" ? "Saída" : "Transferência"}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{fmtTons(mv.quantity_tons)} t</span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">{fmtDate(mv.movement_date)}</span>
                  </div>
                  {mv.nfe_key && (
                    <span className="font-mono text-[11px] bg-[var(--border)] text-[var(--text-muted)] px-2 py-0.5 rounded">
                      NF-e {maskNfe(mv.nfe_key)}
                    </span>
                  )}
                </div>
                {(mv.humidity_pct != null || mv.impurity_pct != null || mv.classification) && (
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                    {[
                      mv.classification,
                      mv.humidity_pct != null ? `Umidade ${mv.humidity_pct}%` : null,
                      mv.impurity_pct != null ? `Impureza ${mv.impurity_pct}%` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
                {mv.notes && <p className="mt-1 text-xs text-[var(--text-muted)] italic">{mv.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
