/**
 * LCDPR — Livro Caixa Digital do Produtor Rural
 *
 * Anexo "Atividade Rural" da Declaracao de IRPF (IN RFB 1.848/2018,
 * Lei 9.250/95 Art. 4). Obrigatorio para produtor pessoa fisica com receita
 * bruta anual da atividade rural acima do limite vigente.
 *
 * Exporta CSV no layout simplificado (cabecalho: data, historico, receita,
 * despesa, saldo_acumulado). Layout completo do bloco Q200/Q210 do PVA-LCDPR
 * sera implementado em endpoint dedicado quando contadores demandarem.
 *
 * Query param: ?year=2026 (default = ano atual)
 *
 * Seguranca: usa supabase-server (cookies), respeita RLS de accounting_entries
 * via view lcdpr_entries (SECURITY INVOKER) — so retorna lancamentos do tenant
 * logado.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type LcdprRow = {
  data: string;
  historico: string | null;
  receita: number | string;
  despesa: number | string;
  client_id: string;
};

function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // RFC 4180: aspas duplas envolvem se houver virgula, aspas ou newline
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtMoneyBR(n: number): string {
  // formato brasileiro: virgula decimal, sem separador de milhar (LCDPR-friendly)
  return n.toFixed(2).replace(".", ",");
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (Number.isNaN(year) || year < 2000 || year > 2100) {
    return new Response("year invalido", { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Nao autenticado", { status: 401 });

  // Periodo: ano civil completo
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  // Query view lcdpr_entries — RLS automatica via SECURITY INVOKER
  const { data, error } = await supabase
    .from("lcdpr_entries")
    .select("data, historico, receita, despesa, client_id")
    .gte("data", from)
    .lte("data", to)
    .order("data", { ascending: true });

  if (error) {
    return new Response(`Erro ao consultar lcdpr_entries: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []) as LcdprRow[];

  // Calcula saldo acumulado por ordem cronologica
  let saldo = 0;
  const lines: string[] = [];
  lines.push("data,historico,receita,despesa,saldo_acumulado");

  for (const r of rows) {
    const rec = typeof r.receita === "string" ? parseFloat(r.receita) : Number(r.receita ?? 0);
    const des = typeof r.despesa === "string" ? parseFloat(r.despesa) : Number(r.despesa ?? 0);
    saldo += rec - des;
    lines.push(
      [
        toCsvCell(r.data),
        toCsvCell(r.historico ?? ""),
        toCsvCell(fmtMoneyBR(rec)),
        toCsvCell(fmtMoneyBR(des)),
        toCsvCell(fmtMoneyBR(saldo)),
      ].join(","),
    );
  }

  const body = lines.join("\r\n") + "\r\n";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lcdpr_${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
