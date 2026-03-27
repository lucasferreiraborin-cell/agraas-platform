"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const ExportMapGL = dynamic(() => import("@/app/components/ExportMapGL"), { ssr: false });

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

type Assignment = { animal_id: string; lot_id: string };
type Animal = { id: string; internal_code: string | null; nickname: string | null; sex: string | null; breed: string | null; birth_date: string | null };
type Cert = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
type Withdrawal = { animal_id: string; product_name: string | null; withdrawal_date: string | null };
type Score = { animal_id: string; score_json: Record<string, unknown> | null };
type TrackingCheckpoint = { lot_id: string; stage: string; timestamp: string; animals_confirmed: number | null; animals_lost: number; loss_cause: string | null; location_name: string | null };

// ─── i18n ─────────────────────────────────────────────────────────────────────

const EN = {
  portal: "PIF Procurement Portal",
  hero: { title: "Brazilian Livestock · Export Intelligence", sub: "Real-time traceability from farm to port — Santos to Jeddah" },
  kpi: { total: "Total Animals Tracked", eligible: "Export Eligible", halal: "Halal Certified", departure: "Next Departure" },
  shipments: { title: "Active Shipments", lotId: "Lot ID", contract: "Contract", origin: "Origin", dest: "Destination", dep: "Departure", animals: "Animals", compliance: "Compliance", status: "Status", manifest: "View Full Manifest" },
  matrix: { title: "Animal Certification Matrix", animal: "Animal", breed: "Breed", halal: "Halal", mapa: "MAPA", gta: "GTA", sif: "SIF", withdrawal: "Withdrawal", score: "Score", status: "Status" },
  tracking: { title: "Live Route Tracking", route: "Santos → Cape of Good Hope → Red Sea → Jeddah", nextShipment: "Next Shipment", daysTo: "Days to Departure", confirmed: "Animals Confirmed" },
  shipTracking: { title: "Live Shipment Tracking", noData: "No tracking data yet", losses: "losses", animals: "animals confirmed", current: "CURRENT", done: "DONE" },
  footer: "Powered by Agraas Intelligence Layer · Certified by MAPA · Real-time data",
  signOut: "Sign Out",
  eligible: "ELIGIBLE",
  pending: "PENDING",
  ineligible: "INELIGIBLE",
  clear: "Clear",
  active: "Active",
  na: "N/A",
};

const PT = {
  portal: "Portal de Compras PIF",
  hero: { title: "Pecuária Brasileira · Inteligência de Exportação", sub: "Rastreabilidade em tempo real da fazenda ao porto — Santos a Jeddah" },
  kpi: { total: "Total de Animais", eligible: "Aptos para Exportação", halal: "Certificados Halal", departure: "Próximo Embarque" },
  shipments: { title: "Embarques Ativos", lotId: "ID do Lote", contract: "Contrato", origin: "Origem", dest: "Destino", dep: "Embarque", animals: "Animais", compliance: "Conformidade", status: "Status", manifest: "Ver Manifesto Completo" },
  matrix: { title: "Matriz de Certificações", animal: "Animal", breed: "Raça", halal: "Halal", mapa: "MAPA", gta: "GTA", sif: "SIF", withdrawal: "Carência", score: "Score", status: "Status" },
  tracking: { title: "Rastreamento da Rota", route: "Santos → Cabo da Boa Esperança → Mar Vermelho → Jeddah", nextShipment: "Próximo Embarque", daysTo: "Dias para Embarque", confirmed: "Animais Confirmados" },
  shipTracking: { title: "Rastreio de Embarque ao Vivo", noData: "Nenhum dado de rastreio ainda", losses: "perdas", animals: "animais confirmados", current: "ATUAL", done: "CONCLUÍDO" },
  footer: "Powered by Agraas Intelligence Layer · Certificado pelo MAPA · Dados em tempo real",
  signOut: "Sair",
  eligible: "APTO",
  pending: "PENDENTE",
  ineligible: "INAPTO",
  clear: "Livre",
  active: "Ativo",
  na: "N/D",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAge(birth: string | null): string {
  if (!birth) return "—";
  const months = Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  return months >= 12 ? `${Math.floor(months / 12)}y ${months % 12}m` : `${months}m`;
}

function ComplianceBar({ pct, eligible, total }: { pct: number; eligible: number; total: number }) {
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 140 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: "-0.03em" }}>{pct}%</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>{eligible}/{total}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function CertCell({ has }: { has: boolean }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 22,
      height: 22,
      borderRadius: 6,
      background: has ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.08)",
      color: has ? "#22c55e" : "rgba(239,68,68,0.5)",
      fontSize: 11,
      fontWeight: 700,
      border: `1px solid ${has ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.15)"}`,
    }}>
      {has ? "✓" : "—"}
    </span>
  );
}

