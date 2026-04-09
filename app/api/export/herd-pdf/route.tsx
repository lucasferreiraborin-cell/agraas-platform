import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { renderToStream, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1e2a1b" },
  subtitle: { fontSize: 11, color: "#788473", marginTop: 4 },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  kpi: { flex: 1, padding: 10, backgroundColor: "#f4f7f2", borderRadius: 8 },
  kpiLabel: { fontSize: 8, color: "#788473", textTransform: "uppercase" as const },
  kpiValue: { fontSize: 16, fontWeight: "bold", color: "#1e2a1b", marginTop: 2 },
  table: { marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 6 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e2a1b", paddingBottom: 6, marginBottom: 4 },
  cell: { flex: 1, fontSize: 9 },
  cellBold: { flex: 1, fontSize: 9, fontWeight: "bold" },
  th: { flex: 1, fontSize: 8, fontWeight: "bold", color: "#788473", textTransform: "uppercase" as const },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 7, color: "#788473", textAlign: "center" },
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const { data: clientData } = await supabase.from("clients").select("id, name").eq("auth_user_id", user.id).single();
  if (!clientData) return new Response("Cliente não encontrado", { status: 404 });

  const [{ data: animalsData }, { data: weightsData }, { data: scoresData }, { data: appsData }] = await Promise.all([
    supabase.from("animals").select("id, internal_code, nickname, breed, sex, birth_date, status").order("internal_code"),
    supabase.from("weights").select("animal_id, weight, weighing_date").order("weighing_date", { ascending: false }),
    supabase.from("animal_scores").select("animal_id, total_score"),
    supabase.from("applications").select("animal_id, product_name, application_date").order("application_date", { ascending: false }),
  ]);

  const animals = animalsData ?? [];
  const scoreMap = new Map((scoresData ?? []).map((s: any) => [s.animal_id, s.total_score]));
  const weightMap = new Map<string, { weight: number; date: string }>();
  const gmdMap = new Map<string, number>();

  for (const w of (weightsData ?? []) as any[]) {
    if (!weightMap.has(w.animal_id)) {
      weightMap.set(w.animal_id, { weight: w.weight, date: w.weighing_date });
    } else if (!gmdMap.has(w.animal_id)) {
      const last = weightMap.get(w.animal_id)!;
      const days = (new Date(last.date).getTime() - new Date(w.weighing_date).getTime()) / 86400000;
      if (days > 0) gmdMap.set(w.animal_id, Math.round(((last.weight - w.weight) / days) * 1000));
    }
  }

  const lastAppMap = new Map<string, string>();
  for (const a of (appsData ?? []) as any[]) {
    if (!lastAppMap.has(a.animal_id)) lastAppMap.set(a.animal_id, `${a.product_name} (${a.application_date})`);
  }

  const avgScore = animals.length > 0
    ? Math.round(animals.reduce((s: number, a: any) => s + (scoreMap.get(a.id) ?? 0), 0) / animals.length)
    : 0;
  const totalArrobas = animals.reduce((s: number, a: any) => s + ((weightMap.get(a.id)?.weight ?? 0) / 30), 0);
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const stream = await renderToStream(
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Relatório do Rebanho — {clientData.name}</Text>
          <Text style={s.subtitle}>Gerado em {today} · Agraas Intelligence Layer</Text>
        </View>

        <View style={s.kpiRow}>
          <View style={s.kpi}><Text style={s.kpiLabel}>Animais</Text><Text style={s.kpiValue}>{animals.length}</Text></View>
          <View style={s.kpi}><Text style={s.kpiLabel}>Score Médio</Text><Text style={s.kpiValue}>{avgScore}</Text></View>
          <View style={s.kpi}><Text style={s.kpiLabel}>Arrobas</Text><Text style={s.kpiValue}>{Math.round(totalArrobas)} @</Text></View>
        </View>

        <View style={s.table}>
          <View style={s.headerRow}>
            <Text style={s.th}>Animal</Text>
            <Text style={s.th}>Raça</Text>
            <Text style={s.th}>Sexo</Text>
            <Text style={s.th}>Peso</Text>
            <Text style={s.th}>Score</Text>
            <Text style={s.th}>GMD</Text>
            <Text style={s.th}>Última Aplicação</Text>
          </View>
          {animals.map((a: any) => (
            <View key={a.id} style={s.row}>
              <Text style={s.cellBold}>{a.internal_code ?? a.id.slice(0, 8)}</Text>
              <Text style={s.cell}>{a.breed ?? "—"}</Text>
              <Text style={s.cell}>{a.sex === "Male" ? "M" : a.sex === "Female" ? "F" : "—"}</Text>
              <Text style={s.cell}>{weightMap.get(a.id)?.weight ?? "—"} kg</Text>
              <Text style={s.cell}>{scoreMap.get(a.id) ?? "—"}</Text>
              <Text style={s.cell}>{gmdMap.has(a.id) ? `${gmdMap.get(a.id)} g/d` : "—"}</Text>
              <Text style={s.cell}>{lastAppMap.get(a.id) ?? "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>
          Relatório gerado automaticamente pela plataforma Agraas · {today} · Dados sujeitos a atualização
        </Text>
      </Page>
    </Document>
  );

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-rebanho-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
