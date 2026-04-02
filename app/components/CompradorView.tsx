"use client";

import { useState, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Beef, Ship } from "lucide-react";
import CompradorLivestockTab from "@/app/components/CompradorLivestockTab";
import CompradorGrainsTab from "@/app/components/CompradorGrainsTab";
import {
  Lot, Assignment, Animal, Cert, Withdrawal, Score,
  TrackingCheckpoint, LivestockAnimal, PoultryBatch,
  GrainShipment, GrainTracking, GrainFarm, GrainField,
  ComplianceRow, LivestockRow,
  T, Lang, daysUntil, fmtDate,
} from "@/app/components/compradorTypes";

// ─── Re-export types for page.tsx ─────────────────────────────────────────────
export type {
  Lot, Assignment, Animal, Cert, Withdrawal, Score,
  TrackingCheckpoint, LivestockAnimal, PoultryBatch,
  GrainShipment, GrainTracking, GrainFarm, GrainField,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  buyerName: string;
  lots: Lot[];
  assignments: Assignment[];
  animals: Animal[];
  certifications: Cert[];
  activeWithdrawals: Withdrawal[];
  scores: Score[];
  trackingCheckpoints: TrackingCheckpoint[];
  livestockAnimals: LivestockAnimal[];
  poultryBatches: PoultryBatch[];
  grainShipments: GrainShipment[];
  grainTracking: GrainTracking[];
  grainFarms: GrainFarm[];
  grainFields: GrainField[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompradorView({
  buyerName, lots, assignments, animals, certifications,
  activeWithdrawals, scores, trackingCheckpoints,
  livestockAnimals, poultryBatches,
  grainShipments, grainTracking, grainFarms, grainFields,
}: Props) {
  const [lang, setLang]                   = useState<Lang>("en");
  const [mainTab, setMainTab]             = useState<"livestock" | "grains">("livestock");
  const [filter, setFilter]               = useState<"all" | "eligible" | "pending" | "ineligible">("all");
  const [speciesFilter, setSpeciesFilter] = useState<"all" | "bovinos" | "ovinos" | "aves">("all");
  const [hoveredRow, setHoveredRow]       = useState<string | null>(null);
  const [utcTime, setUtcTime]             = useState("");
  const router = useRouter();
  const t      = T[lang];
  const locale = lang === "en" ? "en-GB" : "pt-BR";

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().replace(" GMT", " UTC"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived maps ─────────────────────────────────────────────────────────────

  const animalsByLot = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of assignments) { const l = m.get(a.lot_id) ?? []; l.push(a.animal_id); m.set(a.lot_id, l); }
    return m;
  }, [assignments]);

  const certsByAnimal = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of certifications) { if (!m.has(c.animal_id)) m.set(c.animal_id, new Set()); m.get(c.animal_id)!.add(c.certification_name); }
    return m;
  }, [certifications]);

  const withdrawalsByAnimal = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const w of activeWithdrawals) { const l = m.get(w.animal_id) ?? []; l.push(w.withdrawal_date ?? ""); m.set(w.animal_id, l); }
    return m;
  }, [activeWithdrawals]);

  const scoreByAnimal = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scores) { const v = (s.score_json as Record<string, number> | null)?.total_score; if (v != null) m.set(s.animal_id, Number(v)); }
    return m;
  }, [scores]);

  const requiredCerts = lots[0]?.certificacoes_exigidas ?? [];

  const complianceRows: ComplianceRow[] = useMemo(() => animals.map(animal => {
    const certs       = certsByAnimal.get(animal.id) ?? new Set<string>();
    const score       = scoreByAnimal.get(animal.id) ?? 0;
    const withdrawals = withdrawalsByAnimal.get(animal.id) ?? [];
    const certsOk     = requiredCerts.every(c => certs.has(c));
    const status: "eligible" | "pending" | "ineligible" =
      score < 60 || withdrawals.length > 0 ? "ineligible" : !certsOk ? "pending" : "eligible";
    return { animal, certs, score, withdrawals, status };
  }), [animals, certsByAnimal, scoreByAnimal, withdrawalsByAnimal, requiredCerts]);

  const lotCompliance = useMemo(() => lots.map(lot => {
    const ids      = animalsByLot.get(lot.id) ?? [];
    const eligible = ids.filter(id => complianceRows.find(r => r.animal.id === id)?.status === "eligible").length;
    return { lot, total: ids.length, eligible, pct: ids.length ? Math.round((eligible / ids.length) * 100) : 0 };
  }), [lots, animalsByLot, complianceRows]);

  const filteredRows = useMemo(() =>
    filter === "all" ? complianceRows : complianceRows.filter(r => r.status === filter),
  [complianceRows, filter]);

  const livestockRows: LivestockRow[] = useMemo(() => livestockAnimals.map(a => {
    const hasHalal = a.certifications?.includes("Halal") ?? false;
    const score    = a.score ?? 0;
    const status: "eligible" | "ineligible" = score < 60 ? "ineligible" : "eligible";
    return { ...a, hasHalal, score, status };
  }), [livestockAnimals]);

  const filteredLivestockRows = useMemo(() =>
    filter === "all" ? livestockRows : livestockRows.filter(r => r.status === filter),
  [livestockRows, filter]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const totalAnimals  = animals.length + livestockAnimals.length + poultryBatches.length;
  const eligibleCount = complianceRows.filter(r => r.status === "eligible").length;
  const halalCount    =
    animals.filter(a => certsByAnimal.get(a.id)?.has("Halal")).length +
    livestockAnimals.filter(a => a.certifications?.includes("Halal")).length +
    poultryBatches.filter(b => b.halal_certified).length;
  const nextDeparture = lots.map(l => l.data_embarque).filter(Boolean).sort()[0] ?? null;
  const daysToNext    = daysUntil(nextDeparture);

  const survivalRate = useMemo(() => {
    if (!trackingCheckpoints.length) return null;
    const started = trackingCheckpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? null;
    const lastCp  = trackingCheckpoints.reduce<TrackingCheckpoint | null>(
      (a, b) => !a || new Date(b.timestamp) > new Date(a.timestamp) ? b : a, null);
    const alive   = lastCp?.animals_confirmed ?? null;
    return started && alive ? Math.round((alive / started) * 100) : null;
  }, [trackingCheckpoints]);

  // ── Risk scores ───────────────────────────────────────────────────────────────

  const sanitaryRisk = useMemo(() => {
    const n   = activeWithdrawals.length;
    const pct = totalAnimals ? Math.round((n / totalAnimals) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct <= 15 ? "medium" : "high") as "low" | "medium" | "high", count: n };
  }, [activeWithdrawals, totalAnimals]);

  const complianceRisk = useMemo(() => {
    const n   = complianceRows.filter(r => r.status === "ineligible").length;
    const pct = totalAnimals ? Math.round((n / totalAnimals) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct <= 20 ? "medium" : "high") as "low" | "medium" | "high", count: n };
  }, [complianceRows, totalAnimals]);

  const deliveryRisk = useMemo(() => {
    const totalLost = trackingCheckpoints.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
    const started   = trackingCheckpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? totalAnimals;
    const pct       = started ? Math.round((totalLost / started) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct < 2 ? "medium" : "high") as "low" | "medium" | "high", count: totalLost };
  }, [trackingCheckpoints, totalAnimals]);

  // ── Risk messages ─────────────────────────────────────────────────────────────

  const sanitaryMessage = useMemo(() => {
    const n = activeWithdrawals.length;
    if (n === 0) return lang === "en" ? "On track — No active withdrawal periods" : "Em dia — Sem carências ativas";
    const dates  = activeWithdrawals.map(w => w.withdrawal_date).filter(Boolean) as string[];
    const latest = dates.sort().pop()!;
    const clearDate = new Date(latest).toLocaleDateString(lang === "en" ? "en-GB" : "pt-BR", { day: "2-digit", month: "short" });
    return lang === "en"
      ? `Under control — ${n} animal${n > 1 ? "s" : ""} in withdrawal period, clears ${clearDate}`
      : `Monitorado — ${n} animal${n > 1 ? "is" : ""} em carência, termina ${clearDate}`;
  }, [activeWithdrawals, lang]);

  const complianceMessage = useMemo(() => {
    const pending    = complianceRows.filter(r => r.status === "pending").length;
    const ineligible = complianceRows.filter(r => r.status === "ineligible").length;
    if (pending === 0 && ineligible === 0)
      return lang === "en" ? "On track — All animals compliant" : "Em dia — Todos os animais conformes";
    if (pending > 0)
      return lang === "en"
        ? `Action required — ${pending} animal${pending > 1 ? "s" : ""} pending certification`
        : `Ação necessária — ${pending} animal${pending > 1 ? "is" : ""} com certificação pendente`;
    return lang === "en"
      ? `Under review — ${ineligible} animal${ineligible > 1 ? "s" : ""} ineligible`
      : `Em revisão — ${ineligible} animal${ineligible > 1 ? "is" : ""} inapto${ineligible > 1 ? "s" : ""}`;
  }, [complianceRows, lang]);

  const deliveryMessage = useMemo(() => {
    const totalLost = deliveryRisk.count;
    if (totalLost === 0) return lang === "en" ? "On track — 0 losses in transit" : "Em dia — 0 perdas em trânsito";
    return lang === "en"
      ? `Monitored — ${totalLost} loss${totalLost > 1 ? "es" : ""} recorded, within acceptable range`
      : `Monitorado — ${totalLost} perda${totalLost > 1 ? "s" : ""} registrada${totalLost > 1 ? "s" : ""}`;
  }, [deliveryRisk.count, lang]);

  // ── Auth ──────────────────────────────────────────────────────────────────────

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-8">

      {/* ═══ HERO ════════════════════════════════════════════════════════════════ */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.1)_0%,rgba(122,168,76,0)_70%)]" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="ag-badge ag-badge-green">{t.pif}</span>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                LIVE
              </span>
              <span className="hidden font-mono text-xs text-[var(--text-muted)] sm:block">{utcTime}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                {(["en", "pt"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${lang === l ? "bg-[var(--primary-hover)] text-white" : "bg-white text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={handleSignOut} className="ag-button-secondary text-xs">{t.signOut}</button>
            </div>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] sm:hidden">{utcTime}</div>
          <h1 className="ag-page-title mt-5">{t.hero.title}</h1>
          <p className="mt-2 text-[1rem] leading-7 text-[var(--text-secondary)]">{t.hero.sub}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{buyerName}</p>
        </div>
      </section>

      {/* ═══ MODULE TABS ════════════════════════════════════════════════════════ */}
      <div className="flex overflow-hidden rounded-2xl border border-[var(--border)] bg-white w-fit">
        {([
          { k: "livestock", label: lang === "en" ? "Livestock & Certifications" : "Pecuária & Certificações", icon: Beef },
          { k: "grains",    label: lang === "en" ? "Grains & Commodities"       : "Grãos & Commodities",       icon: Ship },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setMainTab(k)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition ${mainTab === k ? "bg-[var(--primary-hover)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ═══ LIVESTOCK TAB ══════════════════════════════════════════════════════ */}
      {mainTab === "livestock" && (
        <CompradorLivestockTab
          lots={lots}
          trackingCheckpoints={trackingCheckpoints}
          poultryBatches={poultryBatches}
          filteredRows={filteredRows}
          filteredLivestockRows={filteredLivestockRows}
          lotCompliance={lotCompliance}
          totalAnimals={totalAnimals}
          eligibleCount={eligibleCount}
          halalCount={halalCount}
          nextDeparture={nextDeparture}
          daysToNext={daysToNext}
          survivalRate={survivalRate}
          sanitaryRisk={sanitaryRisk}
          complianceRisk={complianceRisk}
          deliveryRisk={deliveryRisk}
          sanitaryMessage={sanitaryMessage}
          complianceMessage={complianceMessage}
          deliveryMessage={deliveryMessage}
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
      )}

      {/* ═══ GRAINS TAB ═════════════════════════════════════════════════════════ */}
      {mainTab === "grains" && (
        <CompradorGrainsTab
          grainShipments={grainShipments}
          grainTracking={grainTracking}
          grainFarms={grainFarms}
          grainFields={grainFields}
          lang={lang}
          locale={locale}
        />
      )}

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border)] pt-6 pb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">{t.footer}</p>
        <p className="font-mono text-xs text-[var(--text-muted)]">{utcTime}</p>
      </footer>

    </main>
  );
}
