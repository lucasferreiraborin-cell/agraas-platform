"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 75) return "#4ade80";
  if (s >= 60) return "#fbbf24";
  return "#f87171";
}

function certBadge(has: boolean) {
  return has
    ? <span style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }} className="rounded-full px-2 py-0.5 text-[11px] font-semibold">✓</span>
    : <span style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }} className="rounded-full px-2 py-0.5 text-[11px] font-semibold">✗</span>;
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
}: {
  buyerName: string;
  lots: Lot[];
  assignments: Assignment[];
  animals: Animal[];
  certifications: Cert[];
  activeWithdrawals: Withdrawal[];
  scores: Score[];
}) {
  const [lang, setLang] = useState<"en" | "pt">("en");
  const t = lang === "en" ? EN : PT;

  // ── Derived data ────────────────────────────────────────────────────────────

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
      list.push(w.product_name ?? "produto");
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

  // ── KPIs ────────────────────────────────────────────────────────────────────

  const totalAnimals = animals.length;
  const halalCertified = animals.filter(a => certsByAnimal.get(a.id)?.has("Halal")).length;
  const exportReady = animals.filter(a => {
    const certs = certsByAnimal.get(a.id) ?? new Set();
    const score = scoreByAnimal.get(a.id) ?? 0;
    const noWithdrawal = !withdrawalsByAnimal.has(a.id);
    const requiredCerts = lots[0]?.certificacoes_exigidas ?? [];
    const certsOk = requiredCerts.every(c => certs.has(c));
    return score >= 60 && noWithdrawal && certsOk;
  }).length;
  const activeShipments = lots.filter(l => l.status !== "closed").length;

  // ── Compliance per animal ────────────────────────────────────────────────────

  const complianceRows = useMemo(() => animals.map(animal => {
    const certs = certsByAnimal.get(animal.id) ?? new Set();
    const score = scoreByAnimal.get(animal.id) ?? 0;
    const withdrawals = withdrawalsByAnimal.get(animal.id) ?? [];
    const requiredCerts = lots[0]?.certificacoes_exigidas ?? [];
    const certsOk = requiredCerts.every(c => certs.has(c));
    const status =
      score < 60 || withdrawals.length > 0 ? "ineligible"
      : !certsOk ? "pending"
      : "eligible";
    return { animal, certs, score, withdrawals, status };
  }), [animals, certsByAnimal, scoreByAnimal, withdrawalsByAnimal, lots]);

  const CERT_LIST = ["Halal", "MAPA", "GTA", "SIF"];

  // ── Styles ──────────────────────────────────────────────────────────────────

  const S = {
    bg:        { background: "#0a0e1a" },
    card:      { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20 },
    cardGold:  { background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", borderRadius: 20 },
    text:      { color: "#f1f5f9" },
    muted:     { color: "rgba(255,255,255,0.45)" },
    gold:      { color: "#c9a227" },
    emerald:   { color: "#4ade80" },
    kpiVal:    { fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", color: "#f1f5f9" },
    kpiLabel:  { fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)" },
    th:        { padding: "10px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.07)" },
    td:        { padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,0.75)", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, overflowY: "auto", ...S.bg }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px 64px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 0 32px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* PIF Logo SVG */}
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#c9a227" strokeWidth="1.5" fill="none"/>
                <path d="M10 20h20M20 10v20" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="20" cy="20" r="4" fill="#c9a227" fillOpacity="0.8"/>
              </svg>
            </div>
            <div>
              <p style={{ ...S.muted, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 4 }}>Public Investment Fund</p>
              <h1 style={{ ...S.text, fontSize: 22, fontWeight: 700, letterSpacing: "-0.04em", margin: 0 }}>
                {t.welcome}, PIF Procurement Team
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Lang toggle */}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 4 }}>
              {(["en", "pt"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: lang === l ? "rgba(201,162,39,0.2)" : "transparent",
                    color: lang === l ? "#c9a227" : "rgba(255,255,255,0.45)",
                    transition: "all 0.15s",
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Logout */}
            <Link href="/login" style={{ padding: "8px 18px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>
              {t.logout}
            </Link>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 36 }}>
          {[
            { label: t.kpi.animals,   value: totalAnimals,    accent: false },
            { label: t.kpi.ready,     value: exportReady,     accent: true  },
            { label: t.kpi.halal,     value: halalCertified,  accent: false },
            { label: t.kpi.shipments, value: activeShipments, accent: false },
          ].map(k => (
            <div key={k.label} style={k.accent ? S.cardGold : S.card} className="p-6">
              <p style={S.kpiLabel}>{k.label}</p>
              <p style={{ ...S.kpiVal, ...(k.accent ? S.gold : {}) }} className="mt-2">{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Available Lots ── */}
        <div style={{ ...S.card, marginTop: 36, padding: "28px 32px" }}>
          <h2 style={{ ...S.text, fontSize: 16, fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 20 }}>
            {t.lots.title}
          </h2>
          {lots.length === 0 ? (
            <p style={S.muted}>{t.empty}</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t.lots.lot, t.lots.origin, t.lots.destination, t.lots.departure, t.lots.conformance, t.lots.eligible, t.lots.action].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => {
                  const lotAnimals = animalsByLot.get(lot.id) ?? [];
                  const aptCount = lotAnimals.filter(aid => {
                    const certs = certsByAnimal.get(aid) ?? new Set();
                    const score = scoreByAnimal.get(aid) ?? 0;
                    const noW = !withdrawalsByAnimal.has(aid);
                    const certsOk = (lot.certificacoes_exigidas ?? []).every(c => certs.has(c));
                    return score >= 60 && noW && certsOk;
                  }).length;
                  const conformPct = lotAnimals.length ? Math.round((aptCount / lotAnimals.length) * 100) : 0;
                  const departure = lot.data_embarque ? new Date(lot.data_embarque).toLocaleDateString("en-GB") : "—";
                  return (
                    <tr key={lot.id}>
                      <td style={S.td}>
                        <p style={{ ...S.text, fontWeight: 600, fontSize: 13 }}>{lot.name}</p>
                        {lot.numero_contrato && <p style={{ ...S.muted, fontSize: 11 }}>#{lot.numero_contrato}</p>}
                      </td>
                      <td style={S.td}>{lot.porto_embarque ?? "Santos, BR"}</td>
                      <td style={S.td}>{lot.pais_destino ?? "—"}</td>
                      <td style={S.td}>{departure}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 56, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${conformPct}%`, background: conformPct >= 80 ? "#4ade80" : conformPct >= 50 ? "#fbbf24" : "#f87171", borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: conformPct >= 80 ? "#4ade80" : conformPct >= 50 ? "#fbbf24" : "#f87171" }}>{conformPct}%</span>
                        </div>
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, ...S.emerald }}>{aptCount} / {lotAnimals.length}</td>
                      <td style={S.td}>
                        <Link href={`/lotes/${lot.id}`}
                          style={{ display: "inline-block", padding: "6px 14px", borderRadius: 8, background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.25)", color: "#c9a227", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                          {t.lots.viewManifest}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Upcoming Shipments ── */}
        <div style={{ ...S.card, marginTop: 24, padding: "28px 32px" }}>
          <h2 style={{ ...S.text, fontSize: 16, fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 20 }}>
            {t.shipments.title}
          </h2>
          {lots.filter(l => l.data_embarque).length === 0 ? (
            <p style={S.muted}>{t.empty}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {lots.filter(l => l.data_embarque).map(lot => (
                <div key={lot.id} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Route line */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", margin: "0 auto" }} />
                      <p style={{ ...S.muted, fontSize: 10, marginTop: 4 }}>Santos</p>
                      <p style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>BR</p>
                    </div>
                    <div style={{ flex: 1, height: 1, borderTop: "2px dashed rgba(201,162,39,0.4)", position: "relative" }}>
                      <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 14 }}>✈</span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c9a227", margin: "0 auto" }} />
                      <p style={{ ...S.muted, fontSize: 10, marginTop: 4 }}>Jeddah</p>
                      <p style={{ color: "#c9a227", fontSize: 11, fontWeight: 600 }}>SA</p>
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ textAlign: "right", minWidth: 160 }}>
                    <p style={{ ...S.text, fontWeight: 700, fontSize: 14 }}>{lot.name}</p>
                    <p style={S.muted}>{t.shipments.departure}: {new Date(lot.data_embarque!).toLocaleDateString(lang === "en" ? "en-GB" : "pt-BR")}</p>
                  </div>
                  {/* Status badge */}
                  <div style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 8, padding: "6px 12px" }}>
                    <p style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {lot.status ?? "Scheduled"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Compliance Dashboard ── */}
        <div style={{ ...S.card, marginTop: 24, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ ...S.text, fontSize: 16, fontWeight: 600, letterSpacing: "-0.03em" }}>
              {t.compliance.title}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: t.compliance.eligible, count: complianceRows.filter(r => r.status === "eligible").length, color: "#4ade80" },
                { label: t.compliance.pending,  count: complianceRows.filter(r => r.status === "pending").length,  color: "#fbbf24" },
                { label: t.compliance.ineligible,count: complianceRows.filter(r => r.status === "ineligible").length,color: "#f87171" },
              ].map(b => (
                <div key={b.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "6px 14px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{b.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {complianceRows.length === 0 ? (
            <p style={S.muted}>{t.empty}</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[t.compliance.animal, ...CERT_LIST, t.compliance.withdrawal, t.compliance.score, t.compliance.status].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complianceRows.map(({ animal, certs, score, withdrawals, status }) => {
                    const statusStyle = {
                      eligible:   { bg: "rgba(74,222,128,0.12)",  color: "#4ade80",  label: t.compliance.eligible },
                      pending:    { bg: "rgba(251,191,36,0.12)",   color: "#fbbf24",  label: t.compliance.pending },
                      ineligible: { bg: "rgba(248,113,113,0.12)", color: "#f87171",  label: t.compliance.ineligible },
                    }[status] ?? { bg: "rgba(156,163,175,0.12)", color: "#9ca3af", label: "N/A" };
                    return (
                      <tr key={animal.id}>
                        <td style={S.td}>
                          <Link href={`/animais/${animal.id}`} style={{ ...S.text, fontWeight: 600, textDecoration: "none" }}>
                            {animal.nickname ?? animal.internal_code ?? animal.id.slice(0, 8)}
                          </Link>
                          {animal.breed && <p style={{ ...S.muted, fontSize: 11 }}>{animal.breed}</p>}
                        </td>
                        {CERT_LIST.map(c => (
                          <td key={c} style={{ ...S.td, textAlign: "center" }}>{certBadge(certs.has(c))}</td>
                        ))}
                        <td style={{ ...S.td, textAlign: "center" }}>
                          {withdrawals.length === 0
                            ? <span style={{ color: "#4ade80", fontSize: 13 }}>✓</span>
                            : <span style={{ color: "#f87171", fontSize: 11 }}>{withdrawals.join(", ")}</span>
                          }
                        </td>
                        <td style={{ ...S.td, textAlign: "center" }}>
                          <span style={{ fontWeight: 700, color: scoreColor(score), fontSize: 14 }}>{score}</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            {statusStyle.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ ...S.muted, fontSize: 12 }}>Powered by <span style={S.gold}>Agraas Intelligence Layer</span></p>
          <p style={{ ...S.muted, fontSize: 12 }}>{new Date().toLocaleDateString(lang === "en" ? "en-GB" : "pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>

      </div>
    </div>
  );
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const EN = {
  welcome: "Welcome",
  logout: "Sign out",
  empty: "No data available yet",
  kpi: { animals: "Animals Tracked", ready: "Export-Ready", halal: "Halal Certified", shipments: "Active Shipments" },
  lots: { title: "Available Lots", lot: "Lot", origin: "Origin", destination: "Destination", departure: "Departure", conformance: "Conformance", eligible: "Eligible", action: "Action", viewManifest: "View Manifest" },
  shipments: { title: "Upcoming Shipments", departure: "Departure" },
  compliance: { title: "Compliance Dashboard", animal: "Animal", withdrawal: "Withdrawal Clear", score: "Score", status: "Status", eligible: "Eligible", pending: "Pending", ineligible: "Ineligible" },
};

const PT = {
  welcome: "Bem-vindo",
  logout: "Sair",
  empty: "Nenhum dado disponível",
  kpi: { animals: "Animais monitorados", ready: "Aptos exportação", halal: "Certificados Halal", shipments: "Embarques ativos" },
  lots: { title: "Lotes disponíveis", lot: "Lote", origin: "Origem", destination: "Destino", departure: "Embarque", conformance: "Conformidade", eligible: "Aptos", action: "Ação", viewManifest: "Ver Manifesto" },
  shipments: { title: "Próximos embarques", departure: "Embarque" },
  compliance: { title: "Dashboard de conformidade", animal: "Animal", withdrawal: "Carência zerada", score: "Score", status: "Status", eligible: "Apto", pending: "Pendente", ineligible: "Inapto" },
};
