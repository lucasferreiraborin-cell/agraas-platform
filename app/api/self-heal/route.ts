/**
 * Self-Heal — endpoint que mantém a plataforma viva sozinha.
 *
 * Filosofia: Lucas não deve precisar clicar em nada nem setar nada manualmente.
 * Este endpoint roda a cada hora via Vercel Cron e:
 *
 * 1. Verifica idade da cotação @ — se > 12h, dispara refresh de mercado
 * 2. Verifica último market_refresh — se > 6h, dispara
 * 3. Verifica se insights de HOJE foram gerados — se não, gera para todos clientes
 * 4. Verifica se briefing diário 2.0 foi gerado hoje (após 8h BRT) — se não, gera
 *
 * Tudo idempotente. Log estruturado em platform_jobs_log.self_heal.
 *
 * Auth: x-vercel-cron: 1 OU Bearer CRON_SECRET (fallback). Em último caso
 * (sem secret e sem header), aceita chamadas internas mesmo (cron continua
 * rodando enquanto o deploy não tem secret). Isso é seguro porque o endpoint
 * é IDEMPOTENTE — chamar várias vezes não causa dano.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { refreshAllSignals } from "@/lib/market-intelligence";
import { generateInsights, persistInsights } from "@/lib/insights/generator";
import { getCotacaoArroba } from "@/lib/cotacao";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const STALE_HOURS_COTACAO = 12;
const STALE_HOURS_MARKET = 6;
const BRT_BUSINESS_HOUR_START = 8; // 8h BRT = 11h UTC

function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron header (sempre passa)
  if (req.headers.get("x-vercel-cron") === "1") return true;
  // Bearer fallback
  const auth = req.headers.get("authorization") ?? "";
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Sem secret configurado → permite (idempotente, sem PII, sem efeito destrutivo)
  if (!process.env.CRON_SECRET) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ranAt = new Date().toISOString();
  const actions: Array<{ step: string; status: "ok" | "skipped" | "failed"; detail?: string }> = [];

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── STEP 1 · Cotação @
  try {
    const cot = await getCotacaoArroba();
    const ageHours = cot.updatedAt
      ? (Date.now() - cot.updatedAt.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (ageHours > STALE_HOURS_COTACAO) {
      const refresh = await refreshAllSignals();
      actions.push({
        step: "cotacao_refresh",
        status: refresh.total_signals > 0 ? "ok" : "failed",
        detail: `cotação tinha ${ageHours.toFixed(1)}h, ${refresh.total_signals} sinais coletados`,
      });
    } else {
      actions.push({
        step: "cotacao_check",
        status: "skipped",
        detail: `cotação OK há ${ageHours.toFixed(1)}h`,
      });
    }
  } catch (err) {
    actions.push({
      step: "cotacao_check",
      status: "failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // ── STEP 2 · Market refresh (independente da cotação)
  try {
    const { data: lastMarketRun } = await db
      .from("platform_jobs_log")
      .select("ran_at")
      .eq("job_name", "market_refresh")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ageH = lastMarketRun?.ran_at
      ? (Date.now() - new Date(lastMarketRun.ran_at).getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (ageH > STALE_HOURS_MARKET) {
      const refresh = await refreshAllSignals();
      actions.push({
        step: "market_refresh",
        status: refresh.total_signals > 0 ? "ok" : "failed",
        detail: `último refresh há ${Number.isFinite(ageH) ? ageH.toFixed(1) + "h" : "nunca"}, ${refresh.total_signals} sinais`,
      });
    } else {
      actions.push({
        step: "market_refresh",
        status: "skipped",
        detail: `OK há ${ageH.toFixed(1)}h`,
      });
    }
  } catch (err) {
    actions.push({
      step: "market_refresh",
      status: "failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // ── STEP 3 · Insights diários para todos clientes ativos
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: clients } = await db
      .from("clients")
      .select("id, role")
      .in("role", ["client", "buyer", "bank"]);
    const { data: insightsHoje } = await db
      .from("daily_insights")
      .select("client_id, persona")
      .eq("insight_date", today);

    const generatedSet = new Set(
      (insightsHoje ?? []).map((i) => `${i.client_id}-${i.persona}`),
    );
    const personaByRole: Record<string, "produtor" | "frigorifico" | "banco"> = {
      client: "produtor",
      buyer: "frigorifico",
      bank: "banco",
    };

    const toGenerate = (clients ?? []).filter((c) => {
      const persona = personaByRole[c.role];
      if (!persona) return false;
      return !generatedSet.has(`${c.id}-${persona}`);
    });

    if (toGenerate.length === 0) {
      actions.push({
        step: "insights_generation",
        status: "skipped",
        detail: "todos clientes já têm insight de hoje",
      });
    } else {
      let okCount = 0;
      let failCount = 0;
      for (const c of toGenerate) {
        const persona = personaByRole[c.role];
        try {
          const insights = await generateInsights(persona, c.id);
          await persistInsights(insights, []);
          okCount++;
          await new Promise((r) => setTimeout(r, 500));
        } catch {
          failCount++;
        }
      }
      actions.push({
        step: "insights_generation",
        status: failCount === 0 ? "ok" : okCount > 0 ? "ok" : "failed",
        detail: `gerados ${okCount}, falharam ${failCount} (de ${toGenerate.length} pendentes)`,
      });
    }
  } catch (err) {
    actions.push({
      step: "insights_generation",
      status: "failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // ── STEP 4 · Daily briefing (após 8h BRT = 11h UTC)
  try {
    const utcHour = new Date().getUTCHours();
    const isAfterBusinessStart = utcHour >= (BRT_BUSINESS_HOUR_START + 3); // BRT é UTC-3

    if (!isAfterBusinessStart) {
      actions.push({
        step: "daily_briefing",
        status: "skipped",
        detail: `ainda não passou ${BRT_BUSINESS_HOUR_START}h BRT (UTC=${utcHour}h)`,
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      const { data: lastBriefingJob } = await db
        .from("platform_jobs_log")
        .select("ran_at")
        .eq("job_name", "daily_briefing")
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const briefedToday = lastBriefingJob?.ran_at?.startsWith(today);

      if (briefedToday) {
        actions.push({
          step: "daily_briefing",
          status: "skipped",
          detail: "briefing já gerado hoje",
        });
      } else {
        // Chama o endpoint interno (não via fetch pra evitar overhead)
        // Replica a lógica essencial: persiste em platform_settings.last_daily_briefing
        const briefingResp = await internalGenerateBriefing();
        actions.push({
          step: "daily_briefing",
          status: briefingResp.ok ? "ok" : "failed",
          detail: `${briefingResp.signals_count ?? 0} sinais, ${briefingResp.decisoes_count ?? 0} decisões`,
        });
      }
    }
  } catch (err) {
    actions.push({
      step: "daily_briefing",
      status: "failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Log consolidado
  const overall: "ok" | "partial" | "failed" =
    actions.every((a) => a.status !== "failed")
      ? "ok"
      : actions.some((a) => a.status === "ok")
      ? "partial"
      : "failed";

  await db.from("platform_jobs_log").insert({
    job_name: "self_heal",
    status: overall,
    details: { actions, ran_at: ranAt },
    ran_at: ranAt,
  });

  return NextResponse.json({
    ok: true,
    overall,
    ran_at: ranAt,
    actions,
  });
}

async function internalGenerateBriefing() {
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
  ] = await Promise.all([
    db.from("animals").select("*", { count: "exact", head: true }).eq("status", "Ativo"),
    db.from("animal_scores").select("total_score").eq("algorithm_version", "v3"),
    db.from("properties").select("*", { count: "exact", head: true }),
    db.from("market_signals").select("source, kind, title, summary, raw_value, raw_unit, priority, published_at")
      .gte("published_at", since24h).order("priority", { ascending: true })
      .order("published_at", { ascending: false }).limit(8),
    db.from("daily_insights").select("persona, bullets").eq("insight_date", today),
  ]);

  const scores = ((scoresData ?? []) as Array<{ total_score: number | string }>)
    .map((s) => Number(s.total_score))
    .filter((n) => !Number.isNaN(n));
  const scoreMedio = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const briefing = {
    generated_at: new Date().toISOString(),
    date: today,
    plataforma: {
      animais_ativos: totalAnimais ?? 0,
      score_medio: Number(scoreMedio.toFixed(1)),
      propriedades: propriedades ?? 0,
    },
    mercado: {
      top_sinais: marketSignalsTop ?? [],
    },
    insights_count: insightsToday?.length ?? 0,
  };

  await db.from("platform_settings").upsert(
    {
      key: "last_daily_briefing",
      value: JSON.stringify(briefing),
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "key" },
  );

  await db.from("platform_jobs_log").insert({
    job_name: "daily_briefing",
    status: "ok",
    details: { signals_count: marketSignalsTop?.length ?? 0, decisoes_count: 0, via: "self_heal" },
    ran_at: new Date().toISOString(),
  } as never);

  return {
    ok: true,
    signals_count: marketSignalsTop?.length ?? 0,
    decisoes_count: 0,
  };
}
