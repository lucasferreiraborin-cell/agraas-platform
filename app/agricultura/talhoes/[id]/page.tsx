import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, Warehouse, Ship } from "lucide-react";

type Field = {
  id: string; field_code: string; field_name: string | null;
  area_ha: number | null; culture: string; crop_season: string | null;
  status: string; planting_date: string | null; expected_harvest_date: string | null;
  polygon_coordinates: unknown; score: number | null; farm_id: string;
};
type Farm    = { id: string; name: string; car_number: string | null };
type Input   = { id: string; input_type: string; product_name: string; quantity: number | null; unit: string | null; application_date: string; withdrawal_days: number | null; withdrawal_date: string | null; nfe_key: string | null; operator: string | null };
type Shipment = { id: string; contract_number: string | null; culture: string; quantity_tons: number; destination_port: string | null; destination_country: string | null; status: string; departure_date: string | null };
type Tracking = { shipment_id: string; stage: string; stage_date: string };
type Cert    = { id: string; certification_name: string; issued_at: string | null; expires_at: string | null; status: string; issuer: string | null; notes: string | null };
type Movement = { id: string; movement_type: string; quantity_tons: number; created_at: string };

const CULTURE_LABEL: Record<string,string> = { soja:"Soja", milho:"Milho", trigo:"Trigo", acucar:"Açúcar", cafe:"Café" };
const CULTURE_DOT:   Record<string,string> = { soja:"bg-emerald-500", milho:"bg-amber-500", trigo:"bg-amber-900", acucar:"bg-violet-500", cafe:"bg-amber-950" };
const STATUS_STYLE:  Record<string,string> = {
  planejado:"bg-gray-100 text-gray-600 border-gray-200",
  plantado:"bg-emerald-100 text-emerald-700 border-emerald-200",
  em_desenvolvimento:"bg-blue-100 text-blue-700 border-blue-200",
  colhido:"bg-amber-100 text-amber-700 border-amber-200",
  em_repouso:"bg-slate-100 text-slate-600 border-slate-200",
};
const STATUS_LABEL: Record<string,string> = { planejado:"Planejado", plantado:"Plantado", em_desenvolvimento:"Em desenvolvimento", colhido:"Colhido", em_repouso:"Em repouso" };
const INPUT_LABEL:  Record<string,string> = { semente:"Semente", fertilizante:"Fertilizante", defensivo:"Defensivo", combustivel:"Combustível" };
const CERT_LABEL:   Record<string,string> = { origem_certificada:"Origem Certificada", organico:"Orgânico", mapa:"MAPA", car_regular:"CAR Regular", sustentavel:"Sustentável" };
const CERT_COLOR:   Record<string,string> = {
  origem_certificada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  organico:           "bg-teal-100 text-teal-700 border-teal-200",
  mapa:               "bg-blue-100 text-blue-700 border-blue-200",
  car_regular:        "bg-amber-100 text-amber-700 border-amber-200",
  sustentavel:        "bg-green-100 text-green-700 border-green-200",
};
const STAGE_ORDER = ["fazenda","armazem","transportadora","porto_origem","navio","porto_destino","entregue"];
const SHIP_STATUS_BADGE: Record<string,string> = {
  planejado:"bg-gray-100 text-gray-600 border-gray-200",
  carregando:"bg-blue-100 text-blue-700 border-blue-200",
  embarcado:"bg-indigo-100 text-indigo-700 border-indigo-200",
  em_transito:"bg-amber-100 text-amber-700 border-amber-200",
  entregue:"bg-emerald-100 text-emerald-700 border-emerald-200",
};
const SHIP_STATUS_LABEL: Record<string,string> = { planejado:"Planejado", carregando:"Carregando", embarcado:"Embarcado", em_transito:"Em trânsito", entregue:"Entregue" };

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function fmtTons(t: number) {
  return t.toLocaleString("pt-BR", { minimumFractionDigits:1, maximumFractionDigits:1 });
}

