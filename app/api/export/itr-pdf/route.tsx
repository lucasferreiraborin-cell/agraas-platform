/**
 * B4 — rota que entrega o PDF de suporte à DITR.
 *
 * Estado em 08/09/2026: roda sobre o EXEMPLO_MOCK. É deliberado — o dado real
 * da FSJBE tem prazo 12/09 e o documento precisa estar pronto antes, para que
 * a chegada do dado seja troca de fonte e não construção. O prazo da DITR
 * (30/09) não perdoa três dias de desenvolvimento em cima da hora.
 *
 * Quando o dado chegar: trocar `EXEMPLO_MOCK` por uma leitura de
 * `properties` + série de rebanho, mantendo o mesmo `EntradaRelatorioITR`.
 *
 * Toda saída em modo mock carrega `[MOCK]` no nome da propriedade e o aviso de
 * NÃO PUBLICÁVEL na primeira página — o documento não pode ser confundido com
 * o real nem por engano.
 */

import { NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { montarRelatorioITR, EXEMPLO_MOCK } from "@/lib/fiscal/itr-report";
import { RelatorioITRPdf } from "@/lib/fiscal/itr-report-pdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  // Exige sessão. O documento traz dados de propriedade e rebanho.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  try {
    // TODO(12/09): substituir por leitura real quando o dado da FSJBE chegar.
    // O shape de entrada não muda — só a origem.
    const entrada = EXEMPLO_MOCK;
    const relatorio = montarRelatorioITR(entrada);

    const geradoEm = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const stream = await renderToStream(
      <RelatorioITRPdf r={relatorio} geradoEm={geradoEm} />,
    );

    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(chunk);
    const pdf = Buffer.concat(chunks);

    const nome = `DITR-${entrada.exercicio}-${entrada.propriedade.nome.replace(/[^\w-]+/g, "_")}.pdf`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}"`,
        // Documento preliminar não deve ser cacheado por proxy.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export/itr-pdf] falha:", err);
    return Response.json(
      { error: "Falha ao gerar o PDF", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