function StatusBadge({ status, t }: { status: "eligible" | "pending" | "ineligible"; t: typeof EN }) {
  const map = {
    eligible:   { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)",  color: "#22c55e",  label: t.eligible },
    pending:    { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)", color: "#f59e0b",  label: t.pending },
    ineligible: { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)",   color: "#ef4444",  label: t.ineligible },
  };
  const s = map[status];
  return (
    <span style={{
      display: "inline-block",
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      borderRadius: 6,
      padding: "3px 10px",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TRACKING_STAGES = [
  { key: "fazenda",       label: "Farm",          labelPt: "Fazenda" },
  { key: "concentracao",  label: "Staging",       labelPt: "Concentração" },
  { key: "transporte",    label: "Transport",     labelPt: "Transporte" },
  { key: "porto_origem",  label: "Origin Port",   labelPt: "Porto Origem" },
  { key: "navio",         label: "At Sea",        labelPt: "Navio" },
  { key: "porto_destino", label: "Dest. Port",    labelPt: "Porto Destino" },
  { key: "entregue",      label: "Delivered",     labelPt: "Entregue" },
];

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
  const [lang, setLang] = useState<"en" | "pt">("en");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [utcTime, setUtcTime] = useState("");
  const router = useRouter();
  const t = lang === "en" ? EN : PT;

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace(" GMT", " UTC"));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Derived maps ────────────────────────────────────────────────────────────

  const animalsByLot = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of assignments) {
      const list = map.get(a.lot_id) ?? [];
      list.push(a.animal_id);
      map.set(a.lot_id, list);
    }
    return map;
  }, [assignments]);

  const certsByAnimal = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of certifications) {
      if (!map.has(c.animal_id)) map.set(c.animal_id, new Set());
      map.get(c.animal_id)!.add(c.certification_name);
    }
    return map;
  }, [certifications]);

  const withdrawalsByAnimal = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const w of activeWithdrawals) {
      const list = map.get(w.animal_id) ?? [];
      list.push(w.withdrawal_date ?? "");
      map.set(w.animal_id, list);
    }
    return map;
  }, [activeWithdrawals]);

  const scoreByAnimal = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of scores) {
      const total = (s.score_json as Record<string, number> | null)?.total_score;
      if (total != null) map.set(s.animal_id, Number(total));
    }
    return map;
  }, [scores]);

  // ── Compliance per animal ────────────────────────────────────────────────────

  const requiredCerts = lots[0]?.certificacoes_exigidas ?? [];

  const complianceRows = useMemo(() => animals.map(animal => {
    const certs = certsByAnimal.get(animal.id) ?? new Set<string>();
    const score = scoreByAnimal.get(animal.id) ?? 0;
    const withdrawals = withdrawalsByAnimal.get(animal.id) ?? [];
    const certsOk = requiredCerts.every(c => certs.has(c));
    const status: "eligible" | "pending" | "ineligible" =
      score < 60 || withdrawals.length > 0 ? "ineligible"
      : !certsOk ? "pending"
      : "eligible";
    return { animal, certs, score, withdrawals, status };
  }), [animals, certsByAnimal, scoreByAnimal, withdrawalsByAnimal, requiredCerts]);

  // ── KPIs ────────────────────────────────────────────────────────────────────

  const totalAnimals = animals.length;
  const halalCount = animals.filter(a => certsByAnimal.get(a.id)?.has("Halal")).length;
  const eligibleCount = complianceRows.filter(r => r.status === "eligible").length;
  const nextDeparture = lots
    .map(l => l.data_embarque)
    .filter(Boolean)
    .sort()[0] ?? null;
  const daysToNext = daysUntil(nextDeparture);

  // ── Lot compliance ───────────────────────────────────────────────────────────

  const lotCompliance = useMemo(() => lots.map(lot => {
    const ids = animalsByLot.get(lot.id) ?? [];
    const eligible = ids.filter(id => {
      const row = complianceRows.find(r => r.animal.id === id);
      return row?.status === "eligible";
    }).length;
    return { lot, total: ids.length, eligible, pct: ids.length ? Math.round((eligible / ids.length) * 100) : 0 };
  }), [lots, animalsByLot, complianceRows]);

  // ── Sign out ─────────────────────────────────────────────────────────────────

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ── Grid pattern ─────────────────────────────────────────────────────────────

  const gridBg = {
    backgroundColor: "#0a0a0a",
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
    `,
    backgroundSize: "48px 48px",
  } as const;

  const CERT_LIST = ["Halal", "MAPA", "GTA", "SIF"];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", ...gridBg, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px 80px" }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 64,
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(10,10,10,0.85)",
          margin: "0 -40px",
          padding2: "24px 40px",
        } as React.CSSProperties}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingLeft: 40 }}>
            {/* Agraas mark */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "#22c55e", borderRadius: 8 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 15L9 3l6 12H3z" fill="#000" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>agraas</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 1 }}>{t.portal}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingRight: 40 }}>
            {/* Lang toggle */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              {(["en", "pt"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: lang === l ? "rgba(255,255,255,0.1)" : "transparent",
                  color: lang === l ? "#fff" : "rgba(255,255,255,0.35)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button onClick={handleSignOut} style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}>
              {t.signOut}
            </button>
          </div>
        </header>

        <div style={{ paddingTop: 64 }}>

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#22c55e",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 8px #22c55e" }} />
              Live
            </span>
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 3.5vw, 48px)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.04em",
            margin: "0 0 12px",
            lineHeight: 1.05,
          }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", margin: 0, letterSpacing: "0.01em" }}>
            {t.hero.sub}
          </p>
        </section>

        {/* ── KPIs ───────────────────────────────────────────────────────────── */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", marginBottom: 72, border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { value: totalAnimals, label: t.kpi.total, color: "#fff" },
            { value: eligibleCount, label: t.kpi.eligible, color: "#22c55e" },
            { value: halalCount, label: t.kpi.halal, color: "#f59e0b" },
            { value: daysToNext != null ? `T−${daysToNext}` : fmtDate(nextDeparture), label: t.kpi.departure, color: "#3b82f6" },
          ].map((kpi, i) => (
            <div key={i} style={{ background: "#0a0a0a", padding: "32px 28px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.05em", color: kpi.color, lineHeight: 1 }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </section>

        {/* ── Shipments ──────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              {t.shipments.title}
            </h2>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{lots.length} lot{lots.length !== 1 ? "s" : ""}</span>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {[t.shipments.lotId, t.shipments.contract, t.shipments.origin, t.shipments.dest, t.shipments.dep, t.shipments.animals, t.shipments.compliance, t.shipments.status, ""].map((h, i) => (
                    <th key={i} style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.25)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotCompliance.map(({ lot, total, eligible, pct }) => (
                  <tr key={lot.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "transparent" }}>
                    <td style={{ padding: "16px", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {lot.name}
                    </td>
                    <td style={{ padding: "16px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                      {lot.numero_contrato ?? "—"}
                    </td>
                    <td style={{ padding: "16px", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      {lot.porto_embarque ?? "—"}
                    </td>
                    <td style={{ padding: "16px", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      {lot.pais_destino ?? "—"}
                    </td>
                    <td style={{ padding: "16px", fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                      {fmtDate(lot.data_embarque)}
                    </td>
                    <td style={{ padding: "16px", fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>
                      {total}
                    </td>
                    <td style={{ padding: "16px 24px 16px 16px" }}>
                      <ComplianceBar pct={pct} eligible={eligible} total={total} />
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: lot.status === "closed" ? "rgba(255,255,255,0.25)" : "#22c55e",
                        border: `1px solid ${lot.status === "closed" ? "rgba(255,255,255,0.1)" : "rgba(34,197,94,0.3)"}`,
                        background: lot.status === "closed" ? "transparent" : "rgba(34,197,94,0.08)",
                        borderRadius: 6,
                        padding: "3px 10px",
                      }}>
                        {lot.status ?? t.active}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <button style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#22c55e",
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.25)",
                        borderRadius: 8,
                        padding: "7px 14px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.03em",
                        transition: "all 0.15s",
                      }}>
                        {t.shipments.manifest}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Animal Certification Matrix ─────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              {t.matrix.title}
            </h2>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{animals.length} animals</span>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {[t.matrix.animal, t.matrix.breed, "Age", t.matrix.halal, t.matrix.mapa, t.matrix.gta, t.matrix.sif, t.matrix.withdrawal, t.matrix.score, t.matrix.status].map((h, i) => (
                    <th key={i} style={{
                      padding: "12px 14px",
                      textAlign: i <= 2 ? "left" : "center",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.25)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complianceRows.map(({ animal, certs, score, withdrawals, status }) => (
                  <tr
                    key={animal.id}
                    onMouseEnter={() => setHoveredRow(animal.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: hoveredRow === animal.id ? "rgba(255,255,255,0.03)" : "transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                        {animal.nickname ?? animal.internal_code ?? animal.id.slice(0, 8)}
                      </span>
                    </td>
                    <td style={{ padding: "14px", fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                      {animal.breed ?? "—"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                      {fmtAge(animal.birth_date)}
                    </td>
                    {CERT_LIST.map(cert => (
                      <td key={cert} style={{ padding: "14px", textAlign: "center" }}>
                        <CertCell has={certs.has(cert)} />
                      </td>
                    ))}
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      {withdrawals.length === 0 ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#22c55e" }}>{t.clear}</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444" }}>
                          {new Date(withdrawals[0]).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        color: score >= 75 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
                      }}>
                        {score > 0 ? score : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <StatusBadge status={status} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Live Shipment Tracking ─────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>
            {t.shipTracking.title}
          </h2>
          {lots.length === 0 || trackingCheckpoints.length === 0 ? (
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "40px 32px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
              {t.shipTracking.noData}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lots.map(lot => {
                const cps = trackingCheckpoints.filter(c => c.lot_id === lot.id);
                const completedStages = new Set(cps.map(c => c.stage));
                const currentIdx = TRACKING_STAGES.findIndex(s => !completedStages.has(s.key));
                const lastCp = cps.length > 0 ? cps[cps.length - 1] : null;
                const totalLost = cps.reduce((s, c) => s + (c.animals_lost ?? 0), 0);

                return (
                  <div key={lot.id} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "24px 28px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: "0.05em" }}>{lot.name}</span>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        {lastCp?.animals_confirmed != null && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                            <span style={{ fontWeight: 700, color: "#22c55e" }}>{lastCp.animals_confirmed}</span> {t.shipTracking.animals}
                          </span>
                        )}
                        {totalLost > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "2px 10px" }}>
                            ⚠ {totalLost} {t.shipTracking.losses}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Horizontal stage bar */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                      {TRACKING_STAGES.map((stage, i) => {
                        const isDone = completedStages.has(stage.key);
                        const isCurrent = currentIdx === i;
                        const cp = cps.find(c => c.stage === stage.key);
                        const isLast = i === TRACKING_STAGES.length - 1;

                        const dotColor = isDone ? "#22c55e" : isCurrent ? "#3b82f6" : "rgba(255,255,255,0.12)";
                        const lineColor = isDone ? "#22c55e" : "rgba(255,255,255,0.08)";
                        const labelColor = isDone ? "#22c55e" : isCurrent ? "#3b82f6" : "rgba(255,255,255,0.25)";

                        return (
                          <div key={stage.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                            {/* Connector line */}
                            {!isLast && (
                              <div style={{
                                position: "absolute",
                                top: 9,
                                left: "50%",
                                width: "100%",
                                height: 2,
                                background: lineColor,
                                zIndex: 0,
                              }} />
                            )}

                            {/* Dot */}
                            <div style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: isDone ? "#22c55e" : isCurrent ? "#3b82f6" : "rgba(255,255,255,0.06)",
                              border: `2px solid ${dotColor}`,
                              zIndex: 1,
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              boxShadow: isCurrent ? "0 0 10px rgba(59,130,246,0.5)" : "none",
                            }}>
                              {isDone && <span style={{ color: "#000", fontSize: 10, fontWeight: 900 }}>✓</span>}
                              {isCurrent && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />}
                            </div>

                            {/* Stage label */}
                            <div style={{ marginTop: 8, textAlign: "center", fontSize: 9, fontWeight: isCurrent ? 800 : isDone ? 700 : 600, letterSpacing: "0.06em", textTransform: "uppercase", color: labelColor, lineHeight: 1.3 }}>
                              {lang === "en" ? stage.label : stage.labelPt}
                            </div>

                            {/* Status badge */}
                            {(isDone || isCurrent) && (
                              <div style={{ marginTop: 4, fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: isDone ? "#22c55e" : "#3b82f6" }}>
                                {isDone ? t.shipTracking.done : t.shipTracking.current}
                              </div>
                            )}

                            {/* Loss indicator */}
                            {cp && cp.animals_lost > 0 && (
                              <div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: "#ef4444" }}>
                                −{cp.animals_lost}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Last known location */}
                    {lastCp?.location_name && (
                      <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        📍 {lastCp.location_name} · {new Date(lastCp.timestamp).toLocaleDateString(lang === "en" ? "en-GB" : "pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Live Tracking ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>
            {t.tracking.title}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "stretch" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", minHeight: 300 }}>
              <ExportMapGL />
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 28 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
                  Route
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                  {t.tracking.route}
                </div>
              </div>

              {lots[0] && (
                <>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
                      {t.tracking.nextShipment}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff" }}>
                      {fmtDate(lots[0].data_embarque)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
                      {t.tracking.daysTo}
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.05em", color: "#3b82f6", lineHeight: 1 }}>
                      {daysToNext != null ? `T−${daysToNext}` : "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
                      {t.tracking.confirmed}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: "#22c55e" }}>
                      {animalsByLot.get(lots[0].id)?.length ?? 0}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        </div>{/* end paddingTop wrapper */}

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
            {t.footer}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
            {utcTime}
          </span>
        </footer>

      </div>
    </div>
  );
}
