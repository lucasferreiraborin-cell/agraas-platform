"use client";

import { useMemo } from "react";
import { Ship, Wheat } from "lucide-react";
import {
  GrainShipment, GrainTracking, GrainFarm, GrainField,
  GRAIN_STAGES, CULTURE_LABEL_EN, CULTURE_LABEL_PT,
  GRAIN_STATUS_EN, GRAIN_STATUS_PT, GRAIN_STATUS_CLS,
  Lang, fmtDate,
} from "@/app/components/compradorTypes";

interface Props {
  grainShipments: GrainShipment[];
  grainTracking: GrainTracking[];
  grainFarms: GrainFarm[];
  grainFields: GrainField[];
  lang: Lang;
  locale: string;
}

export default function CompradorGrainsTab({
  grainShipments, grainTracking, grainFarms, grainFields, lang, locale,
}: Props) {
  const fieldFarmMap = useMemo(() => new Map(grainFields.map(f => [f.id, f.farm_id])), [grainFields]);
  const farmCarMap   = useMemo(() => new Map(grainFarms.map(f => [f.id, !!f.car_number])), [grainFarms]);

  const grainStageMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of grainTracking) { if (!m.has(t.shipment_id)) m.set(t.shipment_id, t.stage); }
    return m;
  }, [grainTracking]);

  const grainConfirmedMap = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const t of grainTracking) { if (!m.has(t.shipment_id)) m.set(t.shipment_id, t.quantity_confirmed_tons); }
    return m;
  }, [grainTracking]);

  const activeGrainShipments = useMemo(() => grainShipments.filter(s => s.status !== "entregue"), [grainShipments]);
  const grainTonsInTransit   = useMemo(() => activeGrainShipments.reduce((s, sh) => s + Number(sh.quantity_tons), 0), [activeGrainShipments]);
  const grainCultureCount    = useMemo(() => new Set(grainShipments.map(s => s.culture)).size, [grainShipments]);

  return (
    <div className="space-y-8">
      {/* Grain KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Ship,  label: lang === "en" ? "Active Shipments"   : "Embarques ativos",      value: activeGrainShipments.length, cls: "text-blue-600" },
          { icon: Wheat, label: lang === "en" ? "Tons in Transit"     : "Toneladas em trânsito", value: grainTonsInTransit.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " t", cls: "text-amber-600" },
          { icon: Wheat, label: lang === "en" ? "Cultures Tracked"    : "Culturas rastreadas",   value: grainCultureCount, cls: "text-emerald-600" },
        ].map(({ icon: Icon, label, value, cls }) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Icon size={13} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
            </div>
            <p className={`mt-3 text-3xl font-bold tracking-tight ${cls}`}>{value}</p>
          </div>
        ))}
      </section>

      {/* Grain shipments table */}
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
          <h2 className="font-semibold text-white">{lang === "en" ? "Grain Shipments" : "Embarques de Grãos"}</h2>
          <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
            {grainShipments.length} {lang === "en" ? "shipments" : "embarques"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {(lang === "en"
                  ? ["Contract", "Culture", "Tons", "Origin → Destination", "Vessel", "Departure", "CAR", "Status"]
                  : ["Contrato", "Cultura", "Toneladas", "Origem → Destino", "Navio", "Partida", "CAR", "Status"]
                ).map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grainShipments.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  {lang === "en" ? "No grain shipments available." : "Nenhum embarque de grãos disponível."}
                </td></tr>
              ) : grainShipments.map((sh, idx) => {
                const farmId       = sh.field_id ? fieldFarmMap.get(sh.field_id) : null;
                const hasCar       = farmId ? (farmCarMap.get(farmId) ?? false) : false;
                const cultureLabel = lang === "en" ? (CULTURE_LABEL_EN[sh.culture] ?? sh.culture) : (CULTURE_LABEL_PT[sh.culture] ?? sh.culture);
                const statusLabel  = lang === "en" ? (GRAIN_STATUS_EN[sh.status] ?? sh.status) : (GRAIN_STATUS_PT[sh.status] ?? sh.status);
                return (
                  <tr key={sh.id} className={`transition-colors hover:bg-[var(--surface-soft)] ${idx < grainShipments.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">{sh.contract_number ?? sh.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{cultureLabel}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                      {Number(sh.quantity_tons).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {sh.origin_port ?? "—"} → {sh.destination_port ?? sh.destination_country ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{sh.vessel_name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(sh.departure_date, locale)}</td>
                    <td className="px-4 py-3">
                      {hasCar ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ CAR</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${GRAIN_STATUS_CLS[sh.status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grain tracking timelines */}
      {activeGrainShipments.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
          <div className="border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
            <h2 className="font-semibold text-white">
              {lang === "en" ? "Grain Shipment Tracking" : "Rastreio de Embarques de Grãos"}
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activeGrainShipments.map(sh => {
              const currentStage  = grainStageMap.get(sh.id) ?? null;
              const stageIdx      = currentStage ? GRAIN_STAGES.findIndex(s => s.key === currentStage) : -1;
              const confirmedTons = grainConfirmedMap.get(sh.id) ?? null;
              const cultureLabel  = lang === "en" ? (CULTURE_LABEL_EN[sh.culture] ?? sh.culture) : (CULTURE_LABEL_PT[sh.culture] ?? sh.culture);
              const farmId        = sh.field_id ? fieldFarmMap.get(sh.field_id) : null;
              const hasCar        = farmId ? (farmCarMap.get(farmId) ?? false) : false;

              return (
                <div key={sh.id} className="p-6 lg:p-8">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                        {sh.contract_number ?? sh.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{cultureLabel} · {sh.destination_port ?? sh.destination_country ?? "—"}</span>
                      {hasCar && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          ✓ {lang === "en" ? "CAR Certified" : "CAR Certificado"}
                        </span>
                      )}
                    </div>
                    {confirmedTons != null && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        <span className="text-base font-bold text-emerald-600">
                          {Number(confirmedTons).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} t
                        </span>{" "}
                        {lang === "en" ? "confirmed" : "confirmadas"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start">
                    {GRAIN_STAGES.map((stage, i) => {
                      const isDone    = stageIdx >= 0 && i <= stageIdx;
                      const isCurrent = i === stageIdx + 1;
                      const isLast    = i === GRAIN_STAGES.length - 1;
                      return (
                        <div key={stage.key} className="relative flex flex-1 flex-col items-center">
                          {!isLast && (
                            <div className="absolute top-[11px] left-1/2 h-0.5 w-full z-0"
                              style={isDone
                                ? { background: "#22c55e" }
                                : { backgroundImage: "repeating-linear-gradient(90deg,#d1d5db 0,#d1d5db 5px,transparent 5px,transparent 10px)" }
                              }
                            />
                          )}
                          <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            isDone    ? "border-emerald-500 bg-emerald-500"
                            : isCurrent ? "border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                            : "border-[var(--border)] bg-white"
                          }`}>
                            {isDone    && <span className="text-[10px] font-black text-white">✓</span>}
                            {isCurrent && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <p className={`mt-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.07em] max-w-[64px] ${
                            isDone ? "text-emerald-600" : isCurrent ? "text-blue-600" : "text-[var(--text-muted)]"
                          }`}>
                            {lang === "en" ? stage.en : stage.pt}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
