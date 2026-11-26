/**
 * "Seus dados são seus" — GET devolve um .zip com tudo o que a conta registrou
 * no Gestão: um CSV por tabela, os XML das notas e um LEIAME.txt explicando
 * cada coluna (ver lib/gestao/meus-dados.ts). Não depende de mês.
 * Leitura pela sessão do usuário (RLS) e sempre filtrada pelo client_id do contexto.
 */
import { NextRequest } from "next/server";
import { contextoGestao } from "@/lib/gestao/contexto";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { hojeISO } from "@/lib/gestao/format";
import { carregarMeusDados } from "@/lib/gestao/exportar-leitura";
import { montarMeusDados } from "@/lib/gestao/meus-dados";
import { gerarZip } from "@/lib/planilha/zip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Export completo é a leitura mais pesada do portal: poucas por minuto bastam.
  const rl = checkRateLimit(req, 6, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const { supabase, clientId, clientName } = await contextoGestao();
  const voltar = () => Response.redirect(new URL("/gestao/fechamento?erro=dados", req.url), 303);

  const r = await carregarMeusDados(supabase, clientId);
  if (!r.ok) {
    console.error("[gestao/fechamento/meus-dados]", r.detalhe);
    return voltar();
  }

  try {
    const geradoEm = new Date();
    const zip = gerarZip(montarMeusDados({ ...r.dados, clientName, geradoEm }), geradoEm);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="agraas-meus-dados-${hojeISO(geradoEm)}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[gestao/fechamento/meus-dados] montagem:", e instanceof Error ? e.message : e);
    return voltar();
  }
}
