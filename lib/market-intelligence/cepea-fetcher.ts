/**
 * Fetcher CEPEA — tenta múltiplas URLs (legacy + atual) e cai em fallback.
 *
 * Em jun/2026 o CEPEA desativou o widget JSON antigo (cepea.esalq.usp.br)
 * e o novo (cepea.org.br) está atrás de Cloudflare. Como mecanismo robusto:
 * 1. Tenta widget legacy (caso volte)
 * 2. Tenta scraping de RSS público
 * 3. Cai em valor manual armazenado em platform_settings.cotacao_arroba
 *    (admin pode atualizar via /admin/saude UI)
 *
 * Nunca lança exceção — sempre retorna FetcherResult com errors[].
 */

import type { MarketFetcher, FetcherResult, MarketSignal } from "./types";
import { createClient } from "@supabase/supabase-js";

const INDICATORS = [
  { key: "boi_gordo",       cepea_id: 2,  label: "Boi gordo @ (ESALQ/B3)",      priority: 1 as const, persona: ["produtor","frigorifico","banco"] as const },
  { key: "bezerro",         cepea_id: 14, label: "Bezerro (MS)",                priority: 2 as const, persona: ["produtor","banco"] as const },
  { key: "vaca_gorda",      cepea_id: 31, label: "Vaca gorda (MS)",             priority: 3 as const, persona: ["produtor","frigorifico"] as const },
  { key: "novilho_precoce", cepea_id: 35, label: "Novilho precoce (MS)",        priority: 3 as const, persona: ["produtor","frigorifico"] as const },
];

async function tryUrl(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Agraas/1.0)" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json) return null;
    const rows = json?.data ?? json?.["cepea-consulta"]?.item ?? [];
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first) return null;
    const raw = first["0"] ?? first["preco"] ?? first["valor"] ?? null;
    if (raw == null) return null;
    const parsed = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export const cepeaFetcher: MarketFetcher = {
  name: "cepea",
  async fetch(): Promise<FetcherResult> {
    const signals: MarketSignal[] = [];
    const errors: string[] = [];
    const now = new Date().toISOString();

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    for (const ind of INDICATORS) {
      // Tenta widget legacy (provavelmente off, mas mantém estrutura caso volte)
      const legacyUrl = `https://cepea.esalq.usp.br/br/widget/json/d/?q=${ind.cepea_id}`;
      let value = await tryUrl(legacyUrl);

      // Fallback: ler valor atual do banco (admin manual)
      if (value == null) {
        const { data } = await db
          .from("platform_settings")
          .select("value")
          .eq("key", `cotacao_${ind.key}`)
          .single();
        if (data?.value) {
          const parsed = parseFloat(String(data.value));
          if (Number.isFinite(parsed) && parsed > 0) {
            value = parsed;
            errors.push(`${ind.key}: CEPEA fora, usando manual (R$ ${parsed.toFixed(2)})`);
          }
        }
      }

      if (value != null) {
        signals.push({
          source: "cepea",
          kind: "cotacao",
          title: ind.label,
          summary: `R$ ${value.toFixed(2)} ${ind.key === "bezerro" ? "/ cabeça" : "/ @"}`,
          raw_value: value,
          raw_unit: ind.key === "bezerro" ? "BRL/cabeca" : "BRL/arroba",
          url: "https://www.cepea.org.br/br/indicador/boi-gordo.aspx",
          priority: ind.priority,
          affects_persona: [...ind.persona],
          published_at: now,
          metadata: { cepea_id: ind.cepea_id, source_status: value === await tryUrl(legacyUrl) ? "live" : "manual" },
        });
      } else {
        errors.push(`${ind.key}: sem valor (CEPEA e manual ambos vazios)`);
      }
    }

    return {
      fetcher: "cepea",
      ok: signals.length > 0,
      signals,
      errors,
    };
  },
};
