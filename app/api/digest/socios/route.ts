/**
 * Endpoint para disparar o digest semanal aos sócios.
 *
 * Modos de invocação:
 * 1. POST /api/digest/socios — manual (Lucas autoriza envio)
 * 2. POST /api/digest/socios?dryRun=true — preview sem enviar (gera HTML pra Lucas validar)
 * 3. Schedule remoto (skill `schedule`) — disparo automático sexta 17h BRT
 *
 * Segurança:
 * - Bearer token via DIGEST_TRIGGER_TOKEN (env) — protege contra disparo
 *   externo não autorizado mesmo se a URL vazar
 * - Rate limit 3/min
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  sendDigestToSocios,
  renderDigestHTML,
  SOCIOS_AGRAAS,
  type DigestSnapshot,
} from "@/lib/socios-digest";

export const runtime = "nodejs";

function unauthorized(reason: string) {
  return NextResponse.json({ error: reason }, { status: 401 });
}

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.DIGEST_TRIGGER_TOKEN ?? "";

  // Em desenvolvimento (sem token configurado), permitir via session cookie autenticada.
  // Em produção, exigir Bearer.
  return Boolean(expected) && token === expected;
}

async function buildSnapshot(): Promise<DigestSnapshot> {
  const supabase = await createSupabaseServerClient();

  // Métricas da plataforma (server-side, RLS bypass via service role só onde necessário)
  const [
    { count: totalAnimais },
    { data: scoresData },
    { count: propriedades },
    { count: farmScoresCount },
    { count: producerScoresCount },
  ] = await Promise.all([
    supabase.from("animals").select("*", { count: "exact", head: true }),
    supabase
      .from("animal_scores")
      .select("total_score")
      .in("algorithm_version", ["v3", "v3.1", "v3.2"]),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("farm_scores").select("*", { count: "exact", head: true }),
    supabase.from("producer_scores").select("*", { count: "exact", head: true }),
  ]);

  const scores = (scoresData ?? []).map(s => Number(s.total_score)).filter(n => !Number.isNaN(n));
  const scoreMedio = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const scoreMin = scores.length > 0 ? Math.min(...scores) : 0;
  const scoreMax = scores.length > 0 ? Math.max(...scores) : 0;

  // Período: últimos 7 dias
  const fim = new Date();
  const inicio = new Date(fim.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmtData = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return {
    periodo: {
      inicio: fmtData(inicio),
      fim: fmtData(fim),
    },
    // TODO próxima iteração: ler git log via execSync e popular commits/decisões.
    // Por ora, deixamos vazio — UI suporta listas vazias graciosamente.
    commits: [],
    decisoes: [],
    metricas_plataforma: {
      total_animais: totalAnimais ?? 0,
      score_medio_v3: scoreMedio,
      range_score: { min: scoreMin, max: scoreMax },
      propriedades: propriedades ?? 0,
      farm_scores_atualizados: farmScoresCount ?? 0,
      producer_scores_atualizados: producerScoresCount ?? 0,
    },
    destaques_semana: [],
    proximos_passos: [],
  };
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 3, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  if (!isAuthorized(req)) {
    return unauthorized("Token inválido. Use DIGEST_TRIGGER_TOKEN.");
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "true";

  try {
    const snap = await buildSnapshot();

    if (dryRun) {
      // Retorna preview HTML do digest do Lucas (sem enviar)
      const preview = renderDigestHTML(snap, "Lucas");
      return new NextResponse(preview, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const result = await sendDigestToSocios(snap);
    return NextResponse.json({
      ok: true,
      destinatarios: SOCIOS_AGRAAS.length,
      enviados: result.enviados,
      falharam: result.falharam,
      detalhes: result.detalhes,
    });
  } catch (err) {
    console.error("[digest/socios] falha:", err);
    return NextResponse.json(
      { error: "Falha ao gerar/enviar digest", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// GET reservado para preview pública (apenas dryRun, exige Bearer)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return unauthorized("Token inválido.");
  }
  const snap = await buildSnapshot();
  const preview = renderDigestHTML(snap, "Sócio (preview)");
  return new NextResponse(preview, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
