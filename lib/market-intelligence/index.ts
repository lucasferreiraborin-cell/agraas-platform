/**
 * Orquestrador do Market Intelligence — roda todos fetchers em paralelo,
 * consolida resultados e persiste em `market_signals`.
 *
 * Chamado por:
 * - /api/market/refresh (cron Vercel cada 6h)
 * - /api/admin/market/refresh (manual via UI)
 */

import { createClient } from "@supabase/supabase-js";
import { cepeaFetcher } from "./cepea-fetcher";
import { noticiasFetcher } from "./noticias-fetcher";
import type { MarketSignal, FetcherResult } from "./types";

const ALL_FETCHERS = [cepeaFetcher, noticiasFetcher];

export type RefreshResult = {
  ok: boolean;
  total_signals: number;
  per_fetcher: Record<string, { ok: boolean; signals_count: number; errors: string[] }>;
  errors: string[];
  ran_at: string;
};

export async function refreshAllSignals(): Promise<RefreshResult> {
  const ranAt = new Date().toISOString();
  const results: FetcherResult[] = await Promise.all(
    ALL_FETCHERS.map((f) => f.fetch().catch((err) => ({
      fetcher: f.name,
      ok: false,
      signals: [],
      errors: [String(err?.message ?? err)],
    }))),
  );

  const allSignals: MarketSignal[] = results.flatMap((r) => r.signals);
  const allErrors: string[] = results.flatMap((r) => r.errors.map((e) => `[${r.fetcher}] ${e}`));

  const perFetcher: RefreshResult["per_fetcher"] = {};
  for (const r of results) {
    perFetcher[r.fetcher] = { ok: r.ok, signals_count: r.signals.length, errors: r.errors };
  }

  // Persiste
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  if (allSignals.length > 0) {
    const { error } = await db.from("market_signals").insert(
      allSignals.map((s) => ({
        source: s.source,
        kind: s.kind,
        title: s.title,
        summary: s.summary ?? null,
        raw_value: s.raw_value ?? null,
        raw_unit: s.raw_unit ?? null,
        url: s.url ?? null,
        priority: s.priority,
        affects_persona: s.affects_persona,
        published_at: s.published_at,
        metadata: s.metadata ?? {},
      })),
    );
    if (error) allErrors.push(`insert failed: ${error.message}`);
  }

  // Atualiza cotacao_arroba se houve cotação CEPEA fresh
  const boiSignal = allSignals.find((s) => s.source === "cepea" && s.title.includes("Boi gordo"));
  if (boiSignal?.raw_value) {
    await db.from("platform_settings").upsert(
      { key: "cotacao_arroba", value: String(boiSignal.raw_value), updated_at: ranAt },
      { onConflict: "key" },
    );
  }

  // Log do job
  await db.from("platform_jobs_log").insert({
    job_name: "market_refresh",
    status: allSignals.length > 0 ? (allErrors.length > 0 ? "partial" : "ok") : "failed",
    details: { per_fetcher: perFetcher, errors: allErrors },
    ran_at: ranAt,
  });

  return {
    ok: allSignals.length > 0,
    total_signals: allSignals.length,
    per_fetcher: perFetcher,
    errors: allErrors,
    ran_at: ranAt,
  };
}

/**
 * Lê sinais recentes (últimas 48h) filtrados por persona.
 * Usado pelo /api/insights/{persona} para alimentar Claude.
 */
export async function getRecentSignalsForPersona(persona: string, hours = 48, limit = 20) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("market_signals")
    .select("*")
    .gte("published_at", since)
    .contains("affects_persona", [persona])
    .order("priority", { ascending: true })
    .order("published_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
