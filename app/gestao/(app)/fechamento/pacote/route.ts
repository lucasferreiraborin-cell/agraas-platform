/**
 * Pacote do contador em planilha (.xlsx) — GET ?mes=yyyy-mm.
 * Abas: Resumo · Títulos pagos e recebidos · Em aberto · Notas do mês ·
 * Diesel e máquinas (ver lib/gestao/pacote-contador.ts). Totais com fórmula.
 * Leitura pela sessão do usuário (RLS) e sempre filtrada pelo client_id do contexto.
 */
import { NextRequest } from "next/server";
import { contextoGestao } from "@/lib/gestao/contexto";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { hojeISO, limitesDoMes, mesPorExtenso } from "@/lib/gestao/format";
import { mesDaQuery } from "@/lib/gestao/resultado";
import { carregarPacote } from "@/lib/gestao/exportar-leitura";
import { montarPacoteXlsx } from "@/lib/gestao/pacote-contador";
import { XLSX_MIME, gerarXlsx } from "@/lib/planilha/xlsx-writer";

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
    if (r.motivo === "erro") console.error("[gestao/fechamento/pacote]", r.detalhe);
    return voltar(r.motivo === "ausente" ? "ativacao" : "pacote");
  }

  try {
    const geradoEm = new Date();
    const planilha = gerarXlsx(montarPacoteXlsx({ ...r.dados, clientName, hoje, geradoEm }), {
      titulo: `Pacote do contador — ${clientName} — ${mesPorExtenso(mes)}`,
      autor: "Agraas Gestão",
      criadoEm: geradoEm,
    });
    return new Response(new Uint8Array(planilha), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="agraas-fechamento-${mes.slice(0, 7)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[gestao/fechamento/pacote] montagem:", e instanceof Error ? e.message : e);
    return voltar("pacote");
  }
}
