"use client";

import { Beef, CheckCircle2, Clock, Activity, ShieldAlert, ShieldCheck, Truck } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import CompradorTrackingSection from "@/app/components/CompradorTrackingSection";
import CompradorCertificationMatrix from "@/app/components/CompradorCertificationMatrix";
import {
  Lot, TrackingCheckpoint, PoultryBatch,
  ComplianceRow, LivestockRow, RiskData,
  Lang, TDict, daysUntil, fmtDate,
} from "@/app/components/compradorTypes";

interface LotCompliance { lot: Lot; total: number; eligible: number; pct: number }

interface Props {
  lots: Lot[];
  trackingCheckpoints: TrackingCheckpoint[];
  poultryBatches: PoultryBatch[];
  filteredRows: ComplianceRow[];
  filteredLivestockRows: LivestockRow[];
  lotCompliance: LotCompliance[];
  totalAnimals: number;
  eligibleCount: number;
  halalCount: number;
  nextDeparture: string | null;
  daysToNext: number | null;
  survivalRate: number | null;
  sanitaryRisk: RiskData;
  complianceRisk: RiskData;
  deliveryRisk: RiskData;
  sanitaryMessage: string;
  complianceMessage: string;
  deliveryMessage: string;
  filter: "all" | "eligible" | "pending" | "ineligible";
  setFilter: (f: "all" | "eligible" | "pending" | "ineligible") => void;
  speciesFilter: "all" | "bovinos" | "ovinos" | "aves";
  setSpeciesFilter: (f: "all" | "bovinos" | "ovinos" | "aves") => void;
  hoveredRow: string | null;
  setHoveredRow: (id: string | null) => void;
  lang: Lang;
  t: TDict;
  locale: string;
}

const riskBorderColor = { low: "#22c55e", medium: "#f59e0b", high: "#f59e0b" } as const;
const riskBadgeCls    = {
  low:    "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high:   "border-amber-200 bg-amber-50 text-amber-700",
} as const;
const riskValueCls = { low: "text-emerald-600", medium: "text-amber-600", high: "text-amber-600" } as const;

export default function CompradorLivestockTab({
  lots, trackingCheckpoints, poultryBatches,
  filteredRows, filteredLivestockRows, lotCompliance,
  totalAnimals, eligibleCount, halalCount,
  nextDeparture, daysToNext, survivalRate,
  sanitaryRisk, complianceRisk, deliveryRisk,
  sanitaryMessage, complianceMessage, deliveryMessage,
  filter, setFilter, speciesFilter, setSpeciesFilter,
  hoveredRow, setHoveredRow, lang, t, locale,
}: Props) {
  return (
    <>
      {/* ── 6 KPI Cards ── */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Beef,         label: t.kpi.total,     value: `${totalAnimals}`,  cls: "text-[var(--text-primary)]", halalBadge: false },
          { icon: CheckCircle2, label: t.kpi.eligible,  value: eligibleCount,      cls: "text-emerald-600",           halalBadge: false },
          { icon: ShieldCheck,  label: t.kpi.halal,     value: halalCount,         cls: "text-amber-600",             halalBadge: true  },
          { icon: Truck,        label: t.kpi.shipments, value: lots.length,        cls: "text-blue-600",              halalBadge: false },
          { icon: Clock,        label: t.kpi.departure, value: daysToNext != null ? `T−${daysToNext}` : fmtDate(nextDeparture, locale), cls: "text-purple-600", halalBadge: false },
          { icon: Activity,     label: t.kpi.survival,  value: survivalRate != null ? `${survivalRate}%` : "—", cls: survivalRate == null ? "text-[var(--text-muted)]" : survivalRate >= 98 ? "text-emerald-600" : "text-amber-600", halalBadge: false },
        ].map(({ icon: Icon, label, value, cls, halalBadge }) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Icon size={13} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
            </div>
            {halalBadge && halalCount > 0 ? (
              <div className="mt-2 flex items-center gap-2" title="Animais com certificação Halal ativa">
                <HalalBadgeSVG size={48} />
                <p className={`text-3xl font-bold tracking-tight ${cls}`}>{value}</p>
              </div>
            ) : (
              <p className={`mt-3 text-3xl font-bold tracking-tight ${cls}`}>{value}</p>
            )}
          </div>
        ))}
      </section>

      {/* ── Active Shipments Table ── */}
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
          <h2 className="font-semibold text-white">{t.shipments.title}</h2>
          <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
            {lots.length} lot{lots.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {[t.shipments.lotId, t.shipments.origin, t.shipments.dest, t.shipments.dep, t.shipments.animals, t.shipments.compliance, t.shipments.status, ""].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lotCompliance.map(({ lot, total, eligible, pct }, idx) => {
                const barColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
                const pctCls   = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
                const days     = daysUntil(lot.data_embarque);
                return (
                  <tr key={lot.id} className={`hover:bg-[var(--surface-soft)] transition-colors ${idx < lotCompliance.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">{lot.name}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{lot.porto_embarque ?? "—"}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{lot.pais_destino ?? "—"}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {fmtDate(lot.data_embarque, locale)}
                      {days != null && <span className="ml-2 text-[10px] font-bold text-purple-600">T−{days}</span>}
                    </td>
                    <td className="px-5 py-4 text-xl font-bold text-[var(--text-primary)]">{total}</td>
                    <td className="px-5 py-4">
                      <div className="min-w-[120px]">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className={`text-lg font-bold ${pctCls}`}>{pct}%</span>
                          <span className="text-xs text-[var(--text-muted)]">{eligible}/{total}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${lot.status === "closed" ? "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {lot.status ?? "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="ag-button-secondary text-xs whitespace-nowrap">{t.shipments.details} →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Live Shipment Tracking ── */}
      <CompradorTrackingSection
        lots={lots}
        trackingCheckpoints={trackingCheckpoints}
        lang={lang}
        t={t}
      />

      {/* ── Animal Certification Matrix ── */}
      <CompradorCertificationMatrix
        filteredRows={filteredRows}
        filteredLivestockRows={filteredLivestockRows}
        poultryBatches={poultryBatches}
        filter={filter}
        setFilter={setFilter}
        speciesFilter={speciesFilter}
        setSpeciesFilter={setSpeciesFilter}
        hoveredRow={hoveredRow}
        setHoveredRow={setHoveredRow}
        lang={lang}
        t={t}
        locale={locale}
      />

      {/* ── Risk Intelligence ── */}
      <section>
        <h2 className="ag-section-title mb-5">{t.risk.title}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t.risk.sanitary,   data: sanitaryRisk,   message: sanitaryMessage,   icon: ShieldAlert },
            { label: t.risk.compliance, data: complianceRisk, message: complianceMessage, icon: ShieldCheck },
            { label: t.risk.delivery,   data: deliveryRisk,   message: deliveryMessage,   icon: Truck },
          ].map(({ label, data, message, icon: Icon }) => {
            const rl     = data.level === "low" ? t.risk.low : data.level === "medium" ? t.risk.medium : t.risk.high;
            const border = riskBorderColor[data.level];
            const badge  = riskBadgeCls[data.level];
            const valCls = riskValueCls[data.level];
            return (
              <div key={label} className="rounded-3xl border border-[var(--border)] bg-white p-6"
                style={{ borderLeft: `4px solid ${border}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Icon size={14} />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${badge}`}>{rl}</span>
                </div>
                <p className={`mt-4 text-sm font-semibold leading-snug ${valCls}`}>{message}</p>
                <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)]">{data.score}% risk index</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
