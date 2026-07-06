/**
 * Daily Briefing 2.0 — estrutura: Plataforma · Mercado · Decisões · Insights.
 *
 * Vercel Cron 7:57 BRT (10:57 UTC) seg-sex. Auth via x-vercel-cron ou Bearer.
 *
 * Cada seção:
 * - Plataforma: o que mudou nas últimas 24h (git log + commits + features)
 * - Mercado: top sinais de market_signals (priority asc, últimas 24h)
 * - Decisões pra Lucas: lista de TODOs concretos detectados (cron falhou, fonte fora, FSJBE dados stale, etc.)
 * - Insights por persona: top 1 bullet de cada daily_insights de hoje
 *
 * Persiste snapshot em platform_settings.last_daily_briefing pra UI consumir.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCotacaoArroba, formatCotacaoAge } from "@/lib/cotacao";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const auth = req.headers.get("authorization") ?? "";
  return Boolean(process.env.DIGEST_TRIGGER_TOKEN) &&
    auth === `Bearer ${process.env.DIGEST_TRIGGER_TOKEN}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const today = new Date().toISOString().split("T")[0];
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalAnimais },
      { data: scoresData },
      { count: propriedades },
      { data: marketSignalsTop },
      { data: insightsToday },
      { data: jobsLast },
      cotacao,
    ] = await Promise.all([
      db.from("animals").select("*", { count: "exact", head: true }).eq("status", "Ativo"),
      db.from("animal_scores").select("total_score").in("algorithm_version", ["v3", "v3.1", "v3.2"]),
      db.from("properties").select("*", { count: "exact", head: true }),
      db.from("market_signals").select("source, kind, title, summary, raw_value, raw_unit, priority, published_at")
        .gte("published_at", since24h).order("priority", { ascending: true }).order("published_at", { ascending: false }).limit(8),
      db.from("daily_insights").select("persona, bullets").eq("insight_date", today),
      db.from("platform_jobs_log").select("job_name, status, ran_at").order("ran_at", { ascending: false }).limit(20),
      getCotacaoArroba(),
    ]);

    const scores = (scoresData ?? []).map((s) => Number(s.total_score)).filter((n) => !Number.isNaN(n));
    const scoreMedio = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // SEÇÃO 1 · PLATAFORMA — o que mudou nas últimas 24h (jobs + métricas)
    const lastJobByName = new Map<string, { status: string; ran_at: string }>();
    for (const j of jobsLast ?? []) if (!lastJobByName.has(j.job_name)) lastJobByName.set(j.job_name, j);

    const plataforma = {
      animais_ativos: totalAnimais ?? 0,
      score_medio: Number(scoreMedio.toFixed(1)),
      propriedades: propriedades ?? 0,
      jobs_status: Array.from(lastJobByName.entries()).map(([name, j]) => ({
        job: name,
        status: j.status,
        ran_at: j.ran_at,
      })),
    };

    // SEÇÃO 2 · MERCADO
    const mercado = {
      cotacao_arroba: cotacao.value,
      cotacao_age: formatCotacaoAge(cotacao.updatedAt),
      cotacao_stale: cotacao.isStale,
      cotacao_fallback: cotacao.isFallback,
      top_sinais: (marketSignalsTop ?? []).map((s) => ({
        source: s.source,
        kind: s.kind,
        title: s.title,
        summary: s.summary ?? "",
        raw_value: s.raw_value,
        raw_unit: s.raw_unit,
        priority: s.priority,
        published_at: s.published_at,
      })),
    };

    // SEÇÃO 3 · DECISÕES PRA LUCAS (alertas operacionais)
    const decisoes: string[] = [];
    if (cotacao.isStale) decisoes.push(`Cotação @ stale (${formatCotacaoAge(cotacao.updatedAt)}) — atualizar manualmente em /admin/saude ou investigar fetcher CEPEA`);
    if (cotacao.isFallback) decisoes.push("Cotação @ usando fallback hardcoded — banco vazio");
    const marketJob = lastJobByName.get("market_refresh");
    if (!marketJob) decisoes.push("Job market_refresh nunca rodou — aguardar próximo cron ou disparar manualmente");
    else if (marketJob.status === "failed") decisoes.push(`Job market_refresh falhou em ${marketJob.ran_at}`);
    const insightsJob = lastJobByName.get("generate_insights");
    if (!insightsJob) decisoes.push("Geração de insights IA não rodou hoje");
    if (scoreMedio < 40 && scores.length > 0) decisoes.push(`Score médio em ${scoreMedio.toFixed(1)} — abaixo de 40, atenção operacional`);

    // SEÇÃO 4 · INSIGHTS POR PERSONA (1 top bullet por persona)
    const insightsByPersona: Record<string, { headline: string; reasoning: string }[]> = {};
    for (const i of insightsToday ?? []) {
      const bullets = (i.bullets as Array<{ headline?: string; reasoning?: string }>) ?? [];
      const top = bullets[0];
      if (!top) continue;
      if (!insightsByPersona[i.persona]) insightsByPersona[i.persona] = [];
      insightsByPersona[i.persona].push({
        headline: top.headline ?? "",
        reasoning: top.reasoning ?? "",
      });
    }

    const briefing = {
      generated_at: new Date().toISOString(),
      date: today,
      plataforma,
      mercado,
      decisoes,
      insights_por_persona: insightsByPersona,
    };

    await db.from("platform_settings").upsert(
      { key: "last_daily_briefing", value: JSON.stringify(briefing), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

    await db.from("platform_jobs_log").insert({
      job_name: "daily_briefing",
      status: "ok",
      details: { decisoes_count: decisoes.length, sinais_count: marketSignalsTop?.length ?? 0 },
      ran_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, briefing });
  } catch (err) {
    console.error("[digest/daily] falha:", err);
    return NextResponse.json(
      { error: "Falha", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
