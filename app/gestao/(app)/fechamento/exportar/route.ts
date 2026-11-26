/**
 * Pacote do contador em CSV — contas e abastecimentos de um mês (mantido ao
 * lado da planilha .xlsx em ../pacote). GET ?mes=yyyy-mm · separador ";" ·
 * BOM UTF-8 · vírgula decimal · CPF/CNPJ e códigos sem perder zero.
 * Leitura pela sessão do usuário (RLS) e sempre filtrada pelo client_id do contexto.
 */
import { NextRequest } from "next/server";
import { contextoGestao } from "@/lib/gestao/contexto";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { hojeISO, limitesDoMes } from "@/lib/gestao/format";
import { mesDaQuery } from "@/lib/gestao/resultado";
import { carregarPacote } from "@/lib/gestao/exportar-leitura";
import { montarPacoteCsv } from "@/lib/gestao/pacote-contador";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const { supabase, clientId, clientName } = await contextoGestao();
  const hoje = hojeISO();
  const mes = mesDaQuery(new URL(req.url).searchParams.get("mes") ?? undefined, hoje);
  const voltar = (erro: string) =>
    Response.redirect(new URL(`/gestao/fechamento?mes=${mes.slice(0, 7)}&erro=${erro}`, req.url), 303);

  const r = await carregarPacote(supabase, clientId, limitesDoMes(mes));
  if (!r.ok) {
    if (r.motivo === "erro") console.error("[gestao/fechamento/exportar]", r.detalhe);
    return voltar(r.motivo === "ausente" ? "ativacao" : "pacote");
  }

  const csv = montarPacoteCsv({ ...r.dados, clientName, hoje, geradoEm: new Date() });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agraas-pacote-contador-${mes.slice(0, 7)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
