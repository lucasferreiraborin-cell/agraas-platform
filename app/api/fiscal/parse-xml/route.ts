import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { z } from "zod";
import { parseNfeHeader, parseNfeItems, type NfeItemFiscal } from "@/lib/fiscal/nfe-parser";
import {
  writeCanonicalInvoice,
  updateCanonicalStatus,
} from "@/lib/fiscal/invoice-writer";
import { FISCAL_WRITE_MODE, FISCAL_WRITES_CANONICAL, FISCAL_WRITES_LEGACY } from "@/lib/feature-flags";

// ── Zod schema (formData fields after extraction) ─────────────────────────────
const FormDataSchema = z.object({
  farmId: z.string().uuid("farmId deve ser um UUID válido").optional(),
});

// ── Tipos internos ────────────────────────────────────────────────────────────

type ParsedHeader = {
  numeroNota:   string;
  serie:        string;
  emitenteCnpj: string;
  emitenteNome: string;
  dataEmissao:  string;
  valorTotal:   number;
  rawContent:   string;
  /** Chave de 44 dígitos quando veio de XML; vazia em PDF. Usada na canônica. */
  chaveAcesso:  string;
};

type ParsedItem = {
  descricao:     string;
  ncm:           string;
  cfop:          string;
  quantidade:    number;
  unidade:       string;
  valorUnitario: number;
  valorTotal:    number;
  icmsAliq:      number;
  icmsValor:     number;
  ipiValor:      number;
};

// ── Parser XML ────────────────────────────────────────────────────────────────

/**
 * Adaptador sobre `lib/fiscal/nfe-parser` (B0, 05/09/2026).
 *
 * O parser local anterior usava `<vICMS[^>]*>`, que casa com `<vICMSST>` e
 * `<vICMSMonoRet>` — numa nota com substituição tributária ou combustível, o
 * ICMS gravado vinha do campo errado, silenciosamente. O módulo compartilhado
 * exige fronteira de nome e é a mesma fonte usada pelo backfill.
 *
 * Nota: os campos novos do B0 (base, redução de base, desoneração, benefício e
 * monofasia) são extraídos aqui mas NÃO são persistidos nesta rota — o destino
 * de escrita ainda é `fiscal_note_items` (schema deprecado), que não tem essas
 * colunas. Ver B0b no relatório: enquanto a escrita não for redirecionada para
 * `fiscal_invoice_items`, só o backfill preenche os campos novos.
 */
function parseXml(xml: string): { header: ParsedHeader; items: ParsedItem[]; richItems: NfeItemFiscal[] } {
  const h = parseNfeHeader(xml);
  const richItems = parseNfeItems(xml);

  const header: ParsedHeader = {
    numeroNota:   h.numeroNota,
    serie:        h.serie,
    emitenteCnpj: h.emitenteCnpj,
    emitenteNome: h.emitenteNome,
    dataEmissao:  h.dataEmissao,
    valorTotal:   h.valorTotal ?? 0,
    rawContent:   xml,
    chaveAcesso:  h.chaveAcesso,
  };

  const items: ParsedItem[] = richItems.map((it) => ({
    descricao:     it.descricao,
    ncm:           it.ncm,
    cfop:          it.cfop,
    quantidade:    it.quantidade    ?? 0,
    unidade:       it.unidade,
    valorUnitario: it.valorUnitario ?? 0,
    valorTotal:    it.valorTotal    ?? 0,
    icmsAliq:      it.icmsAliquota  ?? 0,
    icmsValor:     it.icmsValor     ?? 0,
    ipiValor:      it.ipiValor      ?? 0,
  }));

  return { header, items, richItems };
}

// ── Parser PDF — leitura como texto bruto + regex ─────────────────────────────
// pdf-parse usa DOMMatrix (API de browser) que não existe no Node.js serverless.
// Alternativa: Buffer.toString('latin1') extrai texto embutido de PDFs simples.

