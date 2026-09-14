/**
 * /api/controladoria/notas/upload-csv — modo "CSV em lote" do modal.
 *
 *   GET  ?modelo=1  → baixa o modelo (CSV com `;`, BOM, uma linha por item)
 *   POST multipart  → lê .csv ou .xlsx (primeira planilha), agrupa em notas,
 *                     grava cada uma pelo mesmo saveNote do XML/PDF e devolve
 *                     o que entrou, o que foi rejeitado linha a linha e as
 *                     colunas que não foram reconhecidas.
 *
 * Nenhuma linha é "corrigida" em silêncio: coluna não reconhecida é
 * reportada, número ambíguo segue a premissa documentada em notas-planilha.ts.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { parseCsv } from "@/lib/planilha/csv";
import { lerXlsx, ehXlsx } from "@/lib/planilha/xlsx";
import { interpretarPlanilha, modeloCsv } from "@/lib/fiscal/notas-planilha";
import { saveNote, clienteDoUsuario, arquivoDoForm } from "@/lib/fiscal/ingest";
import { FISCAL_WRITE_MODE } from "@/lib/feature-flags";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  if (req.nextUrl.searchParams.get("modelo") === null) {
    return Response.json({ uso: "GET ?modelo=1 baixa o modelo; POST multipart com o campo 'file' envia a planilha." });
  }
  return new Response(modeloCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-notas-agraas.csv"',
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const [quem, formData] = await Promise.all([clienteDoUsuario(supabase), req.formData()]);
    if (quem instanceof Response) return quem;

    const file = arquivoDoForm(formData);
    if (!file) return Response.json({ error: "Arquivo não enviado. Envie o campo 'file' como File." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Planilha acima de 5 MB. Divida o arquivo." }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const nome = file.name.toLowerCase();
    let tabela;
    try {
      tabela = ehXlsx(bytes) ? lerXlsx(bytes) : parseCsv(bytes);
    } catch (e) {
      return Response.json({ error: `Não consegui ler a planilha: ${e instanceof Error ? e.message : String(e)}` }, { status: 400 });
    }
    if (!ehXlsx(bytes) && (nome.endsWith(".xlsx") || nome.endsWith(".xls"))) {
      return Response.json({ error: "O arquivo tem extensão de Excel mas não é um .xlsx válido. Salve como .xlsx ou exporte CSV." }, { status: 400 });
    }

    const lido = interpretarPlanilha(tabela);
    if (lido.notas.length === 0) {
      return Response.json({
        error: lido.erros[0]?.mensagem ?? "Nenhuma nota válida na planilha.",
        erros: lido.erros,
        colunas_mapeadas: lido.colunasMapeadas,
        colunas_faltando: lido.colunasFaltando,
        colunas_nao_reconhecidas: lido.colunasNaoReconhecidas,
        linhas_lidas: lido.linhasLidas,
      }, { status: 400 });
    }

    const gravadas: Array<{ note_id: string; numero_nota: string; itens: number; alertas: number; status: string }> = [];
    const falhas: Array<{ numero_nota: string; erro: string }> = [];
    let totalItens = 0, totalAlertas = 0;

    // Sequencial de propósito: um erro de banco no meio do lote precisa ser
    // atribuível à nota certa, e a rota tem 60 s para no máximo 200 notas.
    for (const nota of lido.notas) {
      try {
        const r = await saveNote(supabase, quem.clientId, nota, "csv_import");
        gravadas.push({ note_id: r.noteId, numero_nota: nota.header.numeroNota, itens: nota.items.length, alertas: r.alerts.length, status: r.hasCritical ? "erro" : "pendente" });
        totalItens += nota.items.length;
        totalAlertas += r.alerts.length;
      } catch (e) {
        falhas.push({ numero_nota: nota.header.numeroNota, erro: e instanceof Error ? e.message : String(e) });
      }
    }

    const partes = [
      `${gravadas.length} ${gravadas.length === 1 ? "nota gravada" : "notas gravadas"}`,
      `${totalItens} itens`,
      `${totalAlertas} alertas`,
    ];
    if (falhas.length) partes.push(`${falhas.length} não gravadas`);
    if (lido.erros.length) partes.push(`${lido.erros.length} linhas rejeitadas`);
    if (lido.colunasNaoReconhecidas.length) partes.push(`colunas ignoradas: ${lido.colunasNaoReconhecidas.join(", ")}`);

    return Response.json({
      message: partes.join(" · "),
      notas_gravadas: gravadas,
      falhas,
      erros: lido.erros,
      colunas_mapeadas: lido.colunasMapeadas,
      colunas_nao_reconhecidas: lido.colunasNaoReconhecidas,
      linhas_lidas: lido.linhasLidas,
      formato: tabela.separador === "xlsx" ? "xlsx" : `csv (${tabela.separador === ";" ? "ponto e vírgula" : tabela.separador === "," ? "vírgula" : "tab"}, ${tabela.codificacao})`,
      write_mode: FISCAL_WRITE_MODE,
    }, { status: falhas.length > 0 && gravadas.length === 0 ? 500 : 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
