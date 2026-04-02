"use client";

import { MapPin, AlertTriangle } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import ShipTrackingMapWrapper from "@/app/components/ShipTrackingMapWrapper";
import { Lot, TrackingCheckpoint, TRACKING_STAGES, Lang, TDict } from "@/app/components/compradorTypes";

interface Props {
  lots: Lot[];
  trackingCheckpoints: TrackingCheckpoint[];
  lang: Lang;
  t: TDict;
}

export default function CompradorTrackingSection({ lots, trackingCheckpoints, lang, t }: Props) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
        <h2 className="font-semibold text-white">{t.tracking.title}</h2>
      </div>

      {trackingCheckpoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin size={28} className="mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">{t.tracking.noData}</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {lots.map(lot => {
            const cps = trackingCheckpoints.filter(c => c.lot_id === lot.id);
            if (!cps.length) return null;
            const completedSet = new Set(cps.map(c => c.stage));
            const currentIdx   = TRACKING_STAGES.findIndex(s => !completedSet.has(s.key));
            const totalLost    = cps.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
            const lastConfCp   = [...cps].reverse().find(c => c.animals_confirmed != null);

            return (
              <div key={lot.id} className="p-6 lg:p-8">
                {/* Lot header */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{lot.name}</span>
                    {lot.pais_destino && <span className="text-xs text-[var(--text-muted)]">→ {lot.pais_destino}</span>}
                    {lot.certificacoes_exigidas?.includes("Halal") && <HalalBadgeSVG size={32} />}
                  </div>
                  <div className="flex items-center gap-3">
                    {lastConfCp?.animals_confirmed != null && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        <span className="text-base font-bold text-emerald-600">{lastConfCp.animals_confirmed}</span>
                        {" "}{t.tracking.animalsConf}
                      </span>
                    )}
                    {totalLost > 0 && (
                      <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        <AlertTriangle size={11} />
                        {totalLost} {totalLost === 1 ? t.tracking.loss : t.tracking.losses}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ship map — shown when lot is at sea */}
                {completedSet.has("navio") && !completedSet.has("entregue") && lot.data_embarque && (
                  <div className="mb-6">
                    <ShipTrackingMapWrapper
                      departureDate={lot.data_embarque}
                      arrivalDate={lot.arrival_date}
                      shipName={lot.ship_name}
                      animalsOnBoard={lastConfCp?.animals_confirmed ?? 0}
                      lotName={lot.name}
                      originPort={lot.porto_embarque}
                      destinationPort={lot.pais_destino}
                    />
                  </div>
                )}

                {/* Horizontal stage bar */}
                <div className="flex items-start">
                  {TRACKING_STAGES.map((stage, i) => {
                    const isDone    = completedSet.has(stage.key);
                    const isCurrent = currentIdx === i;
                    const cp        = cps.find(c => c.stage === stage.key);
                    const isLast    = i === TRACKING_STAGES.length - 1;

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
                        {cp?.location_name && (
                          <p className={`mt-1 text-center text-[8px] leading-tight max-w-[72px] ${isCurrent ? "font-semibold text-blue-500" : "text-[var(--text-muted)]"}`}>
                            {cp.location_name}
                          </p>
                        )}
                        {cp && cp.animals_lost > 0 && (
                          <div className="mt-1 text-center">
                            <span className="text-[10px] font-bold text-red-600">▼{cp.animals_lost}</span>
                            {cp.loss_cause && <p className="text-[7.5px] text-red-400 leading-tight max-w-[72px]">{cp.loss_cause}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