function extractPdfText(buffer: Buffer): string {
  // Tenta extrair streams de texto do PDF em latin1
  const raw = buffer.toString("latin1");

  // Coleta conteúdo entre operadores BT/ET (Begin Text / End Text do PDF)
  const textBlocks: string[] = [];
  const btEt = /BT([\s\S]*?)ET/g;
  let m;
  while ((m = btEt.exec(raw)) !== null) {
    // Extrai strings entre parênteses dentro do bloco
    const strings = m[1].match(/\(([^)]*)\)/g) ?? [];
    const line = strings.map(s => s.slice(1, -1)).join(" ").trim();
    if (line) textBlocks.push(line);
  }
  return textBlocks.join("\n");
}

function parsePdfText(text: string, rawBuffer: Buffer): { header: ParsedHeader; items: ParsedItem[]; richItems: NfeItemFiscal[]; iaFailed: boolean } {
  // Regex para campos comuns de NF-e em PDF
  const cnpj    = text.match(/(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/)?.[1]?.replace(/\D/g, "") ?? "";
  const numero  = text.match(/N[º°ú]\s*[:\s]?\s*(\d{6,9})/i)?.[1] ?? "";
  const serie   = text.match(/[Ss][eé]rie\s*[:\s]?\s*(\d+)/i)?.[1] ?? "";
  const data    = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1]
                    ?.split("/").reverse().join("-") ?? "";
  const valor   = parseFloat(
    text.match(/[Vv]alor\s*[Tt]otal\s*[:\s]?\s*R?\$?\s*([\d.,]+)/)?.[1]
      ?.replace(/\./g, "").replace(",", ".") ?? "0"
  );

  // Nome do emitente: primeira linha longa antes do CNPJ
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const cnpjIdx = lines.findIndex(l => l.replace(/\D/g, "").includes(cnpj.slice(0, 8)));
  const nome = cnpjIdx > 0 ? lines[cnpjIdx - 1] : "";

  const iaFailed = !numero && !cnpj && !valor;

  return {
    header: {
      numeroNota:   numero || "PDF importado",
      serie:        serie  || "-",
      emitenteCnpj: cnpj,
      emitenteNome: nome,
      dataEmissao:  data,
      valorTotal:   valor,
      rawContent:   rawBuffer.toString("base64").slice(0, 500) + "…[PDF]",
      // PDF não carrega a chave de acesso: a canônica cai no id da nota.
      chaveAcesso:  "",
    },
    items: [],
    richItems: [],
    iaFailed,
  };
}

// ── Save ao banco + geração de alertas ───────────────────────────────────────

