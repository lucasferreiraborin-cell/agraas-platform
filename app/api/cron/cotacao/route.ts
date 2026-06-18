/**
 * Cron diário CEPEA — cotação @ boi gordo, bezerro, vaca gorda, novilho precoce.
 *
 * Vercel Cron chama todo dia às 11:00 UTC (08:00 BRT) via header
 * `x-vercel-cron: 1`. Aceitamos também Bearer CRON_SECRET para teste local.
 *
 * IMPORTANTE: também escreve `cotacao_arroba` (sinônimo de boi_gordo) que é a
 * chave lida pelo lib/cotacao.ts e UI do produtor. Sem isso, UI fica stale
 * eternamente (bug original que deixou cotação parada há 69 dias).
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INDICATORS = ["boi_gordo", "bezerro", "vaca_gorda", "novilho_precoce"] as const;

const CEPEA_IDS: Record<string, number> = {
  boi_gordo:       2,
  bezerro:        14,
  vaca_gorda:     31,
  novilho_precoce: 35,
};

/** Fallback embutido caso CEPEA esteja fora — mantém plataforma operável */
const HARDCODED_FALLBACK: Record<string, number> = {
  boi_gordo: 330,
  bezerro: 2800,
  vaca_gorda: 270,
  novilho_precoce: 340,
};

async function fetchCepeaPrice(indicatorId: number): Promise<number | null> {
  try {
    const url = `https://cepea.esalq.usp.br/br/widget/json/d/?q=${indicatorId}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Agraas-Platform/1.0" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rows = json?.data ?? json?.["cepea-consulta"]?.item ?? [];
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first) return null;
    const raw = first["0"] ?? first["preco"] ?? first["valor"] ?? null;
    if (raw == null) return null;
    const parsed = parseFloat(String(raw).replace(",", "."));
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function isAuthorized(req: Request): boolean {
  // Vercel Cron sempre injeta esse header em produção
  if (req.headers.get("x-vercel-cron") === "1") return true;
  // Fallback Bearer (teste local / manual)
  const auth = req.headers.get("authorization") ?? "";
  return Boolean(process.env.CRON_SECRET) && auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const results: Record<string, { value: number; source: "cepea" | "fallback" }> = {};
  const errors: string[] = [];

  for (const key of INDICATORS) {
    const price = await fetchCepeaPrice(CEPEA_IDS[key]);
    if (price != null) {
      results[key] = { value: price, source: "cepea" };
    } else {
      results[key] = { value: HARDCODED_FALLBACK[key], source: "fallback" };
      errors.push(`CEPEA falhou para ${key}, usando fallback ${HARDCODED_FALLBACK[key]}`);
    }
  }

  const now = new Date().toISOString();

  // Persiste cada indicador
  for (const key of INDICATORS) {
    await db.from("platform_settings").upsert(
      { key: `cotacao_${key}`, value: String(results[key].value), updated_at: now },
      { onConflict: "key" },
    );
  }

  // **CRITICAL FIX**: também escreve cotacao_arroba (a chave que a UI lê)
  // Boi gordo é o sinônimo canônico de "arroba".
  await db.from("platform_settings").upsert(
    { key: "cotacao_arroba", value: String(results.boi_gordo.value), updated_at: now },
    { onConflict: "key" },
  );

  // Marca timestamp consolidado
  await db.from("platform_settings").upsert(
    { key: "cotacao_updated_at", value: now, updated_at: now },
    { onConflict: "key" },
  );

  // Log estruturado pra Vercel logs
  console.log("[cron/cotacao]", { ts: now, results, errors });

  return NextResponse.json({
    ok: true,
    results,
    errors,
    ts: now,
    cotacao_arroba: results.boi_gordo.value,
  });
}
