/**
 * POST /api/parse-doc — lê um XML ou PDF de NF-e e devolve os campos para o
 * formulário (DocumentGate em abates, vendas, estoque/novo, timeline).
 * NÃO grava nota; quem grava é a tela, depois da revisão do usuário.
 *
 * Reescrita em 14/09/2026 sobre lib/fiscal/documento.ts: o parser local de
 * regex (`<det[\s\S]*?>` casava `<detPag>`; PDF só lia stream sem compressão)
 * foi substituído pelos mesmos módulos do upload fiscal.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { extrairNfeDePdf } from "@/lib/fiscal/pdf-extract";
import { tipoDoArquivo } from "@/lib/fiscal/nota-parse";
import { documentoDeXml, documentoDeExtracao, documentoVazio, type ParseDocResponse } from "@/lib/fiscal/documento";

export type { ParsedDocHeader, ParsedDocItem, ParseDocResponse } from "@/lib/fiscal/documento";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 30, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: { user } }, formData] = await Promise.all([supabase.auth.getUser(), req.formData()]);
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const f = formData.get("xml") ?? formData.get("file");
    if (!(f instanceof File)) return Response.json({ error: "Arquivo não enviado" }, { status: 400 });

    const bytes = Buffer.from(await f.arrayBuffer());
    const tipo = tipoDoArquivo(f.name, bytes);
    if (tipo !== "xml" && tipo !== "pdf") {
      return Response.json({ error: "Formato não suportado. Envie .xml ou .pdf" }, { status: 400 });
    }

    let result: ParseDocResponse;
    if (tipo === "xml") {
      result = documentoDeXml(bytes.toString("utf8"));
    } else {
      const ia = await extrairNfeDePdf(bytes);
      result = ia.origem === "claude" ? documentoDeExtracao(ia.dados, ia.modelo) : documentoVazio(ia.motivo);
    }
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