function ScoreCircle({ score }: { score: number }) {
  const size=96; const r=40;
  const circ=2*Math.PI*r;
  const offset=circ-(Math.max(0,Math.min(100,score))/100)*circ;
  const color=score>=75?"#2d9b6f":score>=50?"#d4930a":"#c0392b";
  const track=score>=75?"#d1fae5":score>=50?"#fef3c7":"#fee2e2";
  return (
    <div className="relative inline-flex items-center justify-center" style={{width:size,height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <span className="absolute text-2xl font-bold" style={{color}}>{score}</span>
    </div>
  );
}

const DIMENSIONS = [
  { label:"Rastreabilidade", pct:25 },
  { label:"Fiscal",          pct:25 },
  { label:"Operacional",     pct:25 },
  { label:"Certificações",   pct:25 },
];

export default async function TalhaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: fieldData },
    { data: inputsData },
    { data: shipmentsData },
    { data: trackingData },
    { data: certsData },
  ] = await Promise.all([
    supabase.from("crop_fields")
      .select("id, field_code, field_name, area_ha, culture, crop_season, status, planting_date, expected_harvest_date, polygon_coordinates, score, farm_id")
      .eq("id", id).single(),
    supabase.from("crop_inputs")
      .select("id, input_type, product_name, quantity, unit, application_date, withdrawal_days, withdrawal_date, nfe_key, operator")
      .eq("field_id", id).order("application_date", { ascending: false }),
    supabase.from("crop_shipments")
      .select("id, contract_number, culture, quantity_tons, destination_port, destination_country, status, departure_date")
      .eq("field_id", id).order("departure_date", { ascending: false }),
    supabase.from("crop_shipment_tracking")
      .select("shipment_id, stage, stage_date").order("stage_date", { ascending: false }),
    supabase.from("crop_certifications")
      .select("id, certification_name, issued_at, expires_at, status, issuer, notes")
      .eq("field_id", id).order("issued_at", { ascending: false }),
  ]);

  if (!fieldData) notFound();

  const field     = fieldData as Field;
  const inputs    = (inputsData    ?? []) as Input[];
  const shipments = (shipmentsData ?? []) as Shipment[];
  const tracking  = (trackingData  ?? []) as Tracking[];
  const certs     = (certsData     ?? []) as Cert[];

  // Fetch farm separately
  const { data: farmData } = await supabase.from("farms_agriculture")
    .select("id, name, car_number").eq("id", field.farm_id).single();
  const farm = farmData as Farm | null;

  // Stage map por shipment
  const stageMap = new Map<string, string>();
  for (const t of tracking) {
    if (!stageMap.has(t.shipment_id)) stageMap.set(t.shipment_id, t.stage);
  }

  const inputsEmCarencia = inputs.filter(i => i.withdrawal_date && i.withdrawal_date > today);

  return (
    <main className="space-y-8">
      <Link href="/agricultura/talhoes" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
        <ArrowLeft size={14} /> Talhões
      </Link>

      {/* ── Header ── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 ag-badge ag-badge-green">
                  <span className={`h-2 w-2 rounded-full ${CULTURE_DOT[field.culture] ?? "bg-gray-400"}`} />
                  {CULTURE_LABEL[field.culture] ?? field.culture}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[field.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {STATUS_LABEL[field.status] ?? field.status}
                </span>
                {inputsEmCarencia.length > 0 && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    {inputsEmCarencia.length} insumo{inputsEmCarencia.length > 1 ? "s" : ""} em carência
                  </span>
                )}
              </div>
              <h1 className="ag-page-title mt-4">{field.field_name ?? field.field_code}</h1>
              <p className="text-sm text-[var(--text-muted)]">{field.field_code}</p>
              <div className="mt-4 flex flex-wrap gap-5 text-sm text-[var(--text-secondary)]">
                {farm && <span className="flex items-center gap-1.5"><Layers size={13} />{farm.name}</span>}
                {field.area_ha != null && <span>{field.area_ha.toLocaleString("pt-BR")} ha</span>}
                {field.crop_season && <span>Safra {field.crop_season}</span>}
                {field.planting_date && <span>Plantio: {fmtDate(field.planting_date)}</span>}
                {field.expected_harvest_date && <span>Colheita: {fmtDate(field.expected_harvest_date)}</span>}
                {farm?.car_number && <span className="font-mono text-xs">CAR: {farm.car_number}</span>}
              </div>
            </div>
            {field.score != null && (
              <div className="flex flex-col items-center gap-2">
                <ScoreCircle score={field.score} />
                <p className="text-xs text-[var(--text-muted)]">Agraas Score</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Score + Certificações ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {field.score != null && (
          <section className="ag-card-strong p-8 space-y-5">
            <div>
              <h2 className="ag-section-title">Score por dimensão</h2>
              <p className="ag-section-subtitle">4 dimensões × 25 pts = 100 máximo</p>
            </div>
            <div className="space-y-4">
              {DIMENSIONS.map(d => (
                <div key={d.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-secondary)]">{d.label}</span>
                    <span className="tabular-nums text-[var(--text-muted)]">{d.pct}% do score</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="ag-card-strong p-8 space-y-4">
          <h2 className="ag-section-title">Certificações</h2>
          {certs.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nenhuma certificação registrada.</p>
          ) : (
            <div className="space-y-3">
              {certs.map(c => (
                <div key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${CERT_COLOR[c.certification_name] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {CERT_LABEL[c.certification_name] ?? c.certification_name}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.status === "ativa" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.issuer && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{c.issuer}</p>}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Emitida: {fmtDate(c.issued_at)} · Vence: {fmtDate(c.expires_at)}
                  </p>
                  {c.notes && <p className="mt-1 text-xs text-[var(--text-secondary)]">{c.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Insumos ── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ag-section-title">Insumos Aplicados</h2>
            <p className="ag-section-subtitle">{inputs.length} registro{inputs.length !== 1 ? "s" : ""}</p>
          </div>
          {inputsEmCarencia.length > 0 && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              {inputsEmCarencia.length} em carência
            </span>
          )}
        </div>
        {inputs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhum insumo registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr><th>Produto</th><th>Tipo</th><th>Quantidade</th><th>Data</th><th>Carência</th><th>NF-e</th></tr>
              </thead>
              <tbody>
                {inputs.map(i => {
                  const emCarencia = i.withdrawal_date && i.withdrawal_date > today;
                  return (
                    <tr key={i.id}>
                      <td className="font-medium text-[var(--text-primary)]">{i.product_name}</td>
                      <td className="text-[var(--text-secondary)]">{INPUT_LABEL[i.input_type] ?? i.input_type}</td>
                      <td className="tabular-nums">{i.quantity != null ? `${i.quantity} ${i.unit ?? ""}` : "—"}</td>
                      <td className="whitespace-nowrap">{fmtDate(i.application_date)}</td>
                      <td>
                        {!i.withdrawal_days ? (
                          <span className="text-xs text-[var(--text-muted)]">Sem carência</span>
                        ) : emCarencia ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                            Em carência · vence {fmtDate(i.withdrawal_date)}
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            Vencida
                          </span>
                        )}
                      </td>
                      <td>
                        {i.nfe_key ? (
                          <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-mono text-blue-700">NF-e</span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Embarques ── */}
      {shipments.length > 0 && (
        <section className="ag-card-strong p-8 space-y-5">
          <div>
            <h2 className="ag-section-title">Embarques vinculados</h2>
            <p className="ag-section-subtitle">{shipments.length} embarque{shipments.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="space-y-4">
            {shipments.map(sh => {
              const currentStage = stageMap.get(sh.id) ?? null;
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
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${SHIP_STATUS_BADGE[sh.status] ?? ""}`}>
                          {SHIP_STATUS_LABEL[sh.status] ?? sh.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {fmtTons(sh.quantity_tons)} t → {sh.destination_port ?? sh.destination_country ?? "—"}
                      </p>
                      {sh.departure_date && <p className="text-xs text-[var(--text-muted)]">{fmtDate(sh.departure_date)}</p>}
                    </div>
                    <Ship size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    {STAGE_ORDER.map((s, i) => {
                      const done    = stageIdx >= 0 && i <= stageIdx;
                      const current = i === stageIdx + 1;
                      return (
                        <div key={s} className="flex-1">
                          <div className={`h-1.5 w-full rounded-full ${done ? "bg-emerald-500" : current ? "bg-blue-500 animate-pulse" : "bg-[var(--border)]"}`} />
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

      {/* ── Movimentações ── (via armazém — listagem sumária) */}
      {shipments.length === 0 && inputs.length === 0 && certs.length === 0 && (
        <section className="ag-card-strong p-8">
          <div className="flex flex-col items-center py-8 text-center">
            <Warehouse size={28} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Nenhum dado operacional registrado para este talhão ainda.</p>
          </div>
        </section>
      )}
    </main>
  );
}
