/**
 * POST /api/controladoria/notas/upload-imagem — FOTO do DANFE tirada no
 * celular (portal Gestão, 24/11/2026). Irmã de upload-pdf: mesma IA
 * (lib/fiscal/pdf-extract.ts, bloco de imagem), mesmo `saveNote`, mesmo
 * formato de resposta.
 *
 * Diferenças deliberadas:
 *  - Foto ilegível ou que não é nota → 422 e NADA é gravado (a foto não tem
 *    varredura de reserva; nota casca com R$ 0,00 seria erro silencioso).
 *  - HEIC/HEIF → 415 com instrução clara (a API não lê esse formato; o portal
 *    converte para JPEG no aparelho quando o navegador sabe ler).
 *  - Títulos: duplicatas lidas viram títulos "aberto"; sem duplicatas, um
 *    título "a conferir" só se houver valor total e data
 *    (lib/gestao/titulos-foto.ts).
 *  - A nota entra com source 'pdf_upload' na canônica: o CHECK de
 *    fiscal_invoices.source não tem valor para foto, e mudar isso pede
 *    migration própria. O legado guarda a marca "[FOTO …]" em xml_content.
 */

import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { arquivoDoForm, clienteDoUsuario, NotaDuplicadaError, saveNote, type ResultadoSave } from "@/lib/fiscal/ingest";
import { extrairNfeDeImagem, LIMITE_IMAGEM_BYTES } from "@/lib/fiscal/pdf-extract";
import { avaliarLeituraFoto, formatoDaImagem, notaDeFoto } from "@/lib/fiscal/nota-foto";
import { mensagemUpload } from "@/lib/fiscal/nota-parse";
import { gravarTitulosDaFoto, planejarTitulosDaFoto } from "@/lib/gestao/titulos-foto";
import { FISCAL_WRITE_MODE, FISCAL_WRITES_LEGACY } from "@/lib/feature-flags";

export const runtime = "nodejs";
// A leitura da foto tem 50 s de teto no SDK; sobram ~10 s para gravar.
export const maxDuration = 60;

