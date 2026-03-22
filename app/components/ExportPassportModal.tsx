"use client";

import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnimalProps = {
  agraas_id: string;
  internal_code: string | null;
  nickname: string | null;
  sex: string | null;
  breed: string | null;
  birth_date: string | null;
  category: string | null;
  rfid: string | null;
  blood_type: string | null;
  birth_weight: number | null;
};

type PropertyProps = {
  id?: string;
  name: string | null;
  city: string | null;
  state: string | null;
} | null;

type CertProps = {
  id?: string;
  certification_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: string | null;
};

type AppProps = {
  product_name: string;
  dose: number | null;
  unit: string | null;
  application_date: string | null;
  withdrawal_date: string | null;
  operator_name: string | null;
};

type ParentProps = {
  nickname: string | null;
  internal_code: string | null;
  agraas_id: string | null;
} | null;

type Props = {
  animal: AnimalProps;
  property: PropertyProps;
  score: number;
  certifications: CertProps[];
  applications: AppProps[];
  latestWeight: number | null;
  latestWeightDate: string | null;
  sire: ParentProps;
  dam: ParentProps;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Lang = "pt" | "en";

function fmtDate(d: string | null, lang: Lang): string {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString(
    lang === "pt" ? "pt-BR" : "en-US",
    { day: "2-digit", month: "short", year: "numeric" }
  );
}

function ageStr(birthDate: string | null, lang: Lang): string {
  if (!birthDate) return "—";
  const months = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  if (months < 24) return lang === "pt" ? `${months} meses` : `${months} months`;
  const years = Math.floor(months / 12);
  return lang === "pt" ? `${years} anos` : `${years} years`;
}

function hasActiveWithdrawal(apps: AppProps[]): boolean {
  return apps.some(
    (a) => a.withdrawal_date && new Date(a.withdrawal_date) > new Date()
  );
}

function getExportStatus(
  score: number,
  certs: CertProps[],
  apps: AppProps[]
): "eligible" | "pending" | "ineligible" {
  if (score < 50) return "ineligible";
  const expiredHalal = certs.some(
    (c) => c.certification_name?.toLowerCase().includes("halal") && c.status === "expired"
  );
  if (expiredHalal || hasActiveWithdrawal(apps)) return "pending";
  if (score >= 75) return "eligible";
  return "pending";
}

const SEX: Record<string, { pt: string; en: string }> = {
  M: { pt: "Macho", en: "Male" },
  F: { pt: "Fêmea", en: "Female" },
};

function parentLabel(p: ParentProps): string {
  if (!p) return "—";
  return p.nickname ?? p.internal_code ?? "—";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, lang }: { status: ReturnType<typeof getExportStatus>; lang: Lang }) {
  const config = {
    eligible:   { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", label: lang === "pt" ? "✓  APTO EXPORTAÇÃO" : "✓  EXPORT ELIGIBLE" },
    pending:    { bg: "bg-amber-50",   border: "border-amber-300",   text: "text-amber-700",   label: lang === "pt" ? "⚠  PENDÊNCIAS"      : "⚠  PENDING REVIEW" },
    ineligible: { bg: "bg-red-50",     border: "border-red-300",     text: "text-red-700",     label: lang === "pt" ? "✕  INAPTO"          : "✕  NOT ELIGIBLE"   },
  }[status];
  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} px-4 py-2.5 text-center`}>
      <span className={`text-sm font-bold tracking-wide ${config.text}`}>{config.label}</span>
    </div>
  );
}

// ─── Score bar ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(4, Math.min(100, score));
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.22em] text-gray-400">
      {children}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
      <span className="text-[10px] text-gray-400 whitespace-nowrap">{label}</span>
      <span className="text-[11px] font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExportPassportModal({
  animal, property, score, certifications, applications, latestWeight, latestWeightDate, sire, dam,
}: Props) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("pt");

  const status = getExportStatus(score, certifications, applications);
  const activeCerts = certifications.filter((c) => c.status === "active");
  const isHalal = activeCerts.some((c) => c.certification_name?.toLowerCase().includes("halal"));
  const hasWithdrawal = hasActiveWithdrawal(applications);

  const generatedAt = new Date();
  const validUntil = new Date(generatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/passaporte/${animal.agraas_id}`
      : `https://agraas-platform.vercel.app/passaporte/${animal.agraas_id}`;

  const scoreColor = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  const t = {
    trigger: lang === "pt" ? "Passaporte de Exportação" : "Export Passport",
    triggerSub: lang === "pt" ? "Documento bilíngue para exportação — formato A4, pronto para imprimir" : "Bilingual export document — A4 format, print-ready",
    headerTitle: lang === "pt" ? "PASSAPORTE DE EXPORTAÇÃO" : "LIVESTOCK EXPORT PASSPORT",
    headerSub: lang === "pt" ? "Passaporte Pecuário Agraas · Documento Oficial de Rastreabilidade" : "Agraas Livestock Passport · Official Traceability Document",
    issued: lang === "pt" ? "Emitido em" : "Issued on",
    validFor: lang === "pt" ? "Válido por 30 dias / Valid for 30 days" : "Valid for 30 days / Válido por 30 dias",
    identity: lang === "pt" ? "Identidade / Identity" : "Identity / Identidade",
    compliance: lang === "pt" ? "Conformidade / Compliance" : "Compliance / Conformidade",
    species: lang === "pt" ? "Espécie" : "Species",
    breed: lang === "pt" ? "Raça" : "Breed",
    sex: lang === "pt" ? "Sexo" : "Sex",
    category: lang === "pt" ? "Categoria" : "Category",
    born: lang === "pt" ? "Nascimento" : "Birth date",
    age: lang === "pt" ? "Idade" : "Age",
    weight: lang === "pt" ? "Peso atual" : "Current weight",
    weightDate: lang === "pt" ? "Data da pesagem" : "Weighing date",
    farm: lang === "pt" ? "Fazenda" : "Farm",
    location: lang === "pt" ? "Município / UF" : "Municipality / State",
    country: lang === "pt" ? "País de origem" : "Country of origin",
    agraasScore: "Agraas Score",
    certs: lang === "pt" ? "Certificações Ativas" : "Active Certifications",
    withdrawal: lang === "pt" ? "Carências Sanitárias" : "Withdrawal Periods",
    noWithdrawal: lang === "pt" ? "Nenhuma carência ativa" : "No active withdrawal periods",
    activeWithdrawal: lang === "pt" ? "Carência ativa — ver histórico" : "Active withdrawal — see history",
    sanitary: lang === "pt" ? "Histórico Sanitário / Sanitary History" : "Sanitary History / Histórico Sanitário",
    product: lang === "pt" ? "Produto / Product" : "Product / Produto",
    dose: lang === "pt" ? "Dose" : "Dose",
    date: lang === "pt" ? "Data / Date" : "Date / Data",
    withdrawal2: lang === "pt" ? "Carência" : "Withdrawal",
    operator: lang === "pt" ? "Operador" : "Operator",
    genealogy: lang === "pt" ? "Genealogia / Genealogy" : "Genealogy / Genealogia",
    sire: lang === "pt" ? "Pai / Sire" : "Sire / Pai",
    dam: lang === "pt" ? "Mãe / Dam" : "Dam / Mãe",
    scan: lang === "pt" ? "Escaneie para verificar" : "Scan to verify",
    verified: "Verified by Agraas — Brazil's Livestock Trust Infrastructure",
    validity: lang === "pt"
      ? `Documento gerado digitalmente em ${generatedAt.toLocaleDateString("pt-BR")} às ${generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Válido até ${validUntil.toLocaleDateString("pt-BR")}.`
      : `Digitally generated on ${generatedAt.toLocaleDateString("en-US")} at ${generatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}. Valid until ${validUntil.toLocaleDateString("en-US")}.`,
  };

  return (
    <>
      {/* ── Print CSS ─────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #export-passport-print { display: block !important; position: static !important; overflow: visible !important; background: white !important; }
          #export-passport-print * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      {/* ── Trigger button ────────────────────────────────────────── */}
      <section className="ag-card p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {lang === "pt" ? "Passaporte de Exportação" : "Export Passport"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t.triggerSub}</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="mt-4 sm:mt-0 flex items-center gap-2.5 rounded-2xl bg-[#3d762c] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#2d5a20] active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            {t.trigger}
          </button>
        </div>
      </section>

      {/* ── Modal overlay ─────────────────────────────────────────── */}
      {open && (
        <div
          id="export-passport-print"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm"
        >
          {/* Control bar */}
          <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3d762c] text-white text-xs font-bold">A</div>
              <span className="text-sm font-semibold text-gray-800">Agraas — {t.trigger}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Lang toggle */}
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {(["pt", "en"] as const).map((lc) => (
                  <button key={lc} onClick={() => setLang(lc)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${lang === lc ? "bg-white shadow text-gray-900" : "text-gray-400"}`}>
                    {lc === "pt" ? "🇧🇷 PT" : "🇬🇧 EN"}
                  </button>
                ))}
              </div>
              {/* Print */}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-[#3d762c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d5a20]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                {lang === "pt" ? "Imprimir" : "Print"}
              </button>
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                {lang === "pt" ? "Fechar" : "Close"}
              </button>
            </div>
          </div>

          {/* Document */}
          <div className="mx-auto my-8 max-w-[820px] bg-white shadow-2xl" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

            {/* ── HEADER ───────────────────────────────────────────── */}
            <div style={{ background: "linear-gradient(135deg,#2d5a20,#3d762c)", padding: "28px 36px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>A</div>
                  <div>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>Agraas Platform</p>
                    <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: "0.04em", margin: "3px 0 0", lineHeight: 1.2 }}>{t.headerTitle}</h1>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, margin: "4px 0 0" }}>{t.headerSub}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 16px", marginBottom: 8 }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>Agraas ID</p>
                    <p style={{ color: "#fff", fontFamily: "monospace", fontSize: 16, fontWeight: 700, margin: "2px 0 0", letterSpacing: "0.1em" }}>{animal.agraas_id}</p>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, margin: 0 }}>{t.issued}: {fmtDate(generatedAt.toISOString(), lang)}</p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, margin: "3px 0 0" }}>{t.validFor}</p>
                  {isHalal && (
                    <div style={{ marginTop: 8, display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                      ☪ Halal Certified
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── BODY: two columns ────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1px solid #e5e7eb" }}>

              {/* Left column — Identity */}
              <div style={{ padding: "28px 28px 24px", borderRight: "1px solid #e5e7eb" }}>
                <SectionLabel>{t.identity}</SectionLabel>

                {/* Animal name hero */}
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.2 }}>
                    {animal.nickname ?? animal.internal_code ?? animal.agraas_id}
                  </h2>
                  {animal.nickname && animal.internal_code && (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "3px 0 0", fontFamily: "monospace" }}>{animal.internal_code}</p>
                  )}
                  {animal.rfid && (
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0", fontFamily: "monospace" }}>RFID: {animal.rfid}</p>
                  )}
                </div>

                <Row label={t.species} value={lang === "pt" ? "Bovino (Bos taurus)" : "Bovine (Bos taurus)"} />
                <Row label={t.breed} value={animal.breed ?? "—"} />
                <Row label={t.sex} value={animal.sex ? (SEX[animal.sex]?.[lang] ?? animal.sex) : "—"} />
                {animal.category && <Row label={t.category} value={animal.category} />}
                <Row label={t.born} value={fmtDate(animal.birth_date, lang)} />
                <Row label={t.age} value={ageStr(animal.birth_date, lang)} />
                {animal.blood_type && <Row label={lang === "pt" ? "Tipo sanguíneo" : "Blood type"} value={animal.blood_type} />}

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                  <Row label={t.weight} value={latestWeight ? `${latestWeight} kg` : "—"} />
                  <Row label={t.weightDate} value={fmtDate(latestWeightDate, lang)} />
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                  <Row label={t.farm} value={property?.name ?? "—"} />
                  {(property?.city || property?.state) && (
                    <Row label={t.location} value={[property.city, property.state].filter(Boolean).join(", ")} />
                  )}
                  <Row label={t.country} value={lang === "pt" ? "Brasil" : "Brazil"} />
                </div>
              </div>

              {/* Right column — Compliance */}
              <div style={{ padding: "28px 28px 24px" }}>
                <SectionLabel>{t.compliance}</SectionLabel>

                {/* Score */}
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>{t.agraasScore}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                    <span style={{ fontSize: 42, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: 16, color: "#9ca3af", fontWeight: 600 }}>/100</span>
                  </div>
                  <ScoreBar score={score} />
                </div>

                {/* Status */}
                <div style={{ marginBottom: 18 }}>
                  <StatusBadge status={status} lang={lang} />
                </div>

                {/* Certifications */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px" }}>{t.certs}</p>
                  {activeCerts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {activeCerts.map((c, i) => {
                        const halal = c.certification_name?.toLowerCase().includes("halal");
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: halal ? "#f0fdf4" : "#f9fafb", border: `1px solid ${halal ? "#bbf7d0" : "#e5e7eb"}`, borderRadius: 8, padding: "6px 10px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: halal ? "#15803d" : "#374151" }}>
                              {halal ? "☪ " : "✓ "}{c.certification_name}
                            </span>
                            {c.expires_at && (
                              <span style={{ fontSize: 10, color: "#6b7280" }}>
                                {lang === "pt" ? "até" : "until"} {fmtDate(c.expires_at, lang)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>—</p>
                  )}
                </div>

                {/* Expired certs */}
                {certifications.filter(c => c.status === "expired").map((c, i) => (
                  <div key={i} style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "6px 10px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#c2410c" }}>⚠ {c.certification_name} ({lang === "pt" ? "vencida" : "expired"})</span>
                    {c.expires_at && <span style={{ fontSize: 10, color: "#c2410c" }}>{fmtDate(c.expires_at, lang)}</span>}
                  </div>
                ))}

                {/* Withdrawal */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px" }}>{t.withdrawal}</p>
                  {hasWithdrawal ? (
                    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", margin: 0 }}>⚠ {t.activeWithdrawal}</p>
                      {applications.filter(a => a.withdrawal_date && new Date(a.withdrawal_date) > new Date()).map((a, i) => (
                        <p key={i} style={{ fontSize: 10, color: "#9a3412", margin: "4px 0 0" }}>
                          {a.product_name} — {lang === "pt" ? "liberação" : "release"}: {fmtDate(a.withdrawal_date, lang)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#15803d", margin: 0 }}>✓ {t.noWithdrawal}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── SANITARY HISTORY ─────────────────────────────────── */}
            {applications.length > 0 && (
              <div style={{ padding: "24px 36px", borderBottom: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 12px" }}>{t.sanitary}</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {[t.product, t.dose, t.date, t.withdrawal2, t.operator].map((h) => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#6b7280", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a, i) => {
                      const active = a.withdrawal_date && new Date(a.withdrawal_date) > new Date();
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: active ? "#fff7ed" : "transparent" }}>
                          <td style={{ padding: "7px 10px", fontWeight: 600, color: "#111827" }}>{a.product_name}</td>
                          <td style={{ padding: "7px 10px", color: "#6b7280" }}>{a.dose ? `${a.dose} ${a.unit ?? ""}`.trim() : "—"}</td>
                          <td style={{ padding: "7px 10px", color: "#6b7280" }}>{fmtDate(a.application_date, lang)}</td>
                          <td style={{ padding: "7px 10px", color: active ? "#c2410c" : "#6b7280", fontWeight: active ? 700 : 400 }}>
                            {a.withdrawal_date ? fmtDate(a.withdrawal_date, lang) : (lang === "pt" ? "N/A" : "N/A")}
                          </td>
                          <td style={{ padding: "7px 10px", color: "#9ca3af", fontSize: 10 }}>
                            {a.operator_name ? a.operator_name.split("–")[0].trim() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── GENEALOGY ────────────────────────────────────────── */}
            <div style={{ padding: "20px 36px", borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 12px" }}>{t.genealogy}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { label: t.sire, parent: sire },
                  { label: t.dam, parent: dam },
                ].map(({ label, parent }) => (
                  <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>{label}</p>
                    {parent ? (
                      <>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "4px 0 2px" }}>{parentLabel(parent)}</p>
                        {parent.internal_code && parent.nickname && (
                          <p style={{ fontSize: 10, color: "#6b7280", margin: 0, fontFamily: "monospace" }}>{parent.internal_code}</p>
                        )}
                        {parent.agraas_id && (
                          <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0", fontFamily: "monospace" }}>{parent.agraas_id}</p>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>{lang === "pt" ? "Não informado" : "Not informed"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── FOOTER ───────────────────────────────────────────── */}
            <div style={{ padding: "20px 36px", display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ flexShrink: 0 }}>
                <QRCodeCanvas
                  value={publicUrl}
                  size={80}
                  level="H"
                  imageSettings={{ src: "/logo-qr.png", height: 16, width: 16, excavate: true }}
                />
                <p style={{ fontSize: 9, color: "#9ca3af", textAlign: "center", margin: "6px 0 0" }}>{t.scan}</p>
              </div>
              <div style={{ flex: 1, borderLeft: "1px solid #e5e7eb", paddingLeft: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#3d762c", margin: "0 0 4px" }}>{t.verified}</p>
                <p style={{ fontSize: 10, color: "#6b7280", margin: "0 0 6px" }}>{t.validity}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, background: "#f0f7ec", color: "#3d762c", fontWeight: 700, borderRadius: 4, padding: "2px 8px" }}>agraas.com.br</span>
                  <span style={{ fontSize: 9, background: "#f0f7ec", color: "#3d762c", fontWeight: 700, borderRadius: 4, padding: "2px 8px" }}>{animal.agraas_id}</span>
                </div>
              </div>
            </div>

          </div>
          {/* bottom spacing */}
          <div className="no-print h-12" />
        </div>
      )}
    </>
  );
}
