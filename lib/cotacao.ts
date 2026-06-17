/**
 * Helpers de cotação @ — lê platform_settings.cotacao_arroba com fallback seguro
 * e expõe metadata (timestamp, idade) para UI sinalizar stale.
 *
 * Server-side only (usa Supabase server client).
 */

import { createSupabaseServerClient } from "@/lib/supabase-server";

const FALLBACK_COTACAO = 330;
const STALE_THRESHOLD_HOURS = 12;

export type CotacaoSnapshot = {
  value: number;          // R$/@
  updatedAt: Date | null; // null se nunca foi atualizada
  isStale: boolean;       // true se > STALE_THRESHOLD_HOURS
  isFallback: boolean;    // true se usando FALLBACK (banco vazio)
};

/**
 * Lê cotação @ atual do platform_settings. Server-side.
 */
export async function getCotacaoArroba(): Promise<CotacaoSnapshot> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value, updated_at")
      .eq("key", "cotacao_arroba")
      .single();

    if (!data || !data.value) {
      return {
        value: FALLBACK_COTACAO,
        updatedAt: null,
        isStale: true,
        isFallback: true,
      };
    }

    const value = parseFloat(data.value);
    const updatedAt = data.updated_at ? new Date(data.updated_at) : null;
    const ageHours = updatedAt
      ? (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
      : Infinity;

    return {
      value: Number.isFinite(value) && value > 0 ? value : FALLBACK_COTACAO,
      updatedAt,
      isStale: ageHours > STALE_THRESHOLD_HOURS,
      isFallback: !Number.isFinite(value) || value <= 0,
    };
  } catch {
    return {
      value: FALLBACK_COTACAO,
      updatedAt: null,
      isStale: true,
      isFallback: true,
    };
  }
}

/**
 * Formata "atualizada há X" em português natural.
 */
export function formatCotacaoAge(updatedAt: Date | null): string {
  if (!updatedAt) return "indisponível";
  const mins = (Date.now() - updatedAt.getTime()) / 60000;
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${Math.round(mins)} min`;
  const hours = mins / 60;
  if (hours < 24) return `há ${Math.round(hours)} h`;
  const days = hours / 24;
  return `há ${Math.round(days)} d`;
}