async function saveNote(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  clientId: string,
  header: ParsedHeader,
  items: ParsedItem[],
  richItems: NfeItemFiscal[],
  source: "xml_upload" | "pdf_upload",
  iaFailed = false,
) {
  // O id e gerado aqui, nao pelo banco: as duas tabelas compartilham a mesma
  // chave (correspondencia estabelecida pelo ETL da migration 139), e em modo
  // 'canonical' nao existe insert legado de onde ler o id devolvido.
  const noteId = crypto.randomUUID();

  if (FISCAL_WRITES_LEGACY) {
    const { error: noteError } = await supabase
    .from("fiscal_notes")
    .insert({
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
    if (noteError) throw new Error("Erro ao salvar nota: " + noteError.message);
  }

  const alerts: { note_id: string; client_id: string; tipo: string; descricao: string; severidade: string }[] = [];

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
  if (header.valorTotal > 0 && Math.abs(header.valorTotal - somaItens) > 0.02) {
    alerts.push({ note_id: noteId, client_id: clientId, tipo: "valor_divergente",
      descricao: `Valor da nota (R$${header.valorTotal.toFixed(2)}) difere da soma dos itens (R$${somaItens.toFixed(2)}).`,
      severidade: "aviso" });
  }

  if (iaFailed) {
    alerts.push({
      note_id: noteId, client_id: clientId,
      tipo: "pdf_revisao_manual",
      descricao: "PDF importado sem extração completa dos dados. Verifique e preencha os campos manualmente.",
      severidade: "aviso",
    });
  }

  const hasCritical = alerts.some(a => a.severidade === "critico");
  let canonicalOk: boolean | null = null;

  // ── Destino legado ────────────────────────────────────────────────────────
  // Os alertas em PT casam com fiscal_notes_alerts_legacy. A fiscal_alerts vive
  // no schema EN da migration 133 (fiscal_invoice_id/alert_type/severity) e
  // rejeita esse shape — colisao de nome entre 028 e 133, tratada no B0c.
  if (FISCAL_WRITES_LEGACY) {
    const [itemsRes, alertsRes] = await Promise.all([
      dbItems.length > 0 ? supabase.from("fiscal_note_items").insert(dbItems) : Promise.resolve({ error: null }),
      alerts.length  > 0 ? supabase.from("fiscal_notes_alerts_legacy").insert(alerts) : Promise.resolve({ error: null }),
    ]);
    if (itemsRes.error) console.error("[fiscal/parse-xml] falha ao salvar itens:", itemsRes.error.message);
    if (alertsRes.error) console.error("[fiscal/parse-xml] falha ao salvar alertas:", alertsRes.error.message);
    if (hasCritical) await supabase.from("fiscal_notes").update({ status: "erro" }).eq("id", noteId);
  }

  // ── Destino canonico ──────────────────────────────────────────────────────
  // Invariante do B0b: em 'dual' a falha aqui e registrada e NAO propaga — a
  // nota ja esta salva no legado e o upload do produtor nao pode quebrar por
  // causa da migracao de schema. Em 'canonical' propaga, porque nao ha outro
  // destino e uma falha silenciosa perderia a nota.
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
      console.error("[fiscal/parse-xml] escrita canonica falhou:", res.error);
      if (FISCAL_WRITE_MODE === "canonical") {
        throw new Error("Erro ao salvar nota (canonica): " + res.error);
      }
    } else if (hasCritical) {
      const up = await updateCanonicalStatus(supabase, noteId, "erro");
      if (!up.ok) console.error("[fiscal/parse-xml] status canonico:", up.error);
    }
  }

  return { noteId, alerts, hasCritical, canonicalOk };
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();

    // Auth + formData em paralelo
    const [{ data: { user } }, formData] = await Promise.all([
      supabase.auth.getUser(),
      req.formData(),
    ]);
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const file = formData.get("xml") as File | null;
    if (!file) return Response.json({ error: "Arquivo não enviado. Envie o campo 'xml' como File." }, { status: 400 });

    const fieldsParsed = FormDataSchema.safeParse({ farmId: formData.get("farm_id") ?? undefined });
    if (!fieldsParsed.success) return Response.json({ error: fieldsParsed.error.issues[0].message }, { status: 400 });

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isXml = file.name.toLowerCase().endsWith(".xml");
    if (!isPdf && !isXml) {
      return Response.json({ error: "Formato não suportado. Envie .xml ou .pdf" }, { status: 400 });
    }

    const [clientResult, parsed] = await Promise.all([
      supabase.from("clients").select("id").eq("auth_user_id", user.id).single(),
      isPdf
        ? file.arrayBuffer().then(buf => {
            const buffer = Buffer.from(buf);
            const text   = extractPdfText(buffer);
            return parsePdfText(text, buffer);
          })
        : file.text().then(xml => parseXml(xml)),
    ]);

    const clientData = clientResult.data;
    if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    const { header, items, richItems, iaFailed } = parsed as {
      header: ParsedHeader; items: ParsedItem[]; richItems: NfeItemFiscal[]; iaFailed?: boolean;
    };

    const { noteId, alerts, hasCritical, canonicalOk } = await saveNote(
      supabase, clientData.id, header, items, richItems,
      isPdf ? "pdf_upload" : "xml_upload", iaFailed ?? false,
    );

    return Response.json({
      note_id:      noteId,
      numero_nota:  header.numeroNota,
      total_items:  items.length,
      alerts_count: alerts.length,
      status:       hasCritical ? "erro" : "pendente",
      write_mode:   FISCAL_WRITE_MODE,
      canonical_ok: canonicalOk,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
