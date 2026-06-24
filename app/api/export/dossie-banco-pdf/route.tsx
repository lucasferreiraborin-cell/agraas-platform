/**
 * PDF Dossiê Banco — gerado sob demanda para análise de crédito rural.
 *
 * Auth: requer banco autenticado + relacionamento active + acesso liberado.
 * Conteúdo: producer_score + breakdown de fazendas + amostra mascarada.
 *
 * Formato pensado pra impressão A4 e leitura por analista de crédito
 * (BB, Bradesco, Sicredi, Pronaf). Sem dados sensíveis brutos.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { renderToStream, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { scoreClassification, maskEarTag } from "@/lib/personas";

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1e2a1b" },
  header: { borderBottomWidth: 1, borderBottomColor: "#1e2a1b", paddingBottom: 12, marginBottom: 20 },
  brand: { fontSize: 9, color: "#788473", textTransform: "uppercase" as const, letterSpacing: 1.5 },
  title: { fontSize: 20, fontWeight: "bold", color: "#1e2a1b", marginTop: 6 },
  subtitle: { fontSize: 10, color: "#788473", marginTop: 4 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "#1e2a1b", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 },
  scoreBlock: { padding: 14, backgroundColor: "#f4f7f2", borderRadius: 8, marginBottom: 14 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" as const },
  scoreLabel: { fontSize: 9, color: "#788473", textTransform: "uppercase" as const },
  scoreValue: { fontSize: 36, fontWeight: "bold" },
  scoreClass: { fontSize: 11, fontWeight: "bold" },
  scoreDesc: { fontSize: 9, color: "#5b6957", marginTop: 4, maxWidth: 250 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.3, borderBottomColor: "#e5e7eb" },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpi: { flex: 1, padding: 10, backgroundColor: "#fafbf8", borderRadius: 6, borderWidth: 0.5, borderColor: "#e5e7eb" },
  kpiLabel: { fontSize: 7, color: "#788473", textTransform: "uppercase" as const },
  kpiValue: { fontSize: 14, fontWeight: "bold", color: "#1e2a1b", marginTop: 2 },
  table: { marginTop: 6 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e2a1b", paddingBottom: 5, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.3, borderBottomColor: "#e5e7eb", paddingVertical: 5 },
  th: { fontSize: 8, fontWeight: "bold", color: "#788473", textTransform: "uppercase" as const },
  td: { fontSize: 9 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: "#788473", textAlign: "center", borderTopWidth: 0.3, borderTopColor: "#e5e7eb", paddingTop: 6 },
});

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  if (!clientId) return new Response("clientId obrigatório", { status: 400 });

  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const { data: bank } = await auth.from("clients").select("id, name, role").eq("auth_user_id", user.id).single();
  if (!bank || !["bank", "admin"].includes(bank.role)) return new Response("Forbidden", { status: 403 });

  const db = createSupabaseServiceClient();

  const { data: rel } = await db
    .from("bank_producer_relationships")
    .select("status, granted_by_producer, granted_at")
    .eq("bank_client_id", bank.id)
    .eq("producer_client_id", clientId)
    .single();
  if (!rel || rel.status !== "active" || !rel.granted_by_producer) {
    return new Response("Sem acesso ao dossiê", { status: 403 });
  }

  const [
    { data: producer },
    { data: ps },
    { data: farms },
    { data: properties },
    { count: animaisCount },
  ] = await Promise.all([
    db.from("clients").select("id, name").eq("id", clientId).single(),
    db.from("producer_scores").select("*").eq("client_id", clientId).single(),
    db.from("farm_scores").select("*").eq("client_id", clientId),
    db.from("properties").select("id, name, city, state, area_ha").eq("client_id", clientId),
    db.from("animals").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "Ativo"),
  ]);

  if (!producer) return new Response("Produtor não encontrado", { status: 404 });

  // SEGURANCA (132/security-rls C9): primeiro pegar IDs do producer,
  // depois ranking restrito a esse subset (era top-10 GLOBAL antes).
  const { data: producerAnimals } = await db
    .from("animals")
    .select("id, internal_code, breed, sex, birth_date")
    .eq("client_id", clientId);
  const producerIds = (producerAnimals ?? []).map((a) => a.id);

  const { data: topScores } = producerIds.length
    ? await db
        .from("animal_scores")
        .select("animal_id, total_score")
        .eq("algorithm_version", "v3")
        .in("animal_id", producerIds)
        .order("total_score", { ascending: false })
        .limit(10)
    : { data: [] as Array<{ animal_id: string; total_score: number }> };
  const sampleIds = (topScores ?? []).map((t) => t.animal_id);
  const sampleAnimals = (producerAnimals ?? []).filter((a) => sampleIds.includes(a.id));
  const sampleMap = new Map((sampleAnimals ?? []).map((a) => [a.id, a]));
  const propsMap = new Map((properties ?? []).map((p) => [p.id, p]));

  const scoreTotal = Number(ps?.score_total ?? 0);
  const cls = scoreClassification(scoreTotal);
  const today = new Date().toLocaleDateString("pt-BR");

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>Agraas · Dossiê de Análise de Crédito Rural</Text>
          <Text style={s.title}>{producer.name}</Text>
          <Text style={s.subtitle}>
            Instituição: {bank.name} · Emitido em {today}
          </Text>
        </View>

        <View style={s.scoreBlock}>
          <View style={s.scoreRow}>
            <View>
              <Text style={s.scoreLabel}>Producer Score · Embrapa Doc 237 (Costa et al., 2018)</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end" as const, gap: 8, marginTop: 6 }}>
                <Text style={[s.scoreValue, { color: cls.color }]}>{scoreTotal.toFixed(0)}</Text>
                <Text style={[s.scoreClass, { color: cls.color, marginBottom: 4 }]}>· {cls.label}</Text>
              </View>
              <Text style={s.scoreDesc}>{cls.description}</Text>
            </View>
            <View style={{ width: 200 }}>
              <Text style={[s.kpiLabel, { marginBottom: 6 }]}>Composição</Text>
              <Row label="Ativos" value={Number(ps?.score_ativos ?? 0)} />
              <Row label="Relacionamento" value={Number(ps?.score_relacionamento ?? 0)} placeholder={!ps?.score_relacionamento} />
              <Row label="Financeiro" value={Number(ps?.score_financeiro ?? 0)} placeholder={!ps?.score_financeiro} />
              <Row label="Institucional" value={Number(ps?.score_institucional ?? 0)} placeholder={!ps?.score_institucional} />
            </View>
          </View>
        </View>

        <View style={s.kpiRow}>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Fazendas ativas</Text>
            <Text style={s.kpiValue}>{farms?.length ?? 0}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Animais ativos</Text>
            <Text style={s.kpiValue}>{(animaisCount ?? 0).toLocaleString("pt-BR")}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Algoritmo</Text>
            <Text style={[s.kpiValue, { fontSize: 11 }]}>Score Engine v3</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Fazendas no portfólio</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>Fazenda</Text>
              <Text style={[s.th, { flex: 2 }]}>Localização</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" as const }]}>Área (ha)</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" as const }]}>Animais</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" as const }]}>Score</Text>
            </View>
            {(farms ?? []).map((f) => {
              const p = propsMap.get(f.property_id);
              const fcls = scoreClassification(Number(f.score_total));
              return (
                <View key={f.id} style={s.tableRow}>
                  <Text style={[s.td, { flex: 2 }]}>{p?.name ?? "—"}</Text>
                  <Text style={[s.td, { flex: 2 }]}>{p?.city ? `${p.city}/${p.state}` : "—"}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "right" as const }]}>{p?.area_ha?.toLocaleString("pt-BR") ?? "—"}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "right" as const }]}>{f.animals_count_active ?? 0}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "right" as const, color: fcls.color, fontWeight: "bold" }]}>
                    {Number(f.score_total).toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Amostra de animais · top 10 por score (mascarado)</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 1.5 }]}>ID</Text>
              <Text style={[s.th, { flex: 1.5 }]}>Raça</Text>
              <Text style={[s.th, { flex: 0.7 }]}>Sexo</Text>
              <Text style={[s.th, { flex: 1.3 }]}>Nascimento</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" as const }]}>Score</Text>
            </View>
            {(topScores ?? []).map((sc) => {
              const a = sampleMap.get(sc.animal_id);
              if (!a) return null;
              return (
                <View key={sc.animal_id} style={s.tableRow}>
                  <Text style={[s.td, { flex: 1.5, fontFamily: "Courier" }]}>{maskEarTag(a.internal_code ?? "")}</Text>
                  <Text style={[s.td, { flex: 1.5 }]}>{a.breed ?? "—"}</Text>
                  <Text style={[s.td, { flex: 0.7 }]}>{a.sex ?? "—"}</Text>
                  <Text style={[s.td, { flex: 1.3 }]}>{a.birth_date ? new Date(a.birth_date).toLocaleDateString("pt-BR") : "—"}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "right" as const, fontWeight: "bold" }]}>{Number(sc.total_score).toFixed(0)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={s.footer}>
          Dossiê emitido pela Agraas Plataforma · Acesso liberado pelo produtor sob LGPD Art. 7º, V ·
          Identificadores individuais mascarados · Material confidencial — não distribuir
        </Text>
      </Page>
    </Document>
  );

  const stream = await renderToStream(doc);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="dossie_${producer.name.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf"`,
    },
  });
}

function Row({ label, value, placeholder = false }: { label: string; value: number; placeholder?: boolean }) {
  return (
    <View style={s.breakdownRow}>
      <Text style={{ fontSize: 8, color: "#5b6957" }}>{label}</Text>
      <Text style={{ fontSize: 8, fontWeight: "bold", color: placeholder ? "#a3aa9c" : "#1e2a1b" }}>
        {placeholder ? "—" : value.toFixed(0)}
      </Text>
    </View>
  );
}
