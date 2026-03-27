"use client";

import { useState, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import {
  Beef, CheckCircle2, Clock, AlertTriangle, ShieldCheck,
  ShieldAlert, Truck, MapPin, Users, Activity,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lot = {
  id: string; name: string; objective: string | null;
  pais_destino: string | null; porto_embarque: string | null;
  data_embarque: string | null; certificacoes_exigidas: string[] | null;
  numero_contrato: string | null; status: string | null;
};
type Assignment       = { animal_id: string; lot_id: string };
type Animal          = { id: string; internal_code: string | null; nickname: string | null; sex: string | null; breed: string | null; birth_date: string | null };
type Cert            = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
type Withdrawal      = { animal_id: string; product_name: string | null; withdrawal_date: string | null };
type Score           = { animal_id: string; score_json: Record<string, unknown> | null };
type TrackingCheckpoint = { lot_id: string; stage: string; timestamp: string; animals_confirmed: number | null; animals_lost: number; loss_cause: string | null; location_name: string | null };

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACKING_STAGES = [
  { key: "fazenda",       en: "Farm",        pt: "Fazenda" },
  { key: "concentracao",  en: "Staging",     pt: "Concentração" },
  { key: "transporte",    en: "Transport",   pt: "Transporte" },
  { key: "porto_origem",  en: "Origin Port", pt: "Porto Origem" },
  { key: "navio",         en: "At Sea",      pt: "Navio" },
  { key: "porto_destino", en: "Dest. Port",  pt: "Porto Destino" },
  { key: "entregue",      en: "Delivered",   pt: "Entregue" },
];

const CERT_LIST = ["Halal", "MAPA", "GTA", "SIF"];

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    portal: "PIF Procurement Portal", pif: "PIF · Programa Integrado de Fidelização",
    hero: { title: "Brazilian Livestock · Export Intelligence", sub: "End-to-end traceability from farm to port" },
    kpi: { total: "Total Animals", eligible: "Export Eligible", halal: "Halal Certified", shipments: "Active Shipments", departure: "Next Departure", survival: "Survival Rate" },
    shipments: { title: "Active Shipments", lotId: "Lot ID", origin: "Origin", dest: "Destination", dep: "Departure", animals: "Animals", compliance: "Compliance", status: "Status", details: "View Details" },
    tracking: { title: "Live Shipment Tracking", noData: "No tracking data available yet.", animalsConf: "animals confirmed", loss: "loss", losses: "losses" },
    matrix: { title: "Animal Certification Matrix", all: "All", eligible: "Eligible", pending: "Pending", ineligible: "Ineligible", animal: "Animal", breed: "Breed", age: "Age", withdrawal: "Withdrawal", score: "Score", status: "Status", clear: "Clear", labelEligible: "ELIGIBLE", labelPending: "PENDING", labelIneligible: "INELIGIBLE" },
    risk: { title: "Risk Intelligence", sanitary: "Sanitary Risk", compliance: "Compliance Risk", delivery: "Delivery Risk", low: "LOW", medium: "MEDIUM", high: "HIGH", withWithdrawal: "animals with active withdrawal", ineligible: "ineligible animals", lostInTransit: "animals lost in transit" },
    footer: "Powered by Agraas Intelligence Layer · Certified by MAPA · Real-time data",
    signOut: "Sign Out",
  },
  pt: {
    portal: "Portal de Compras PIF", pif: "PIF · Programa Integrado de Fidelização",
    hero: { title: "Pecuária Brasileira · Inteligência de Exportação", sub: "Rastreabilidade completa da fazenda ao porto" },
    kpi: { total: "Total de Animais", eligible: "Aptos para Exportação", halal: "Certificados Halal", shipments: "Embarques Ativos", departure: "Próximo Embarque", survival: "Taxa de Sobrevivência" },
    shipments: { title: "Embarques Ativos", lotId: "ID do Lote", origin: "Origem", dest: "Destino", dep: "Embarque", animals: "Animais", compliance: "Conformidade", status: "Status", details: "Ver Detalhes" },
    tracking: { title: "Rastreio de Embarques ao Vivo", noData: "Nenhum dado de rastreio disponível ainda.", animalsConf: "animais confirmados", loss: "perda", losses: "perdas" },
    matrix: { title: "Matriz de Certificações Animais", all: "Todos", eligible: "Aptos", pending: "Pendentes", ineligible: "Inaptos", animal: "Animal", breed: "Raça", age: "Idade", withdrawal: "Carência", score: "Score", status: "Status", clear: "Livre", labelEligible: "APTO", labelPending: "PENDENTE", labelIneligible: "INAPTO" },
    risk: { title: "Inteligência de Risco", sanitary: "Risco Sanitário", compliance: "Risco de Conformidade", delivery: "Risco de Entrega", low: "BAIXO", medium: "MÉDIO", high: "ALTO", withWithdrawal: "animais com carência ativa", ineligible: "animais inaptos", lostInTransit: "animais perdidos em trânsito" },
    footer: "Powered by Agraas Intelligence Layer · Certificado pelo MAPA · Dados em tempo real",
    signOut: "Sair",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}
function fmtAge(birth: string | null) {
  if (!birth) return "—";
  const m = Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  return m >= 12 ? `${Math.floor(m / 12)}y ${m % 12}m` : `${m}m`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompradorView({
  buyerName, lots, assignments, animals, certifications, activeWithdrawals, scores, trackingCheckpoints,
}: {
  buyerName: string; lots: Lot[]; assignments: Assignment[]; animals: Animal[];
  certifications: Cert[]; activeWithdrawals: Withdrawal[]; scores: Score[];
  trackingCheckpoints: TrackingCheckpoint[];
}) {
  const [lang, setLang]             = useState<"en" | "pt">("en");
  const [filter, setFilter]         = useState<"all" | "eligible" | "pending" | "ineligible">("all");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [utcTime, setUtcTime]       = useState("");
  const router  = useRouter();
  const t       = T[lang];
  const locale  = lang === "en" ? "en-GB" : "pt-BR";

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

  const complianceRows = useMemo(() => animals.map(animal => {
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

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const totalAnimals  = animals.length;
  const eligibleCount = complianceRows.filter(r => r.status === "eligible").length;
  const halalCount    = animals.filter(a => certsByAnimal.get(a.id)?.has("Halal")).length;
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
    return { score: pct, level: (pct === 0 ? "low" : pct <= 15 ? "medium" : "high") as "low"|"medium"|"high", count: n };
  }, [activeWithdrawals, totalAnimals]);

  const complianceRisk = useMemo(() => {
    const n   = complianceRows.filter(r => r.status === "ineligible").length;
    const pct = totalAnimals ? Math.round((n / totalAnimals) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct <= 20 ? "medium" : "high") as "low"|"medium"|"high", count: n };
  }, [complianceRows, totalAnimals]);

  const deliveryRisk = useMemo(() => {
    const totalLost = trackingCheckpoints.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
    const started   = trackingCheckpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? totalAnimals;
    const pct       = started ? Math.round((totalLost / started) * 100) : 0;
    return { score: pct, level: (pct === 0 ? "low" : pct < 2 ? "medium" : "high") as "low"|"medium"|"high", count: totalLost };
  }, [trackingCheckpoints, totalAnimals]);

  // ── Auth ──────────────────────────────────────────────────────────────────────

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ── Risk style helpers ────────────────────────────────────────────────────────

  const riskBorderColor = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" } as const;
  const riskBadgeCls    = {
    low:    "border-emerald-200 bg-emerald-50 text-emerald-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    high:   "border-red-200 bg-red-50 text-red-700",
  } as const;
  const riskValueCls    = { low: "text-emerald-600", medium: "text-amber-600", high: "text-red-600" } as const;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-8">

      {/* ═══ HERO ════════════════════════════════════════════════════════════════ */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.1)_0%,rgba(122,168,76,0)_70%)]" />

          {/* Top row */}
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
              {/* Lang toggle */}
              <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                {(["en", "pt"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${lang === l ? "bg-[var(--primary-hover)] text-white" : "bg-white text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={handleSignOut}
                className="ag-button-secondary text-xs">
                {t.signOut}
              </button>
            </div>
          </div>

          <div className="mt-1 text-xs text-[var(--text-muted)] sm:hidden">{utcTime}</div>

          <h1 className="ag-page-title mt-5">{t.hero.title}</h1>
          <p className="mt-2 text-[1rem] leading-7 text-[var(--text-secondary)]">{t.hero.sub}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{buyerName}</p>
        </div>
      </section>

      {/* ═══ 6 KPI CARDS ════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Beef,        label: t.kpi.total,     value: totalAnimals,  cls: "text-[var(--text-primary)]" },
          { icon: CheckCircle2,label: t.kpi.eligible,  value: eligibleCount, cls: "text-emerald-600" },
          { icon: ShieldCheck, label: t.kpi.halal,     value: halalCount,    cls: "text-amber-600" },
          { icon: Truck,       label: t.kpi.shipments, value: lots.length,   cls: "text-blue-600" },
          { icon: Clock,       label: t.kpi.departure, value: daysToNext != null ? `T−${daysToNext}` : fmtDate(nextDeparture, locale), cls: "text-purple-600" },
          { icon: Activity,    label: t.kpi.survival,  value: survivalRate != null ? `${survivalRate}%` : "—", cls: survivalRate == null ? "text-[var(--text-muted)]" : survivalRate >= 98 ? "text-emerald-600" : "text-amber-600" },
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

      {/* ═══ ACTIVE SHIPMENTS ════════════════════════════════════════════════════ */}
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
                const barColor  = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
                const pctCls    = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
                const days      = daysUntil(lot.data_embarque);
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

      {/* ═══ LIVE SHIPMENT TRACKING ══════════════════════════════════════════════ */}
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

                  {/* Horizontal stage bar */}
                  <div className="flex items-start">
                    {TRACKING_STAGES.map((stage, i) => {
                      const isDone    = completedSet.has(stage.key);
                      const isCurrent = currentIdx === i;
                      const cp        = cps.find(c => c.stage === stage.key);
                      const isLast    = i === TRACKING_STAGES.length - 1;

                      return (
                        <div key={stage.key} className="relative flex flex-1 flex-col items-center">
                          {/* Connector */}
                          {!isLast && (
                            <div className="absolute top-[11px] left-1/2 h-0.5 w-full z-0"
                              style={isDone
                                ? { background: "#22c55e" }
                                : { backgroundImage: "repeating-linear-gradient(90deg,#d1d5db 0,#d1d5db 5px,transparent 5px,transparent 10px)" }
                              }
                            />
                          )}

                          {/* Dot */}
                          <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            isDone    ? "border-emerald-500 bg-emerald-500"
                            : isCurrent ? "border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                            : "border-[var(--border)] bg-white"
                          }`}>
                            {isDone    && <span className="text-[10px] font-black text-white">✓</span>}
                            {isCurrent && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>

                          {/* Stage label */}
                          <p className={`mt-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.07em] max-w-[64px] ${
                            isDone ? "text-emerald-600" : isCurrent ? "text-blue-600" : "text-[var(--text-muted)]"
                          }`}>
                            {lang === "en" ? stage.en : stage.pt}
                          </p>

                          {/* Location */}
                          {cp?.location_name && (
                            <p className={`mt-1 text-center text-[8px] leading-tight max-w-[72px] ${isCurrent ? "font-semibold text-blue-500" : "text-[var(--text-muted)]"}`}>
                              {cp.location_name}
                            </p>
                          )}

                          {/* Losses */}
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

      {/* ═══ ANIMAL CERTIFICATION MATRIX ════════════════════════════════════════ */}
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--primary-hover)] px-6 py-4">
          <h2 className="font-semibold text-white">{t.matrix.title}</h2>
          {/* Filter */}
          <div className="flex overflow-hidden rounded-lg border border-white/25">
            {([
              { k: "all",        l: t.matrix.all },
              { k: "eligible",   l: t.matrix.eligible },
              { k: "pending",    l: t.matrix.pending },
              { k: "ineligible", l: t.matrix.ineligible },
            ] as const).map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition ${filter === f.k ? "bg-white text-[var(--primary-hover)]" : "bg-transparent text-white/70 hover:bg-white/10"}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
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
              {filteredRows.map(({ animal, certs, score, withdrawals, status }) => {
                const sc = status === "eligible" ? "text-emerald-600" : status === "pending" ? "text-amber-600" : "text-red-600";
                const sbadge = status === "eligible"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : status === "pending"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-red-200 bg-red-50 text-red-700";
                const sl = status === "eligible" ? t.matrix.labelEligible : status === "pending" ? t.matrix.labelPending : t.matrix.labelIneligible;
                return (
                  <tr key={animal.id}
                    onMouseEnter={() => setHoveredRow(animal.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`border-b border-[var(--border)] transition-colors ${hoveredRow === animal.id ? "bg-[var(--primary-soft)]" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {animal.nickname ?? animal.internal_code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{animal.breed ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{fmtAge(animal.birth_date)}</td>
                    {CERT_LIST.map(cert => (
                      <td key={cert} className="px-4 py-3 text-center">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold ${certs.has(cert) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}>
                          {certs.has(cert) ? "✓" : "—"}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      {withdrawals.length === 0
                        ? <span className="text-xs font-semibold text-emerald-600">{t.matrix.clear}</span>
                        : <span className="text-xs font-semibold text-red-600">{new Date(withdrawals[0]).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span>
                      }
                    </td>
                    <td className={`px-4 py-3 text-center text-base font-bold ${score >= 75 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : sc}`}>
                      {score > 0 ? score : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${sbadge}`}>{sl}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ RISK INTELLIGENCE ═══════════════════════════════════════════════════ */}
      <section>
        <h2 className="ag-section-title mb-5">{t.risk.title}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t.risk.sanitary,   data: sanitaryRisk,   detail: `${sanitaryRisk.count} ${t.risk.withWithdrawal}`,   icon: ShieldAlert },
            { label: t.risk.compliance, data: complianceRisk, detail: `${complianceRisk.count} ${t.risk.ineligible}`,     icon: ShieldCheck },
            { label: t.risk.delivery,   data: deliveryRisk,   detail: `${deliveryRisk.count} ${t.risk.lostInTransit}`,    icon: Truck },
          ].map(({ label, data, detail, icon: Icon }) => {
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
                <p className={`mt-4 text-5xl font-bold tracking-tight ${valCls}`}>{data.score}%</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border)] pt-6 pb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">{t.footer}</p>
        <p className="font-mono text-xs text-[var(--text-muted)]">{utcTime}</p>
      </footer>

    </main>
  );
}
