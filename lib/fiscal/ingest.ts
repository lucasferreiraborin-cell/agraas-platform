/**
 * Ingestão de NF-e — a parte que TOCA o banco e o request.
 *
 * Um único `saveNote` para todos os caminhos (XML, PDF, planilha), um único
 * handler HTTP reutilizado por /api/fiscal/parse-xml e pelas rotas da
 * controladoria. Antes disso, cada rota tinha sua cópia do parser — e foi
 * assim que o PDF quebrou numa e não na outra (11/09/2026).
 *
 * Escrita dupla legado+canônica atrás de FISCAL_WRITE_MODE (B0b). Em 'dual'
 * a falha canônica é registrada e NÃO propaga; em 'canonical' propaga.
 */

import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { writeCanonicalInvoice, updateCanonicalStatus } from "@/lib/fiscal/invoice-writer";
import { writeCanonicalAlerts } from "@/lib/fiscal/alert-writer";
import { FISCAL_WRITE_MODE, FISCAL_WRITES_CANONICAL, FISCAL_WRITES_LEGACY } from "@/lib/feature-flags";
import {
  parseXml, parsePdf, tipoDoArquivo, mensagemUpload,
  type NotaParseada, type FonteNota,
} from "@/lib/fiscal/nota-parse";

type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AlertaNota = { note_id: string; client_id: string; tipo: string; descricao: string; severidade: string };

export type ResultadoSave = { noteId: string; alerts: AlertaNota[]; hasCritical: boolean; canonicalOk: boolean | null };

/** Grava a nota (legado e/ou canônico) e gera os alertas estruturais. */
export async function saveNote(
  supabase: Db,
  clientId: string,
  nota: NotaParseada,
  source: FonteNota,
): Promise<ResultadoSave> {
  const { header, items, richItems, iaFailed = false, iaMotivo } = nota;

  // O id é gerado aqui, não pelo banco: as duas tabelas compartilham a mesma
  // chave (correspondência estabelecida pelo ETL da migration 139), e em modo
  // 'canonical' não existe insert legado de onde ler o id devolvido.
  const noteId = randomUUID();

  if (FISCAL_WRITES_LEGACY) {
    const { error: noteError } = await supabase.from("fiscal_notes").insert({
      id:            noteId,
      client_id:     clientId,
      xml_content:   header.rawContent,
      numero_nota:   header.numeroNota || "S/N",
      serie:         header.serie      || "-",
      emitente_cnpj: header.emitenteCnpj,
      emitente_nome: header.emitenteNome,
      data_emissao:  header.dataEmissao || null,
      valor_total:   header.valorTotal  || null,
      status:        "pendente",
    });
    if (noteError) {
      throw new Error(`Erro ao salvar nota [legado, modo=${FISCAL_WRITE_MODE}]: ${noteError.message}`);
    }
  }

  const alerts: AlertaNota[] = [];

  const dbItems = items.map((it) => {
    if (!/^\d{8}$/.test(it.ncm)) {
      alerts.push({ note_id: noteId, client_id: clientId, tipo: "ncm_incorreto",
        descricao: `Item "${it.descricao}": NCM "${it.ncm}" deve ter 8 dígitos numéricos.`, severidade: "critico" });
    }
    if (it.cfop && !/^[1-37]/.test(it.cfop)) {
      alerts.push({ note_id: noteId, client_id: clientId, tipo: "cfop_divergente",
        descricao: `Item "${it.descricao}": CFOP "${it.cfop}" não é válido para operação fiscal.`, severidade: "critico" });
    }
    if (!it.descricao) {
      alerts.push({ note_id: noteId, client_id: clientId, tipo: "item_incompleto",
        descricao: "Item sem descrição encontrado na nota.", severidade: "info" });
    }
    return {
      note_id: noteId, client_id: clientId,
      descricao: it.descricao, ncm: it.ncm, cfop: it.cfop,
      quantidade: it.quantidade, unidade: it.unidade,
      valor_unitario: it.valorUnitario, valor_total: it.valorTotal,
      icms_aliquota: it.icmsAliq, icms_valor: it.icmsValor, ipi_valor: it.ipiValor,
    };
  });

  const somaItens = items.reduce((s, i) => s + i.valorTotal, 0);
  if (header.valorTotal > 0 && items.length > 0 && Math.abs(header.valorTotal - somaItens) > 0.02) {
    alerts.push({ note_id: noteId, client_id: clientId, tipo: "valor_divergente",
      descricao: `Valor da nota (R$${header.valorTotal.toFixed(2)}) difere da soma dos itens (R$${somaItens.toFixed(2)}).`,
      severidade: "aviso" });
  }

  if (iaFailed) {
    alerts.push({
      note_id: noteId, client_id: clientId,
      tipo: "pdf_revisao_manual",
      descricao: iaMotivo
        ? `PDF importado com extração parcial (${iaMotivo}). Confira os campos antes de usar a nota.`
        : "PDF importado sem extração completa dos dados. Verifique e preencha os campos manualmente.",
      severidade: "aviso",
    });
  }

  const hasCritical = alerts.some(a => a.severidade === "critico");
  let canonicalOk: boolean | null = null;

  // ── Destino legado ────────────────────────────────────────────────────────
  // Os alertas em PT casam com fiscal_notes_alerts_legacy. A fiscal_alerts vive
  // no schema EN da migration 133 e rejeita esse shape — tratado no B0c.
  if (FISCAL_WRITES_LEGACY) {
    const [itemsRes, alertsRes] = await Promise.all([
      dbItems.length > 0 ? supabase.from("fiscal_note_items").insert(dbItems) : Promise.resolve({ error: null }),
      alerts.length  > 0 ? supabase.from("fiscal_notes_alerts_legacy").insert(alerts) : Promise.resolve({ error: null }),
    ]);
    if (itemsRes.error) console.error("[fiscal/ingest] falha ao salvar itens:", itemsRes.error.message);
    if (alertsRes.error) console.error("[fiscal/ingest] falha ao salvar alertas:", alertsRes.error.message);
    if (hasCritical) await supabase.from("fiscal_notes").update({ status: "erro" }).eq("id", noteId);
  }

  // ── Destino canônico ──────────────────────────────────────────────────────
  if (FISCAL_WRITES_CANONICAL) {
    const res = await writeCanonicalInvoice(supabase, {
      id:           noteId,
      clientId,
      chaveAcesso:  header.chaveAcesso || null,
      numero:       header.numeroNota || null,
      serie:        header.serie || null,
      emitenteCnpj: header.emitenteCnpj || null,
      emitenteNome: header.emitenteNome || null,
      dataEmissao:  header.dataEmissao || null,
      valorTotal:   header.valorTotal || null,
      legacyStatus: hasCritical ? "erro" : "pendente",
      source,
      rawXml:       source === "xml_upload" ? header.rawContent : null,
      items:        richItems,
    });

    canonicalOk = res.ok;
    if (!res.ok) {
      console.error("[fiscal/ingest] escrita canônica falhou:", res.error);
      if (FISCAL_WRITE_MODE === "canonical") {
        throw new Error(
          `Erro ao salvar nota [canonica, modo=${FISCAL_WRITE_MODE}]: ${res.error}. ` +
          "Se a migration 159 ainda não foi aplicada, FISCAL_WRITE_MODE não pode ser 'canonical'.",
        );
      }
    } else {
      if (hasCritical) {
        const up = await updateCanonicalStatus(supabase, noteId, "erro");
        if (!up.ok) console.error("[fiscal/ingest] status canônico:", up.error);
      }
      const al = await writeCanonicalAlerts(supabase, alerts, res.ok);
      if (!al.ok) console.error("[fiscal/ingest] alertas canônicos:", al.error);
    }
  }

  return { noteId, alerts, hasCritical, canonicalOk };
}

