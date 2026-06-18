/**
 * Gerador de insights diários por persona — Claude Sonnet 4.6 consome
 * sinais recentes de market_signals + métricas reais do banco e produz
 * 3-5 bullets contextualizados para a persona.
 *
 * Filosofia: nada de placebo. Cada bullet referencia um SIGNAL ID + uma
 * MÉTRICA do banco. Se a IA não tem dados pra falar, retorna lista vazia
 * (não inventa).
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getRecentSignalsForPersona } from "@/lib/market-intelligence";

const MODEL = "claude-sonnet-4-6";

export type InsightBullet = {
  headline: string;
  reasoning: string;
  source_signal_ids: string[];
  metric_used?: string;
  recommended_action?: string;
};

export type GeneratedInsights = {
  persona: string;
  client_id: string | null;
  bullets: InsightBullet[];
  signals_count: number;
  model: string;
  generated_at: string;
};

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function fetchProdutorMetrics(clientId: string) {
  const db = getDb();
  const [{ count: animais }, { data: ps }, { count: propriedades }, { data: alertas }] = await Promise.all([
    db.from("animals").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "Ativo"),
    db.from("producer_scores").select("score_total").eq("client_id", clientId).maybeSingle(),
    db.from("properties").select("*", { count: "exact", head: true }).eq("client_id", clientId),
    db.from("applications").select("animal_id, withdrawal_date").eq("client_id", clientId).gt("withdrawal_date", new Date().toISOString().split("T")[0]),
  ]);
  return {
    animais_ativos: animais ?? 0,
    producer_score: ps?.score_total ?? null,
    propriedades: propriedades ?? 0,
    carencias_ativas: (alertas ?? []).length,
  };
}

async function fetchFrigorificoMetrics(clientId: string) {
  const db = getDb();
  const { data: access } = await db.from("lot_buyer_access").select("lot_id").eq("buyer_client_id", clientId);
  const lotIds = (access ?? []).map((a) => a.lot_id);
  const { data: lots } = lotIds.length ? await db.from("lots").select("id, status, pais_destino").in("id", lotIds) : { data: [] };
  return {
    lotes_vinculados: lots?.length ?? 0,
    lotes_ativos: (lots ?? []).filter((l) => l.status === "active").length,
    destinos: [...new Set((lots ?? []).map((l) => l.pais_destino).filter(Boolean))],
  };
}

async function fetchBancoMetrics(clientId: string) {
  const db = getDb();
  const { data: rels } = await db
    .from("bank_producer_relationships")
    .select("producer_client_id, granted_by_producer")
    .eq("bank_client_id", clientId)
    .eq("status", "active");
  const granted = (rels ?? []).filter((r) => r.granted_by_producer).map((r) => r.producer_client_id);
  const { data: scores } = granted.length
    ? await db.from("producer_scores").select("score_total").in("client_id", granted)
    : { data: [] };
  const vals = (scores ?? []).map((s) => Number(s.score_total)).filter(Number.isFinite);
  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  return {
    produtores_portfolio: granted.length,
    pendentes_consentimento: (rels ?? []).filter((r) => !r.granted_by_producer).length,
    score_medio_portfolio: Number(avg.toFixed(1)),
    em_alerta: vals.filter((v) => v < 50).length,
  };
}

const PROMPTS: Record<string, (metrics: Record<string, unknown>, signals: { id: string; source: string; kind: string; title: string; summary: string | null; raw_value: number | null; priority: number }[]) => string> = {
  produtor: (m, s) => `Você é o analista IA da Agraas para o produtor rural.

MÉTRICAS DO PRODUTOR HOJE:
- Animais ativos: ${m.animais_ativos}
- Producer Score (Embrapa Doc 237 v3): ${m.producer_score ?? "não calculado"}
- Propriedades: ${m.propriedades}
- Aplicações em carência: ${m.carencias_ativas}

SINAIS DE MERCADO (últimas 48h):
${s.map((x) => `[${x.id.slice(0,8)}] (${x.source}/${x.kind}, prio=${x.priority}) ${x.title}${x.raw_value ? ` — R$ ${x.raw_value}` : ""}${x.summary ? ` · ${x.summary.slice(0,160)}` : ""}`).join("\n")}

TAREFA: gere 3-5 bullets de insight ACIONÁVEIS para este produtor agora. Cada bullet:
- headline: até 80 caracteres, direto
- reasoning: 1-2 frases ligando o sinal à métrica concreta do produtor
- source_signal_ids: array dos IDs (use o prefixo 8-char como mostrado, formato completo se souber)
- metric_used: qual métrica do produtor justifica
- recommended_action: ação concreta em até 100 caracteres

Responda APENAS JSON puro array de bullets. Sem markdown, sem prefixo, sem explicação fora do JSON.
Se não houver sinais suficientes para um insight honesto, retorne [].`,

  frigorifico: (m, s) => `Você é o analista IA da Agraas para o frigorífico/comprador.

MÉTRICAS DO FRIGORÍFICO HOJE:
- Lotes vinculados: ${m.lotes_vinculados}
- Lotes ativos: ${m.lotes_ativos}
- Destinos: ${(m.destinos as string[]).join(", ") || "—"}

SINAIS DE MERCADO (últimas 48h):
${s.map((x) => `[${x.id.slice(0,8)}] (${x.source}/${x.kind}, prio=${x.priority}) ${x.title}${x.raw_value ? ` — R$ ${x.raw_value}` : ""}${x.summary ? ` · ${x.summary.slice(0,160)}` : ""}`).join("\n")}

TAREFA: gere 3-5 bullets de insight para este frigorífico — foco em compras, compliance EUDR/Hilton/GTA, oportunidades de lote, oscilação de @ que justifica antecipar/postergar compra.
Cada bullet: headline (até 80c), reasoning (1-2 frases), source_signal_ids[], metric_used, recommended_action.

Responda APENAS JSON puro array. Se não houver sinais suficientes, retorne [].`,

  banco: (m, s) => `Você é o analista IA da Agraas para a instituição financeira / cooperativa de crédito.

MÉTRICAS DO PORTFOLIO HOJE:
- Produtores ativos: ${m.produtores_portfolio}
- Pendentes consentimento: ${m.pendentes_consentimento}
- Score médio: ${m.score_medio_portfolio}
- Em alerta (< 50): ${m.em_alerta}

SINAIS DE MERCADO (últimas 48h):
${s.map((x) => `[${x.id.slice(0,8)}] (${x.source}/${x.kind}, prio=${x.priority}) ${x.title}${x.raw_value ? ` — R$ ${x.raw_value}` : ""}${x.summary ? ` · ${x.summary.slice(0,160)}` : ""}`).join("\n")}

TAREFA: gere 3-5 bullets para o analista de crédito rural — foco em risco (queda de score, eventos sanitários, mudanças regulatórias EUDR/PNIB/Plano Safra), oportunidades de crédito (alta de @ favorece refinanciamento), portfolio quality.
Cada bullet: headline (até 80c), reasoning (1-2 frases), source_signal_ids[], metric_used, recommended_action.

Responda APENAS JSON puro array. Se sinais insuficientes, retorne [].`,
};

export async function generateInsights(persona: "produtor"|"frigorifico"|"banco", clientId: string): Promise<GeneratedInsights> {
  const signals = await getRecentSignalsForPersona(persona, 48, 20);
  let metrics: Record<string, unknown> = {};
  if (persona === "produtor") metrics = await fetchProdutorMetrics(clientId);
  else if (persona === "frigorifico") metrics = await fetchFrigorificoMetrics(clientId);
  else if (persona === "banco") metrics = await fetchBancoMetrics(clientId);

  if (signals.length === 0) {
    return {
      persona,
      client_id: clientId,
      bullets: [],
      signals_count: 0,
      model: MODEL,
      generated_at: new Date().toISOString(),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      persona,
      client_id: clientId,
      bullets: [],
      signals_count: signals.length,
      model: "no-api-key",
      generated_at: new Date().toISOString(),
    };
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = PROMPTS[persona](metrics, signals as { id: string; source: string; kind: string; title: string; summary: string | null; raw_value: number | null; priority: number }[]);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n")
    .trim();

  let bullets: InsightBullet[] = [];
  try {
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      bullets = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    }
  } catch (e) {
    console.error("[insights] JSON parse failed:", e, text.slice(0, 200));
  }

  return {
    persona,
    client_id: clientId,
    bullets,
    signals_count: signals.length,
    model: MODEL,
    generated_at: new Date().toISOString(),
  };
}

export async function persistInsights(insights: GeneratedInsights, signalsUsedIds: string[]) {
  const db = getDb();
  await db.from("daily_insights").upsert(
    {
      persona: insights.persona,
      client_id: insights.client_id,
      insight_date: new Date().toISOString().split("T")[0],
      bullets: insights.bullets,
      signals_used: signalsUsedIds,
      model: insights.model,
      generated_at: insights.generated_at,
    },
    { onConflict: "persona,client_id,insight_date" },
  );
}