const MB = 1024 * 1024;
const LIMITE_MB_TEXTO = (LIMITE_IMAGEM_BYTES / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const MSG_HEIC =
  "Foto em HEIC (formato do iPhone) não é aceita. Use o botão \"Tirar foto da nota\" nesta tela, "
  + "ou no iPhone ajuste Câmera > Formatos > Mais Compatível e envie de novo.";

const erro = (status: number, mensagem: string, extra: Record<string, unknown> = {}) =>
  Response.json({ error: mensagem, ...extra }, { status });

export async function POST(req: NextRequest): Promise<Response> {
  // Mais baixo que o XML/PDF (20/min): cada foto custa uma chamada de visão.
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    // Auth ANTES de ler o corpo: sem sessão, 401 (e não 500 de multipart).
    const quem = await clienteDoUsuario(supabase);
    if (quem instanceof Response) return quem;

    // Barra corpo gigante antes de ler (folga para o envelope multipart).
    const declarado = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declarado) && declarado > LIMITE_IMAGEM_BYTES + 256 * 1024) {
      return erro(413, `Foto acima de ${LIMITE_MB_TEXTO} MB. Tire de novo pelo botão da tela, que reduz a foto antes de enviar.`);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return erro(400, "Corpo da requisição não é multipart/form-data válido.");
    }

    const file = arquivoDoForm(formData);
    if (!file) return erro(400, "Foto não enviada. Envie o campo 'file' com a imagem.");
    if (file.size === 0) return erro(400, "A foto chegou vazia. Tire de novo.");
    if (file.size > LIMITE_IMAGEM_BYTES) {
      return erro(413, `Foto acima de ${LIMITE_MB_TEXTO} MB. Tire de novo pelo botão da tela, que reduz a foto antes de enviar.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const formato = formatoDaImagem(buffer);
    if (formato === "heic") return erro(415, MSG_HEIC, { formato: "heic" });
    if (formato === null || formato === "avif") {
      return erro(415, "Formato de imagem não aceito. Envie a foto em JPG ou PNG (ou o XML/PDF da nota).");
    }

    const ia = await extrairNfeDeImagem(buffer, formato);
    if (ia.origem === "fallback") {
      console.warn("[upload-imagem] leitura por IA indisponível:", ia.motivo);
      return erro(422, "Não foi possível ler a foto agora. Nada foi gravado. Tente de novo em instantes ou envie o XML ou o PDF da nota.", {
        motivo: ia.motivo,
      });
    }

    const leitura = avaliarLeituraFoto(ia.dados);
    if (!leitura.ok) return erro(422, leitura.mensagem, { motivo: leitura.motivo });

    const nota = notaDeFoto(ia.dados, buffer, ia.modelo, formato);

    let salvo: ResultadoSave;
    try {
      salvo = await saveNote(supabase, quem.clientId, nota, "pdf_upload");
    } catch (e) {
      if (e instanceof NotaDuplicadaError) {
        return erro(409, e.message, { duplicada: true, chave_acesso: e.chaveAcesso });
      }
      throw e;
    }
    const { noteId, alerts, hasCritical, canonicalOk, alertasGravados } = salvo;

    // Nota → títulos. Nunca afeta o upload: planejar é puro, gravar não lança,
    // e o try/catch cobre o resto. Sem a migration 172 → 'tabela_ausente'.
    let titulosGerados: number | null = null;
    let titulosModo: "duplicatas" | "a_conferir" | "nenhum" = "nenhum";
    try {
      const plano = planejarTitulosDaFoto({
        clientId:        quem.clientId,
        fiscalNoteId:    FISCAL_WRITES_LEGACY ? noteId : null,
        fiscalInvoiceId: canonicalOk === true ? noteId : null,
        numeroNota:      nota.header.numeroNota,
        dataEmissao:     nota.header.dataEmissao,
        valorTotal:      nota.header.valorTotal > 0 ? nota.header.valorTotal : null,
        emitente:        { nome: nota.header.emitenteNome, doc: nota.header.emitenteCnpj },
        destinatario:    { nome: nota.header.destinatarioNome, doc: nota.header.destinatarioCnpj },
        tipoOperacao:    ia.dados.tipo_operacao,
        duplicatas:      ia.dados.duplicatas,
        ncms:            nota.items.map((i) => i.ncm).filter(Boolean),
      });
      const r = await gravarTitulosDaFoto(supabase, plano.linhas);
      if (r.ok) {
        titulosGerados = r.inseridos;
        titulosModo = r.inseridos > 0 ? plano.modo : "nenhum";
      } else if (r.motivo === "erro") {
        console.error("[upload-imagem] títulos da foto:", r.detalhe);
      }
    } catch (e) {
      console.error("[upload-imagem] títulos da foto:", e instanceof Error ? e.message : String(e));
    }

    const resumo = {
      numero_nota:     nota.header.numeroNota,
      total_items:     nota.items.length,
      alerts_count:    alerts.length,
      extracao:        nota.extracao.origem,
      extracao_modelo: nota.extracao.modelo ?? null,
      extracao_motivo: nota.extracao.motivo ?? null,
    };
    const sufixoTitulos =
      titulosModo === "a_conferir" ? " · 1 título a conferir no financeiro"
      : titulosModo === "duplicatas" && titulosGerados ? ` · ${titulosGerados} ${titulosGerados === 1 ? "título" : "títulos"} no financeiro`
      : "";

    return Response.json({
      note_id:          noteId,
      ...resumo,
      status:           hasCritical ? "erro" : "pendente",
      write_mode:       FISCAL_WRITE_MODE,
      canonical_ok:     canonicalOk,
      alertas_gravados: alertasGravados,
      titulos_gerados:  titulosGerados,
      titulos_modo:     titulosModo,
      confianca:        ia.dados.confianca,
      message:          mensagemUpload(resumo) + sufixoTitulos + (alertasGravados ? "" : " · atenção: alertas não gravados"),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return erro(500, msg);
  }
}