// ── Handler HTTP compartilhado (XML e PDF) ────────────────────────────────────

/** Resolve o cliente do usuário logado. */
export async function clienteDoUsuario(supabase: Db): Promise<{ userId: string; clientId: string } | Response> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { data } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
  if (!data) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
  return { userId: user.id, clientId: data.id };
}

/** O arquivo pode vir como `file` (modal da controladoria) ou `xml` (FiscalUpload, DocumentGate). */
export function arquivoDoForm(formData: FormData): File | null {
  const f = formData.get("file") ?? formData.get("xml");
  return f instanceof File ? f : null;
}

/**
 * POST multipart com um XML ou PDF de NF-e → nota gravada.
 * Usado por /api/fiscal/parse-xml e /api/controladoria/notas/upload-{xml,pdf}.
 */
export async function handleNfeUpload(req: NextRequest): Promise<Response> {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const [quem, formData] = await Promise.all([clienteDoUsuario(supabase), req.formData()]);
    if (quem instanceof Response) return quem;

    const file = arquivoDoForm(formData);
    if (!file) return Response.json({ error: "Arquivo não enviado. Envie o campo 'file' (ou 'xml') como File." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const tipo = tipoDoArquivo(file.name, buffer);
    if (tipo !== "xml" && tipo !== "pdf") {
      return Response.json({
        error: tipo === "csv" || tipo === "xlsx"
          ? "Planilha vai em /api/controladoria/notas/upload-csv (modo 'CSV em lote' no modal)."
          : "Formato não suportado. Envie .xml ou .pdf",
      }, { status: 400 });
    }

    const nota = tipo === "pdf" ? await parsePdf(buffer) : parseXml(buffer.toString("utf8"));
    const source: FonteNota = tipo === "pdf" ? "pdf_upload" : "xml_upload";
    const { noteId, alerts, hasCritical, canonicalOk } = await saveNote(supabase, quem.clientId, nota, source);

    const resumo = {
      numero_nota:  nota.header.numeroNota,
      total_items:  nota.items.length,
      alerts_count: alerts.length,
      extracao:     nota.extracao.origem,
      extracao_modelo: nota.extracao.modelo ?? null,
      extracao_motivo: nota.extracao.motivo ?? null,
    };

    return Response.json({
      note_id:      noteId,
      ...resumo,
      status:       hasCritical ? "erro" : "pendente",
      write_mode:   FISCAL_WRITE_MODE,
      canonical_ok: canonicalOk,
      message:      mensagemUpload(resumo),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
