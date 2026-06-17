/**
 * Daily Briefing — endpoint disparado pelo Vercel Cron toda manhã 7:57 BRT
 * (10:57 UTC), seg-sex.
 *
 * Comportamento:
 * 1. Lê snapshot rápido do banco (animals, scores, cotação)
 * 2. Detecta sinais críticos da semana (score caiu? cotação stale? evento sanitário?)
 * 3. Persiste em `platform_settings.last_daily_briefing` (servirá para a UI
 *    mostrar "última atualização" ao Lucas quando ele abrir o painel)
 * 4. Loga estruturado para review futuro
 *
 * Segurança:
 * - Vercel Cron adiciona header `x-vercel-cron: 1` automaticamente
 * - Em produção, exigir esse header. Em dev, permitir Bearer.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCotacaoArroba } from "@/lib/cotacao";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron sempre injeta este header em produção
  if (req.headers.get("x-vercel-cron") === "1") return true;

  // Fallback: Bearer token (para teste local)
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return Boolean(process.env.DIGEST_TRIGGER_TOKEN) &&
    token === process.env.DIGEST_TRIGGER_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    const [
      { count: totalAnimais },
      { data: scoresData },
      { count: propriedades },
      cotacao,
    ] = await Promise.all([
      supabase.from("animals").select("*", { count: "exact", head: true }),
      supabase
        .from("animal_scores")
        .select("total_score")
        .eq("algorithm_version", "v3"),
      supabase.from("properties").select("*", { count: "exact", head: true }),
      getCotacaoArroba(),
    ]);

    const scores = (scoresData ?? [])
      .map((s) => Number(s.total_score))
      .filter((n) => !Number.isNaN(n));
    const scoreMedio =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Sinais críticos
    const sinais: string[] = [];

    if (cotacao.isStale) {
      sinais.push(
        `⚠️ Cotação @ stale (${cotacao.value.toFixed(2)} R$/@ — última atualização há mais de 12h)`,
      );
    }

    if (cotacao.isFallback) {
      sinais.push(`🔴 Cotação @ indisponível — usando fallback R$ ${cotacao.value}`);
    }

    if (scoreMedio < 40 && scores.length > 0) {
      sinais.push(
        `🟡 Score médio do rebanho em ${scoreMedio.toFixed(1)} pts — abaixo da faixa "regular" (50)`,
      );
    }

    const briefing = {
      data: new Date().toISOString(),
      snapshot: {
        animais: totalAnimais ?? 0,
        score_medio: Number(scoreMedio.toFixed(2)),
        score_range: scores.length > 0
          ? { min: Math.min(...scores), max: Math.max(...scores) }
          : null,
        propriedades: propriedades ?? 0,
        cotacao_arroba: cotacao.value,
        cotacao_stale: cotacao.isStale,
      },
      sinais,
    };

    // Persiste o snapshot no platform_settings para UI consumir
    await supabase
      .from("platform_settings")
      .upsert(
        {
          key: "last_daily_briefing",
          value: JSON.stringify(briefing),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

    return NextResponse.json({
      ok: true,
      briefing,
      message:
        sinais.length === 0
          ? "Plataforma operando sem sinais críticos."
          : `${sinais.length} sinal(is) detectado(s).`,
    });
  } catch (err) {
    console.error("[digest/daily] falha:", err);
    return NextResponse.json(
      { error: "Falha ao gerar daily briefing", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
