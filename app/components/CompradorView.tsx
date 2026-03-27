"use client";

import { useState, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lot = {
  id: string;
  name: string;
  objective: string | null;
  pais_destino: string | null;
  porto_embarque: string | null;
  data_embarque: string | null;
  certificacoes_exigidas: string[] | null;
  numero_contrato: string | null;
  status: string | null;
};
type Assignment       = { animal_id: string; lot_id: string };
type Animal          = { id: string; internal_code: string | null; nickname: string | null; sex: string | null; breed: string | null; birth_date: string | null };
type Cert            = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
type Withdrawal      = { animal_id: string; product_name: string | null; withdrawal_date: string | null };
type Score           = { animal_id: string; score_json: Record<string, unknown> | null };
type TrackingCheckpoint = { lot_id: string; stage: string; timestamp: string; animals_confirmed: number | null; animals_lost: number; loss_cause: string | null; location_name: string | null };

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACKING_STAGES = [
  { key: "fazenda",       en: "Farm",         pt: "Fazenda" },
  { key: "concentracao",  en: "Staging",      pt: "Concentração" },
  { key: "transporte",    en: "Transport",    pt: "Transporte" },
  { key: "porto_origem",  en: "Origin Port",  pt: "Porto Origem" },
  { key: "navio",         en: "At Sea",       pt: "Navio" },
  { key: "porto_destino", en: "Dest. Port",   pt: "Porto Destino" },
  { key: "entregue",      en: "Delivered",    pt: "Entregue" },
];

const CERT_LIST = ["Halal", "MAPA", "GTA", "SIF"];

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    portal: "PIF Procurement Portal",
    pif: "PIF · Programa Integrado de Fidelização",
    hero: { title: "Brazilian Livestock · Export Intelligence", sub: "End-to-end traceability from farm to port" },
    kpi: { total: "Total Animals Tracked", eligible: "Export Eligible", halal: "Halal Certified", shipments: "Active Shipments", departure: "Next Departure", survival: "Survival Rate" },
    shipments: { title: "Active Shipments", lotId: "Lot ID", origin: "Origin", dest: "Destination", dep: "Departure", animals: "Animals", compliance: "Compliance", status: "Status", details: "View Details" },
    tracking: { title: "Live Shipment Tracking", noData: "No tracking data available", animalsConf: "animals confirmed", loss: "loss", losses: "losses" },
    matrix: { title: "Animal Certification Matrix", all: "All", eligible: "Eligible", pending: "Pending", ineligible: "Ineligible", animal: "Animal", breed: "Breed", age: "Age", withdrawal: "Withdrawal", score: "Score", status: "Status", clear: "Clear", labelEligible: "ELIGIBLE", labelPending: "PENDING", labelIneligible: "INELIGIBLE" },
    risk: { title: "Risk Intelligence", sanitary: "Sanitary Risk", compliance: "Compliance Risk", delivery: "Delivery Risk", low: "LOW", medium: "MEDIUM", high: "HIGH", withWithdrawal: "animals with active withdrawal", ineligible: "ineligible animals", lostInTransit: "animals lost in transit" },
    footer: "Powered by Agraas Intelligence Layer · Certified by MAPA · Real-time data",
    signOut: "Sign Out",
  },
  pt: {
    portal: "Portal de Compras PIF",
    pif: "PIF · Programa Integrado de Fidelização",
    hero: { title: "Pecuária Brasileira · Inteligência de Exportação", sub: "Rastreabilidade completa da fazenda ao porto" },
    kpi: { total: "Total de Animais", eligible: "Aptos para Exportação", halal: "Certificados Halal", shipments: "Embarques Ativos", departure: "Próximo Embarque", survival: "Taxa de Sobrevivência" },
    shipments: { title: "Embarques Ativos", lotId: "ID do Lote", origin: "Origem", dest: "Destino", dep: "Embarque", animals: "Animais", compliance: "Conformidade", status: "Status", details: "Ver Detalhes" },
    tracking: { title: "Rastreio de Embarques ao Vivo", noData: "Nenhum dado de rastreio disponível", animalsConf: "animais confirmados", loss: "perda", losses: "perdas" },
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
  buyerName,
  lots,
  assignments,
  animals,
  certifications,
  activeWithdrawals,
  scores,
  trackingCheckpoints,
}: {
  buyerName: string;
  lots: Lot[];
  assignments: Assignment[];
  animals: Animal[];
  certifications: Cert[];
  activeWithdrawals: Withdrawal[];
  scores: Score[];
  trackingCheckpoints: TrackingCheckpoint[];
}) {
  const [lang, setLang]             = useState<"en" | "pt">("en");
  const [filter, setFilter]         = useState<"all" | "eligible" | "pending" | "ineligible">("all");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [utcTime, setUtcTime]       = useState("");
  const router = useRouter();
  const t      = T[lang];
  const locale = lang === "en" ? "en-GB" : "pt-BR";

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().replace(" GMT", " UTC"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived maps ────────────────────────────────────────────────────────────

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
    const certs      = certsByAnimal.get(animal.id) ?? new Set<string>();
    const score      = scoreByAnimal.get(animal.id) ?? 0;
    const withdrawals = withdrawalsByAnimal.get(animal.id) ?? [];
    const certsOk    = requiredCerts.every(c => certs.has(c));
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

  const totalAnimals   = animals.length;
  const eligibleCount  = complianceRows.filter(r => r.status === "eligible").length;
  const halalCount     = animals.filter(a => certsByAnimal.get(a.id)?.has("Halal")).length;
  const nextDeparture  = lots.map(l => l.data_embarque).filter(Boolean).sort()[0] ?? null;
  const daysToNext     = daysUntil(nextDeparture);

  const survivalRate = useMemo(() => {
    if (!trackingCheckpoints.length) return null;
    const started = trackingCheckpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? null;
    const lastCp  = trackingCheckpoints.reduce<TrackingCheckpoint | null>(
      (a, b) => !a || new Date(b.timestamp) > new Date(a.timestamp) ? b : a, null);
    const alive   = lastCp?.animals_confirmed ?? null;
    return started && alive ? Math.round((alive / started) * 100) : null;
  }, [trackingCheckpoints]);

  // ── Risk scores ──────────────────────────────────────────────────────────────

  const sanitaryRisk = useMemo(() => {
    const n   = activeWithdrawals.length;
    const pct = totalAnimals ? Math.round((n / totalAnimals) * 100) : 0;
    return { score: pct, level: pct === 0 ? "low" : pct <= 15 ? "medium" : "high" as "low" | "medium" | "high", count: n };
  }, [activeWithdrawals, totalAnimals]);

  const complianceRisk = useMemo(() => {
    const n   = complianceRows.filter(r => r.status === "ineligible").length;
    const pct = totalAnimals ? Math.round((n / totalAnimals) * 100) : 0;
    return { score: pct, level: pct === 0 ? "low" : pct <= 20 ? "medium" : "high" as "low" | "medium" | "high", count: n };
  }, [complianceRows, totalAnimals]);

  const deliveryRisk = useMemo(() => {
    const totalLost = trackingCheckpoints.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
    const started   = trackingCheckpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? totalAnimals;
    const pct       = started ? Math.round((totalLost / started) * 100) : 0;
    return { score: pct, level: pct === 0 ? "low" : pct < 2 ? "medium" : "high" as "low" | "medium" | "high", count: totalLost };
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

  // ── Style tokens ─────────────────────────────────────────────────────────────

  const RISK_COLOR  = { low: "#22c55e",              medium: "#f59e0b",              high: "#ef4444"              } as const;
  const RISK_BG     = { low: "rgba(34,197,94,0.07)",  medium: "rgba(245,158,11,0.07)", high: "rgba(239,68,68,0.07)" } as const;
  const RISK_BORDER = { low: "rgba(34,197,94,0.2)",   medium: "rgba(245,158,11,0.2)", high: "rgba(239,68,68,0.2)"  } as const;

  const gridBg: React.CSSProperties = {
    backgroundColor: "#0a0a0a",
    backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
    backgroundSize: "48px 48px",
  };
  const SEC_TITLE: React.CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: 0 };
  const TH: React.CSSProperties = { padding: "11px 16px", textAlign: "left", fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" };
  const DIVIDER: React.CSSProperties = { height: 1, background: "rgba(255,255,255,0.055)", margin: "0 0 72px" };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", ...gridBg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: "#fff" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 52px 96px" }}>

        {/* ═══ HEADER ════════════════════════════════════════════════════════════ */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64, margin: "0 -52px", padding: "0 52px",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          backgroundColor: "rgba(10,10,10,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        } as React.CSSProperties}>

          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 32, height: 32, background: "#22c55e", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M3 15L9 3l6 12H3z" fill="#000"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1 }}>agraas</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginTop: 2 }}>{t.portal}</div>
            </div>
            <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.06)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "livepulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", color: "#22c55e" }}>LIVE</span>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", letterSpacing: "0.02em" }}>{utcTime}</span>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              {(["en","pt"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 13px", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", background: lang === l ? "rgba(255,255,255,0.1)" : "transparent", color: lang === l ? "#fff" : "rgba(255,255,255,0.28)", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={handleSignOut} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.32)", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.15s" }}>
              {t.signOut}
            </button>
          </div>
        </header>

        <div style={{ paddingTop: 88 }}>

        {/* ═══ HERO ══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.26em", textTransform: "uppercase", color: "#22c55e" }}>{t.pif}</span>
            <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>{buyerName}</span>
          </div>
          <h1 style={{ fontSize: "clamp(34px,4vw,56px)", fontWeight: 800, letterSpacing: "-0.05em", color: "#fff", margin: "0 0 14px", lineHeight: 1.01 }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.36)", margin: 0, letterSpacing: "0.01em" }}>{t.hero.sub}</p>
        </section>

        {/* ═══ 6 KPIs ════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: "rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { v: totalAnimals,                                                      label: t.kpi.total,     color: "#fff" },
              { v: eligibleCount,                                                      label: t.kpi.eligible,  color: "#22c55e" },
              { v: halalCount,                                                         label: t.kpi.halal,     color: "#f59e0b" },
              { v: lots.length,                                                        label: t.kpi.shipments, color: "#3b82f6" },
              { v: daysToNext != null ? `T−${daysToNext}` : fmtDate(nextDeparture, locale), label: t.kpi.departure, color: "#a78bfa" },
              { v: survivalRate != null ? `${survivalRate}%` : "—",                  label: t.kpi.survival,  color: survivalRate == null ? "rgba(255,255,255,0.3)" : survivalRate >= 98 ? "#22c55e" : "#f59e0b" },
            ].map((kpi, i) => (
              <div key={i} style={{ background: "#0a0a0a", padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 14, lineHeight: 1.4 }}>{kpi.label}</div>
                <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.05em", color: kpi.color, lineHeight: 1 }}>{kpi.v}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={DIVIDER} />

        {/* ═══ ACTIVE SHIPMENTS ══════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <h2 style={SEC_TITLE}>{t.shipments.title}</h2>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{lots.length} lot{lots.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {[t.shipments.lotId, t.shipments.origin, t.shipments.dest, t.shipments.dep, t.shipments.animals, t.shipments.compliance, t.shipments.status, ""].map((h, i) => (
                    <th key={i} style={{ ...TH, textAlign: i >= 4 ? "center" as const : "left" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotCompliance.map(({ lot, total, eligible, pct }, idx) => {
                  const barColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
                  const days = daysUntil(lot.data_embarque);
                  return (
                    <tr key={lot.id} style={{ borderBottom: idx < lotCompliance.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.12s" }}>
                      <td style={{ padding: "18px 16px", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{lot.name}</td>
                      <td style={{ padding: "18px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{lot.porto_embarque ?? "—"}</td>
                      <td style={{ padding: "18px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{lot.pais_destino ?? "—"}</td>
                      <td style={{ padding: "18px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                        {fmtDate(lot.data_embarque, locale)}
                        {days != null && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#a78bfa" }}>T−{days}</span>}
                      </td>
                      <td style={{ padding: "18px 16px", textAlign: "center", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>{total}</td>
                      <td style={{ padding: "18px 24px" }}>
                        <div style={{ minWidth: 130 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", color: barColor }}>{pct}%</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{eligible}/{total}</span>
                          </div>
                          <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 1s ease" }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "18px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: lot.status === "closed" ? "rgba(255,255,255,0.2)" : "#22c55e", border: `1px solid ${lot.status === "closed" ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.28)"}`, background: lot.status === "closed" ? "transparent" : "rgba(34,197,94,0.06)", borderRadius: 6, padding: "4px 10px" }}>
                          {lot.status ?? "ACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "18px 16px" }}>
                        <button style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                          {t.shipments.details} →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div style={DIVIDER} />

        {/* ═══ LIVE SHIPMENT TRACKING ════════════════════════════════════════════ */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ ...SEC_TITLE, marginBottom: 28 }}>{t.tracking.title}</h2>

          {trackingCheckpoints.length === 0 ? (
            <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "52px 32px", textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: 13 }}>
              {t.tracking.noData}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lots.map(lot => {
                const cps = trackingCheckpoints.filter(c => c.lot_id === lot.id);
                if (!cps.length) return null;
                const completedSet = new Set(cps.map(c => c.stage));
                const currentIdx  = TRACKING_STAGES.findIndex(s => !completedSet.has(s.key));
                const totalLost   = cps.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
                const lastConfCp  = [...cps].reverse().find(c => c.animals_confirmed != null);

                return (
                  <div key={lot.id} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "28px 36px 32px" }}>
                    {/* Lot bar */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>{lot.name}</span>
                        {lot.pais_destino && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>→ {lot.pais_destino}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        {lastConfCp?.animals_confirmed != null && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: "#22c55e", letterSpacing: "-0.03em" }}>{lastConfCp.animals_confirmed}</span>
                            <span style={{ marginLeft: 5 }}>{t.tracking.animalsConf}</span>
                          </span>
                        )}
                        {totalLost > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 6, padding: "3px 12px" }}>
                            ▼ {totalLost} {totalLost === 1 ? t.tracking.loss : t.tracking.losses}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stage timeline */}
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      {TRACKING_STAGES.map((stage, i) => {
                        const isDone    = completedSet.has(stage.key);
                        const isCurrent = currentIdx === i;
                        const cp        = cps.find(c => c.stage === stage.key);
                        const isLast    = i === TRACKING_STAGES.length - 1;

                        const dotBg    = isDone ? "#22c55e" : isCurrent ? "#3b82f6" : "rgba(255,255,255,0.04)";
                        const dotBorder = isDone ? "#22c55e" : isCurrent ? "#3b82f6" : "rgba(255,255,255,0.12)";
                        const labelCol = isDone ? "rgba(255,255,255,0.6)" : isCurrent ? "#60a5fa" : "rgba(255,255,255,0.18)";

                        return (
                          <div key={stage.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                            {/* Connector */}
                            {!isLast && (
                              <div style={{
                                position: "absolute", top: 12, left: "50%", width: "100%", height: 2, zIndex: 0,
                                ...(isDone
                                  ? { background: "#22c55e" }
                                  : { backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.13) 0,rgba(255,255,255,0.13) 5px,transparent 5px,transparent 10px)" }
                                ),
                              }} />
                            )}

                            {/* Dot */}
                            <div style={{
                              width: 26, height: 26, borderRadius: "50%",
                              background: dotBg, border: `2px solid ${dotBorder}`,
                              zIndex: 1, position: "relative", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              boxShadow: isCurrent ? "0 0 0 4px rgba(59,130,246,0.14),0 0 20px rgba(59,130,246,0.28)" : "none",
                              transition: "box-shadow 0.3s",
                            }}>
                              {isDone && <span style={{ fontSize: 11, fontWeight: 900, color: "#000", lineHeight: 1 }}>✓</span>}
                              {isCurrent && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff" }} />}
                            </div>

                            {/* Stage name */}
                            <div style={{ marginTop: 10, textAlign: "center", fontSize: 9, fontWeight: isCurrent ? 800 : 600, letterSpacing: "0.09em", textTransform: "uppercase", color: labelCol, lineHeight: 1.4, maxWidth: 68 }}>
                              {lang === "en" ? stage.en : stage.pt}
                            </div>

                            {/* Location */}
                            {cp?.location_name && (
                              <div style={{ marginTop: 4, fontSize: 8, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "#60a5fa" : "rgba(255,255,255,0.2)", textAlign: "center", maxWidth: 76, lineHeight: 1.3 }}>
                                {cp.location_name}
                              </div>
                            )}

                            {/* Losses */}
                            {cp && cp.animals_lost > 0 && (
                              <div style={{ marginTop: 5, textAlign: "center" }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444" }}>▼{cp.animals_lost}</span>
                                {cp.loss_cause && (
                                  <div style={{ fontSize: 7.5, color: "rgba(239,68,68,0.65)", marginTop: 2, maxWidth: 72, lineHeight: 1.3 }}>{cp.loss_cause}</div>
                                )}
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

        <div style={DIVIDER} />

        {/* ═══ ANIMAL CERTIFICATION MATRIX ══════════════════════════════════════ */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <h2 style={SEC_TITLE}>{t.matrix.title}</h2>
            {/* Filter tabs */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              {([
                { k: "all",        l: t.matrix.all },
                { k: "eligible",   l: t.matrix.eligible },
                { k: "pending",    l: t.matrix.pending },
                { k: "ineligible", l: t.matrix.ineligible },
              ] as const).map(f => (
                <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: "5px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: filter === f.k ? "rgba(255,255,255,0.1)" : "transparent", color: filter === f.k ? "#fff" : "rgba(255,255,255,0.28)", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {[t.matrix.animal, t.matrix.breed, t.matrix.age, "Halal", "MAPA", "GTA", "SIF", t.matrix.withdrawal, t.matrix.score, t.matrix.status].map((h, i) => (
                    <th key={i} style={{ ...TH, textAlign: i > 2 ? "center" as const : "left" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ animal, certs, score, withdrawals, status }) => {
                  const sc = status === "eligible" ? "#22c55e" : status === "pending" ? "#f59e0b" : "#ef4444";
                  const sl = status === "eligible" ? t.matrix.labelEligible : status === "pending" ? t.matrix.labelPending : t.matrix.labelIneligible;
                  return (
                    <tr
                      key={animal.id}
                      onMouseEnter={() => setHoveredRow(animal.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: hoveredRow === animal.id ? "rgba(255,255,255,0.028)" : "transparent", transition: "background 0.1s" }}
                    >
                      <td style={{ padding: "15px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{animal.nickname ?? animal.internal_code ?? "—"}</span>
                      </td>
                      <td style={{ padding: "15px 16px", fontSize: 12, color: "rgba(255,255,255,0.32)", whiteSpace: "nowrap" }}>{animal.breed ?? "—"}</td>
                      <td style={{ padding: "15px 16px", fontSize: 12, color: "rgba(255,255,255,0.32)", whiteSpace: "nowrap" }}>{fmtAge(animal.birth_date)}</td>
                      {CERT_LIST.map(cert => (
                        <td key={cert} style={{ padding: "15px 16px", textAlign: "center" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 800, background: certs.has(cert) ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.06)", color: certs.has(cert) ? "#22c55e" : "rgba(239,68,68,0.4)", border: `1px solid ${certs.has(cert) ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.12)"}` }}>
                            {certs.has(cert) ? "✓" : "—"}
                          </span>
                        </td>
                      ))}
                      <td style={{ padding: "15px 16px", textAlign: "center" }}>
                        {withdrawals.length === 0
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>{t.matrix.clear}</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>{new Date(withdrawals[0]).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span>
                        }
                      </td>
                      <td style={{ padding: "15px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em", color: score >= 75 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444" }}>
                          {score > 0 ? score : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "15px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: sc, background: `${sc}12`, border: `1px solid ${sc}35`, borderRadius: 6, padding: "4px 10px" }}>
                          {sl}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div style={DIVIDER} />

        {/* ═══ RISK INTELLIGENCE ═════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ ...SEC_TITLE, marginBottom: 28 }}>{t.risk.title}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { label: t.risk.sanitary,   data: sanitaryRisk,   detail: `${sanitaryRisk.count} ${t.risk.withWithdrawal}` },
              { label: t.risk.compliance, data: complianceRisk, detail: `${complianceRisk.count} ${t.risk.ineligible}` },
              { label: t.risk.delivery,   data: deliveryRisk,   detail: `${deliveryRisk.count} ${t.risk.lostInTransit}` },
            ].map(({ label, data, detail }) => {
              const c  = RISK_COLOR[data.level];
              const bg = RISK_BG[data.level];
              const bd = RISK_BORDER[data.level];
              const rl = data.level === "low" ? t.risk.low : data.level === "medium" ? t.risk.medium : t.risk.high;
              return (
                <div key={label} style={{ border: `1px solid ${bd}`, borderRadius: 14, padding: "28px 28px 26px", background: bg }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>{label}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: c, background: `${c}18`, border: `1px solid ${c}38`, borderRadius: 6, padding: "3px 10px" }}>{rl}</span>
                  </div>
                  <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.06em", color: c, lineHeight: 1, marginBottom: 14 }}>{data.score}%</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.5 }}>{detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        </div>{/* end paddingTop */}

        {/* ═══ FOOTER ════════════════════════════════════════════════════════════ */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.16)", letterSpacing: "0.06em" }}>{t.footer}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.16)", fontFamily: "monospace" }}>{utcTime}</span>
        </footer>

      </div>

      {/* Animations */}
      <style>{`
        @keyframes livepulse {
          0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(34,197,94,0.5); }
          50%      { opacity:.7; box-shadow:0 0 0 6px rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
}
