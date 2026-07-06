/**
 * GET /api/fiscal/export-lcdpr?year=2026
 *
 * Gera arquivo .txt LCDPR layout 1.3 RFB para o ano-calendário informado
 * e retorna como download (Content-Disposition: attachment).
 *
 * Persiste um registro em `lcdpr_exports` (status='rascunho') para histórico
 * e auditoria — independente de quem fez o download.
 *
 * Auth: persona produtor, contador ou admin (requirePersona).
 * Rate limit: 10 chamadas / 60s — geração é cara (lê accounting_entries inteiras).
 *
 * Spec: docs/research/2026-06-24-reforma-tributaria-rural.md §MISSÃO 3
 * Migration backing: supabase/migrations/147_lcdpr_export_functions.sql
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePersona } from "@/lib/persona-resolver";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2020, "Ano mínimo 2020")
    .max(2099, "Ano máximo 2099"),
});

// Sanitiza nome para uso em filename (sem acento, sem espaço, sem barra)
function safeFilenamePart(input: string): string {
  return (input || "produtor")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 40) || "PRODUTOR";
}

export async function GET(req: NextRequest) {
  // Rate limit antes do auth — protege contra DoS em endpoint pesado
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  // Auth + persona guard (produtor / contador / admin)
  const ctx = await requirePersona(["produtor", "contador", "admin"]);

  // Parse query
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ year: url.searchParams.get("year") });
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Query inválida" },
      { status: 400 },
    );
  }
  const year = parsed.data.year;

  const supabase = await createSupabaseServerClient();

  // 1. Gera o .txt via função PL/pgSQL (security definer)
  const { data: txtData, error: txtErr } = await supabase.rpc(
    "generate_lcdpr_txt",
    { p_client_id: ctx.clientId, p_ano: year },
  );

  if (txtErr) {
    return Response.json(
      { error: "Falha ao gerar LCDPR: " + txtErr.message },
      { status: 500 },
    );
  }

  const txt = (txtData as string | null) ?? "";
  if (!txt || !txt.includes("|0000|") || !txt.includes("|9999|")) {
    return Response.json(
      { error: "Arquivo gerado inválido (sem registro de abertura/encerramento)." },
      { status: 500 },
    );
  }

  // 2. Persiste rascunho em lcdpr_exports (best-effort — não bloqueia download)
  //    Usa register_lcdpr_export para manter totais em sync com o exporter.
  //    Erros aqui são logados mas não derrubam o download — o produtor tem prioridade.
  try {
    await supabase.rpc("register_lcdpr_export", {
      p_client_id: ctx.clientId,
      p_ano: year,
    });
  } catch (err) {
    // Não bloqueia — apenas registra
    console.error("[export-lcdpr] falha ao persistir rascunho:", err);
  }

  // 3. Monta filename — TODO: trocar por CPF real quando clients.cpf existir
  const filename = `LCDPR_${safeFilenamePart(ctx.clientName)}_${year}.txt`;

  // 4. Download
  return new Response(txt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-LCDPR-Year": String(year),
      "X-LCDPR-Bytes": String(Buffer.byteLength(txt, "utf-8")),
    },
  });
}
