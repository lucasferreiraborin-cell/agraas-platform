export const runtime = "nodejs";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import React from "react";
import {
  renderToBuffer,
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  dark:     "#0f0f1a",
  navy:     "#1a1a2e",
  green:    "#5d9c44",
  greenLight:"#8dbc5f",
  amber:    "#d97706",
  red:      "#dc2626",
  muted:    "#9ca3af",
  border:   "#e5e7eb",
  bg:       "#f7f8fa",
  white:    "#ffffff",
  textPrimary:   "#1a1a2e",
  textSecondary: "#374151",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.textPrimary,
    backgroundColor: C.white,
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 40,
  },
  // Cover
  coverBand: {
    backgroundColor: C.navy,
    marginHorizontal: -40,
    marginTop: -40,
    paddingHorizontal: 40,
    paddingTop: 44,
    paddingBottom: 32,
    marginBottom: 28,
  },
  coverBrandRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  coverDot: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: C.green,
    alignItems: "center", justifyContent: "center",
    marginRight: 8,
  },
  coverBrandText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 1 },
  coverDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginBottom: 18 },
  coverTitle: {
    fontSize: 22, fontFamily: "Helvetica-Bold",
    color: C.white, letterSpacing: 0.5, marginBottom: 6,
  },
  coverSubtitle: { fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 20 },
  coverMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  coverMetaPill: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    fontSize: 8, color: "rgba(255,255,255,0.65)",
  },
  // Section header
  sectionHeader: {
    fontSize: 7, fontFamily: "Helvetica-Bold",
    color: C.muted, letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 8, marginTop: 20,
  },
  // Executive summary grid
  summaryGrid: { flexDirection: "row", gap: 8, marginBottom: 4 },
  summaryCard: {
    flex: 1, borderWidth: 1, borderColor: C.border,
    borderRadius: 6, padding: 10, alignItems: "center",
  },
  summaryValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.textPrimary },
  summaryLabel: { fontSize: 7, color: C.muted, marginTop: 2, textAlign: "center" },
  summaryCardGreen: { borderColor: "#86efac", backgroundColor: "#f0fdf4" },
  summaryValueGreen: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.green },
  // Info rows
  infoRow: { flexDirection: "row", marginBottom: 4, gap: 6 },
  infoLabel: { fontSize: 8, color: C.muted, width: 100 },
  infoValue: { fontSize: 8, color: C.textSecondary, flex: 1 },
  // Cert pills
  certRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 12 },
  certPill: {
    borderWidth: 1, borderColor: C.border, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
    fontSize: 7, color: C.textSecondary,
  },
  certPillHalal: { borderColor: "#86efac", backgroundColor: "#f0fdf4", color: C.green },
  // Compliance bar
  barTrack: { height: 6, backgroundColor: "#f3f4f6", borderRadius: 3, marginBottom: 4 },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.green },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: C.bg, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 5 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#f3f4f6", paddingVertical: 4 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#f3f4f6", paddingVertical: 4, backgroundColor: C.bg },
  thText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase" },
  tdText: { fontSize: 8, color: C.textSecondary },
  tdMono: { fontSize: 7, fontFamily: "Helvetica", color: C.textPrimary },
  // Column widths (table)
  colId:   { width: 72 },
  colBreed:{ flex: 1 },
  colScore:{ width: 36, alignItems: "center" },
  colCert: { width: 28, alignItems: "center" },
  colWith: { width: 52, alignItems: "center" },
  // Score badges
  scoreBadgeGreen: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.green },
  scoreBadgeAmber: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.amber },
  scoreBadgeRed:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.red },
  scoreBadgeNone:  { fontSize: 8, color: C.muted },
  // Tracking
  trackRow: { flexDirection: "row", marginBottom: 10, gap: 10 },
  trackDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, marginTop: 2 },
  trackDotFuture: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border, marginTop: 2 },
  trackLine: { position: "absolute", left: 3, top: 10, bottom: -10, width: 1.5, backgroundColor: C.border },
  trackContent: { flex: 1 },
  trackStage: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.textPrimary },
  trackMeta: { fontSize: 7.5, color: C.muted, marginTop: 1 },
  trackLoss: { fontSize: 7.5, color: C.red, marginTop: 1 },
  // Footer
  footer: {
    position: "absolute", bottom: 24,
    left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderColor: C.border, paddingTop: 8,
  },
  footerText: { fontSize: 7, color: C.muted },
  footerPage: { fontSize: 7, color: C.muted },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateEN(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtUtcNow(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function scoreColor(s: number | null) {
  if (s === null) return S.scoreBadgeNone;
  if (s >= 75) return S.scoreBadgeGreen;
  if (s >= 50) return S.scoreBadgeAmber;
  return S.scoreBadgeRed;
}

const CHECK = "✓";
const CROSS  = "✗";

const STAGE_LABEL: Record<string, string> = {
  farm: "Farm", armazem: "Warehouse", transportadora: "Transport",
  porto_origem: "Origin Port", navio: "Vessel", porto_destino: "Destination Port", entregue: "Delivered",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type LotRow = {
  id: string; name: string; numero_contrato: string | null;
  pais_destino: string | null; porto_embarque: string | null; data_embarque: string | null;
  certificacoes_exigidas: string[] | null; objective: string | null;
};
type AnimalRow = { id: string; agraas_id: string | null; internal_code: string | null; breed: string | null };
type CertRow   = { animal_id: string; certification_name: string; status: string; expires_at: string | null };
type ScoreRow  = { animal_id: string; score_json: Record<string, unknown> | null };
type AppRow    = { animal_id: string; withdrawal_date: string | null; product_name: string | null };
type TrackRow  = {
  stage: string; timestamp: string;
  animals_confirmed: number | null; animals_lost: number;
  loss_cause: string | null; location_name: string | null;
  responsible_name: string | null; notes: string | null;
};

// ── PDF Document ──────────────────────────────────────────────────────────────

function LotPDF({
  lot, animals, certsByAnimal, scoreByAnimal, withdrawalByAnimal,
  tracking, totalEligible, compliancePct, generatedAt,
}: {
  lot: LotRow;
  animals: AnimalRow[];
  certsByAnimal: Map<string, string[]>;
  scoreByAnimal: Map<string, number>;
  withdrawalByAnimal: Map<string, string>;
  tracking: TrackRow[];
  totalEligible: number;
  compliancePct: number;
  generatedAt: string;
}) {
  const certRequired = lot.certificacoes_exigidas ?? [];
  const SCORE_MIN = 60;

  // Footer component
  const Footer = ({ pageNum }: { pageNum: number }) => (
    React.createElement(View, { style: S.footer, fixed: true },
      React.createElement(Text, { style: S.footerText },
        "Generated by Agraas Intelligence Layer · Certified data · " + generatedAt
      ),
      React.createElement(Text, { style: S.footerPage }, "Page " + pageNum)
    )
  );

  return (
    <Document title={"Export Lot Certificate — " + (lot.numero_contrato ?? lot.name)}>
      <Page size="A4" style={S.page}>

        {/* ── Cover band ── */}
        <View style={S.coverBand}>
          <View style={S.coverBrandRow}>
            <View style={S.coverDot}><Text style={{ color: C.white, fontSize: 11, fontFamily: "Helvetica-Bold" }}>A</Text></View>
            <Text style={S.coverBrandText}>AGRAAS INTELLIGENCE LAYER</Text>
          </View>
          <View style={S.coverDivider} />
          <Text style={S.coverTitle}>EXPORT LOT CERTIFICATE</Text>
          <Text style={S.coverSubtitle}>{lot.name}</Text>
          <View style={S.coverMetaRow}>
            {lot.numero_contrato && (
              <Text style={S.coverMetaPill}>Contract: {lot.numero_contrato}</Text>
            )}
            {lot.pais_destino && (
              <Text style={S.coverMetaPill}>Destination: {lot.pais_destino}</Text>
            )}
            {lot.porto_embarque && (
              <Text style={S.coverMetaPill}>Port: {lot.porto_embarque}</Text>
            )}
            {lot.data_embarque && (
              <Text style={S.coverMetaPill}>Departure: {fmtDateEN(lot.data_embarque)}</Text>
            )}
            <Text style={S.coverMetaPill}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* ── Executive Summary ── */}
        <Text style={S.sectionHeader}>Executive Summary</Text>
        <View style={S.summaryGrid}>
          <View style={S.summaryCard}>
            <Text style={S.summaryValue}>{animals.length}</Text>
            <Text style={S.summaryLabel}>Total Animals</Text>
          </View>
          <View style={[S.summaryCard, S.summaryCardGreen]}>
            <Text style={S.summaryValueGreen}>{totalEligible}</Text>
            <Text style={S.summaryLabel}>Eligible</Text>
          </View>
          <View style={S.summaryCard}>
            <Text style={[S.summaryValue, { color: compliancePct >= 80 ? C.green : compliancePct >= 50 ? C.amber : C.red }]}>
              {compliancePct}%
            </Text>
            <Text style={S.summaryLabel}>Compliance</Text>
          </View>
        </View>

        {/* Compliance bar */}
        <View style={S.barTrack}>
          <View style={[S.barFill, {
            width: compliancePct + "%",
            backgroundColor: compliancePct >= 80 ? C.green : compliancePct >= 50 ? C.amber : C.red,
          }]} />
        </View>
        <Text style={{ fontSize: 7, color: C.muted, marginBottom: 10 }}>
          {totalEligible} of {animals.length} animals meet all export requirements (score ≥ {SCORE_MIN}, no withdrawal, certs complete)
        </Text>

        {/* Info rows */}
        {lot.data_embarque && (
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>Departure Date</Text>
            <Text style={S.infoValue}>{fmtDateEN(lot.data_embarque)}</Text>
          </View>
        )}
        {lot.porto_embarque && (
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>Origin Port</Text>
            <Text style={S.infoValue}>{lot.porto_embarque}</Text>
          </View>
        )}
        {lot.pais_destino && (
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>Destination Country</Text>
            <Text style={S.infoValue}>{lot.pais_destino}</Text>
          </View>
        )}
        {certRequired.length > 0 && (
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>Required Certifications</Text>
            <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {certRequired.map(c => (
                <Text key={c} style={[S.certPill, c === "Halal" ? S.certPillHalal : {}]}>{c}</Text>
              ))}
            </View>
          </View>
        )}

        {/* ── Animal Table ── */}
        <Text style={[S.sectionHeader, { marginTop: 20 }]}>Animal Compliance Table</Text>

        {/* Table header */}
        <View style={S.tableHeader}>
          <View style={S.colId}><Text style={S.thText}>Agraas ID</Text></View>
          <View style={S.colBreed}><Text style={S.thText}>Breed</Text></View>
          <View style={S.colScore}><Text style={S.thText}>Score</Text></View>
          <View style={S.colCert}><Text style={S.thText}>Halal</Text></View>
          <View style={S.colCert}><Text style={S.thText}>MAPA</Text></View>
          <View style={S.colCert}><Text style={S.thText}>GTA</Text></View>
          <View style={S.colCert}><Text style={S.thText}>SIF</Text></View>
          <View style={S.colWith}><Text style={S.thText}>Withdrawal</Text></View>
        </View>

        {animals.map((animal, idx) => {
          const certs   = certsByAnimal.get(animal.id) ?? [];
          const score   = scoreByAnimal.get(animal.id) ?? null;
          const withStr = withdrawalByAnimal.get(animal.id) ?? null;
          const hasHalal = certs.some(c => c.toLowerCase().includes("halal"));
          const hasMapa  = certs.some(c => c.toLowerCase().includes("mapa"));
          const hasGta   = certs.some(c => c.toLowerCase().includes("gta"));
          const hasSif   = certs.some(c => c.toLowerCase().includes("sif"));
          const rowStyle = idx % 2 === 0 ? S.tableRow : S.tableRowAlt;

          return (
            <View key={animal.id} style={rowStyle} wrap={false}>
              <View style={S.colId}>
                <Text style={S.tdMono}>{animal.agraas_id ?? animal.internal_code ?? "—"}</Text>
              </View>
              <View style={S.colBreed}>
                <Text style={S.tdText}>{animal.breed ?? "—"}</Text>
              </View>
              <View style={S.colScore}>
                <Text style={scoreColor(score)}>{score ?? "—"}</Text>
              </View>
              <View style={S.colCert}>
                <Text style={{ fontSize: 8, color: hasHalal ? C.green : C.muted }}>{hasHalal ? CHECK : CROSS}</Text>
              </View>
              <View style={S.colCert}>
                <Text style={{ fontSize: 8, color: hasMapa ? C.green : C.muted }}>{hasMapa ? CHECK : CROSS}</Text>
              </View>
              <View style={S.colCert}>
                <Text style={{ fontSize: 8, color: hasGta ? C.green : C.muted }}>{hasGta ? CHECK : CROSS}</Text>
              </View>
              <View style={S.colCert}>
                <Text style={{ fontSize: 8, color: hasSif ? C.green : C.muted }}>{hasSif ? CHECK : CROSS}</Text>
              </View>
              <View style={S.colWith}>
                {withStr
                  ? <Text style={{ fontSize: 7, color: C.red }}>{withStr}</Text>
                  : <Text style={{ fontSize: 8, color: C.muted }}>—</Text>
                }
              </View>
            </View>
          );
        })}

        {/* ── Tracking ── */}
        {tracking.length > 0 && (
          <>
            <Text style={[S.sectionHeader, { marginTop: 24 }]}>Shipment Tracking Timeline</Text>
            {tracking.map((cp, i) => (
              <View key={i} style={S.trackRow} wrap={false}>
                <View>
                  <View style={i < tracking.length - 1 ? S.trackDot : S.trackDot} />
                </View>
                <View style={S.trackContent}>
                  <Text style={S.trackStage}>
                    {STAGE_LABEL[cp.stage] ?? cp.stage}
                    {cp.location_name ? "  ·  " + cp.location_name : ""}
                  </Text>
                  <Text style={S.trackMeta}>
                    {fmtDateEN(cp.timestamp.slice(0, 10))}
                    {cp.animals_confirmed != null ? "  ·  " + cp.animals_confirmed + " animals confirmed" : ""}
                    {cp.responsible_name ? "  ·  " + cp.responsible_name : ""}
                  </Text>
                  {cp.animals_lost > 0 && (
                    <Text style={S.trackLoss}>
                      {cp.animals_lost} loss{cp.animals_lost > 1 ? "es" : ""}
                      {cp.loss_cause ? " (" + cp.loss_cause + ")" : ""}
                    </Text>
                  )}
                  {cp.notes && (
                    <Text style={[S.trackMeta, { marginTop: 1 }]}>{cp.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            Generated by Agraas Intelligence Layer · Certified data · {generatedAt}
          </Text>
          <Text style={S.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lotId } = await req.json() as { lotId: string };
    if (!lotId) return Response.json({ error: "lotId required" }, { status: 400 });

    // ── Busca lote ──
    const { data: lotData } = await supabase
      .from("lots")
      .select("id, name, numero_contrato, pais_destino, porto_embarque, data_embarque, certificacoes_exigidas, objective")
      .eq("id", lotId)
      .single();

    if (!lotData) return Response.json({ error: "Lot not found" }, { status: 404 });
    const lot = lotData as LotRow;

    // ── Busca animais do lote ──
    const { data: assignments } = await supabase
      .from("animal_lot_assignments")
      .select("animal_id")
      .eq("lot_id", lotId)
      .is("exit_date", null);

    const animalIds = (assignments ?? []).map((a: { animal_id: string }) => a.animal_id);

    if (animalIds.length === 0) {
      // Gera PDF vazio com aviso
      const emptyPdf = await renderToBuffer(
        <Document title="Export Lot Certificate">
          <Page size="A4" style={S.page}>
            <View style={S.coverBand}>
              <Text style={S.coverTitle}>EXPORT LOT CERTIFICATE</Text>
              <Text style={S.coverSubtitle}>{lot.name} — No animals in lot</Text>
            </View>
          </Page>
        </Document>
      );
      return new Response(emptyPdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="lot-certificate-empty.pdf"`,
        },
      });
    }

    // ── Busca todos os dados em paralelo ──
    const [
      { data: animalsData },
      { data: certData },
      { data: cacheData },
      { data: appData },
      { data: trackData },
    ] = await Promise.all([
      supabase.from("animals")
        .select("id, agraas_id, internal_code, breed")
        .in("id", animalIds),
      supabase.from("animal_certifications")
        .select("animal_id, certification_name, status, expires_at")
        .in("animal_id", animalIds)
        .eq("status", "active"),
      supabase.from("agraas_master_passport_cache")
        .select("animal_id, score_json")
        .in("animal_id", animalIds),
      supabase.from("applications")
        .select("animal_id, withdrawal_date, product_name")
        .in("animal_id", animalIds),
      supabase.from("shipment_tracking")
        .select("stage, timestamp, animals_confirmed, animals_lost, loss_cause, location_name, responsible_name, notes")
        .eq("lot_id", lotId)
        .order("timestamp", { ascending: true }),
    ]);

    const animals = (animalsData ?? []) as AnimalRow[];
    const today = new Date();
    const SCORE_MIN = 60;

    // ── Mapa de certifications por animal ──
    const certsByAnimal = new Map<string, string[]>();
    for (const c of (certData ?? []) as CertRow[]) {
      if (!c.expires_at || new Date(c.expires_at) > today) {
        const list = certsByAnimal.get(c.animal_id) ?? [];
        list.push(c.certification_name);
        certsByAnimal.set(c.animal_id, list);
      }
    }

    // ── Mapa de scores por animal ──
    const scoreByAnimal = new Map<string, number>();
    for (const p of (cacheData ?? []) as ScoreRow[]) {
      const s = (p.score_json as { total_score?: number })?.total_score;
      if (s != null) scoreByAnimal.set(p.animal_id, Number(s));
    }

    // ── Mapa de carência ativa por animal ──
    const withdrawalByAnimal = new Map<string, string>();
    for (const a of (appData ?? []) as AppRow[]) {
      if (a.withdrawal_date && new Date(a.withdrawal_date) > today) {
        withdrawalByAnimal.set(a.animal_id, a.product_name ?? "active");
      }
    }

    // ── Stats de compliance ──
    const certRequired = lot.certificacoes_exigidas ?? [];
    let totalEligible = 0;
    for (const animal of animals) {
      const score   = scoreByAnimal.get(animal.id) ?? 0;
      const certs   = certsByAnimal.get(animal.id) ?? [];
      const inCarencia = withdrawalByAnimal.has(animal.id);
      const certsFaltando = certRequired.filter(c => !certs.includes(c));
      if (score >= SCORE_MIN && !inCarencia && certsFaltando.length === 0) totalEligible++;
    }
    const compliancePct = animals.length > 0
      ? Math.round((totalEligible / animals.length) * 100)
      : 0;

    const generatedAt = fmtUtcNow();
    const safeName = (lot.numero_contrato ?? lot.name).replace(/[^a-zA-Z0-9-]/g, "_");

    // ── Renderiza PDF ──
    const pdfBuffer = await renderToBuffer(
      <LotPDF
        lot={lot}
        animals={animals}
        certsByAnimal={certsByAnimal}
        scoreByAnimal={scoreByAnimal}
        withdrawalByAnimal={withdrawalByAnimal}
        tracking={(trackData ?? []) as TrackRow[]}
        totalEligible={totalEligible}
        compliancePct={compliancePct}
        generatedAt={generatedAt}
      />
    );

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lot-certificate-${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[lot-pdf]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
