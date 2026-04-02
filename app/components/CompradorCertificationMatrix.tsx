"use client";

import { Beef, Rabbit, Bird, AlertTriangle } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import {
  ComplianceRow, LivestockRow, PoultryBatch,
  CERT_LIST, Lang, TDict, fmtAge, fmtDate,
} from "@/app/components/compradorTypes";

interface Props {
  filteredRows: ComplianceRow[];
  filteredLivestockRows: LivestockRow[];
  poultryBatches: PoultryBatch[];
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

export default function CompradorCertificationMatrix({
  filteredRows, filteredLivestockRows, poultryBatches,
  filter, setFilter, speciesFilter, setSpeciesFilter,
  hoveredRow, setHoveredRow, lang, t, locale,
}: Props) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-semibold text-white">{t.matrix.title}</h2>
          {/* Species filter */}
          <div className="flex overflow-hidden rounded-lg border border-white/25">
            {([
              { k: "all",     l: t.species.all,    icon: null   },
              { k: "bovinos", l: t.species.cattle,  icon: Beef   },
              { k: "ovinos",  l: t.species.sheep,   icon: Rabbit },
              { k: "aves",    l: t.species.poultry, icon: Bird   },
            ] as const).map(f => {
              const Icon = f.icon;
              return (
                <button key={f.k} onClick={() => setSpeciesFilter(f.k)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition ${speciesFilter === f.k ? "bg-white text-[var(--primary-hover)]" : "bg-transparent text-white/70 hover:bg-white/10"}`}>
                  {Icon && <Icon size={10} />}{f.l}
                </button>
              );
            })}
          </div>
        </div>
        {speciesFilter !== "aves" && (
          <div className="flex overflow-hidden rounded-lg border border-white/25 w-fit">
            {([
              { k: "all",        l: t.matrix.all },
              { k: "eligible",   l: t.matrix.eligible },
              { k: "pending",    l: t.matrix.pending },
              { k: "ineligible", l: t.matrix.ineligible },
            ] as const).map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition ${filter === f.k ? "bg-white/20 text-white" : "bg-transparent text-white/55 hover:bg-white/10"}`}>
                {f.l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bovinos table ── */}
      {(speciesFilter === "all" || speciesFilter === "bovinos") && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {[t.matrix.animal, t.matrix.breed, t.matrix.age, "Halal", "MAPA", "GTA", "SIF", t.matrix.withdrawal, t.matrix.score, t.matrix.status].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap ${i > 2 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No cattle data available.</td></tr>
              ) : filteredRows.map(({ animal, certs, score, withdrawals, status }) => {
                const sc     = status === "eligible" ? "text-emerald-600" : status === "pending" ? "text-amber-600" : "text-red-600";
                const sbadge = status === "eligible" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "pending" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700";
                const sl     = status === "eligible" ? t.matrix.labelEligible : status === "pending" ? t.matrix.labelPending : t.matrix.labelIneligible;
                return (
                  <tr key={animal.id}
                    onMouseEnter={() => setHoveredRow(animal.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`border-b border-[var(--border)] transition-colors ${hoveredRow === animal.id ? "bg-[var(--primary-soft)]" : ""}`}>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">{animal.nickname ?? animal.internal_code ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{animal.breed ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{fmtAge(animal.birth_date)}</td>
                    {CERT_LIST.map(cert => (
                      <td key={cert} className="px-4 py-3 text-center">
                        {cert === "Halal" && certs.has(cert) && status === "eligible" ? (
                          <div className="flex justify-center"><HalalBadgeSVG size={40} /></div>
                        ) : (
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold ${certs.has(cert) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}>
                            {certs.has(cert) ? "✓" : "—"}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      {withdrawals.length === 0
                        ? <span className="text-xs font-semibold text-emerald-600">{t.matrix.clear}</span>
                        : <span className="text-xs font-semibold text-red-600">{new Date(withdrawals[0]).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span>}
                    </td>
                    <td className={`px-4 py-3 text-center text-base font-bold ${score >= 75 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : sc}`}>{score > 0 ? score : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${sbadge}`}>{sl}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Ovinos/Caprinos table ── */}
      {speciesFilter === "ovinos" && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {[t.matrix.animal, t.matrix.breed, "Espécie", t.matrix.age, "Halal", t.matrix.score, t.matrix.status].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap ${i > 3 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLivestockRows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No sheep/goat data available.</td></tr>
              ) : filteredLivestockRows.map(row => {
                const sbadge  = row.status === "eligible" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700";
                const sl      = row.status === "eligible" ? t.matrix.labelEligible : t.matrix.labelIneligible;
                const scoreCls = row.score >= 75 ? "text-emerald-600" : row.score >= 60 ? "text-amber-600" : "text-red-600";
                return (
                  <tr key={row.id}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`border-b border-[var(--border)] transition-colors ${hoveredRow === row.id ? "bg-[var(--primary-soft)]" : ""}`}>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">{row.internal_code ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{row.breed ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">{row.species}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{fmtAge(row.birth_date)}</td>
                    <td className="px-4 py-3 text-center">
                      {row.hasHalal ? (
                        <div className="flex justify-center"><HalalBadgeSVG size={40} /></div>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] text-[10px] font-bold text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-center text-base font-bold ${scoreCls}`}>{row.score > 0 ? row.score : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${sbadge}`}>{sl}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Aves/Frangos table ── */}
      {speciesFilter === "aves" && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {["Lote", "Espécie", "Aves", "Mortalidade", "Conv. Alimentar", "Halal Abatedouro", "Status"].map((h, i) => (
                  <th key={i} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] whitespace-nowrap ${i >= 2 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {poultryBatches.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No poultry batch data available.</td></tr>
              ) : poultryBatches.map(b => {
                const mort    = b.initial_count > 0 ? ((b.mortality_count / b.initial_count) * 100).toFixed(1) : "—";
                const highMort = Number(mort) > 5;
                const STATUS_BADGE: Record<string, string> = {
                  alojado:        "border-blue-200 bg-blue-50 text-blue-700",
                  em_crescimento: "border-emerald-200 bg-emerald-50 text-emerald-700",
                  pronto_abate:   "border-amber-200 bg-amber-50 text-amber-700",
                  abatido:        "border-gray-200 bg-gray-50 text-gray-600",
                };
                const STATUS_LABEL: Record<string, string> = {
                  alojado: "HOUSED", em_crescimento: "GROWING", pronto_abate: "READY", abatido: "SLAUGHTERED",
                };
                return (
                  <tr key={b.id}
                    onMouseEnter={() => setHoveredRow(b.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`border-b border-[var(--border)] transition-colors ${hoveredRow === b.id ? "bg-[var(--primary-soft)]" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">{b.batch_code}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">{b.species}{b.breed ? ` · ${b.breed}` : ""}</td>
                    <td className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]">{b.current_count.toLocaleString("pt-BR")}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${highMort ? "text-red-600" : "text-emerald-600"}`}>
                      {mort}%{highMort && <AlertTriangle size={11} className="inline ml-1" />}
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{b.feed_conversion ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {b.halal_certified ? (
                        <div className="flex justify-center"><HalalBadgeSVG size={40} /></div>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] text-[10px] font-bold text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${STATUS_BADGE[b.status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
