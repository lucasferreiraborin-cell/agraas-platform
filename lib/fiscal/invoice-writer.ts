/**
 * Escrita fiscal na tabela canônica (B0b).
 *
 * A migration 139 elegeu `fiscal_invoices` como canônica, mas o ETL foi
 * one-shot e nenhum código passou a escrever nela. Este módulo fecha esse
 * buraco, atrás da flag FISCAL_WRITE_MODE.
 *
 * As derivações são funções PURAS e testadas — o mapeamento de status e a
 * direção da operação são exatamente onde os dois schemas divergem, e é onde
 * um erro silencioso apareceria só no relatório do contador.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { type NfeItemFiscal, toInvoiceItemRow } from "@/lib/fiscal/nfe-parser";

// ---------------------------------------------------------------------------
// Derivações puras
// ---------------------------------------------------------------------------

/** Status do schema legado (PT). */
export type LegacyStatus = "pendente" | "validada" | "erro";
/** Status do schema canônico (EN). */
export type CanonicalStatus = "pending_review" | "reviewed" | "rejected" | "archived";

/**
 * Mapeia status legado → canônico.
 *
 * `erro` vira `rejected`, e não `archived`: no legado o status de erro marca
 * nota com alerta crítico, que precisa de revisão humana — não é arquivamento.
 */
export function mapLegacyStatus(status: string | null | undefined): CanonicalStatus {
  switch ((status ?? "").trim().toLowerCase()) {
    case "validada": return "reviewed";
    case "erro":     return "rejected";
    default:         return "pending_review";
  }
}

/**
 * Deriva entrada/saída pelo primeiro dígito do CFOP.
 *
 * CFOP 1/2/3 = entrada; 5/6/7 = saída. Mesma regra que o ETL da migration 139
 * usou, para que uma nota reprocessada não mude de direção e quebre a
 * conciliação. Sem nenhum item classificável, assume `entrada` — o caso
 * dominante no produtor rural (compra de insumo).
 */
export function deriveDirection(cfops: Array<string | null | undefined>): "entrada" | "saida" {
  for (const cfop of cfops) {
    const first = (cfop ?? "").trim().charAt(0);
    if (first === "5" || first === "6" || first === "7") return "saida";
  }
  return "entrada";
}

/**
 * Chave de acesso da nota.
 *
 * `fiscal_invoices.access_key` é NOT NULL UNIQUE. Quando o XML traz a chave
 * real de 44 dígitos, usamos ela. Sem ela (PDF, digitação), caímos no id da
 * nota — mesmo fallback do ETL da 139, o que mantém as duas tabelas alinhadas
 * por id e torna o job de consistência trivial.
 */
export function deriveAccessKey(chaveXml: string | null | undefined, noteId: string): string {
  const chave = (chaveXml ?? "").replace(/\D/g, "");
  return chave.length === 44 ? chave : noteId;
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

export type CanonicalInvoiceInput = {
  /** Mesmo id da linha legada — o ETL da 139 estabeleceu essa correspondência. */
  id: string;
  clientId: string;
  chaveAcesso: string | null;
  numero: string | null;
  serie: string | null;
  emitenteCnpj: string | null;
  emitenteNome: string | null;
  dataEmissao: string | null;
  valorTotal: number | null;
  legacyStatus: string;
  source: "xml_upload" | "pdf_upload" | "audio_dictation" | "csv_import" | "manual";
  rawXml: string | null;
  items: NfeItemFiscal[];
};

export type CanonicalWriteResult = {
  ok: boolean;
  invoiceId: string | null;
  itemsWritten: number;
  error?: string;
};

/**
 * Grava a nota e seus itens na tabela canônica.
 *
 * NUNCA lança. O chamador decide o que fazer com `ok: false` conforme o modo
 * de escrita — em 'dual' a falha é apenas registrada, porque a nota já está
 * salva no destino legado e o upload do produtor não pode quebrar.
 */
export async function writeCanonicalInvoice(
  db: SupabaseClient,
  input: CanonicalInvoiceInput,
): Promise<CanonicalWriteResult> {
  try {
    const { error: invErr } = await db.from("fiscal_invoices").insert({
      id:            input.id,
      client_id:     input.clientId,
      access_key:    deriveAccessKey(input.chaveAcesso, input.id),
      number:        input.numero,
      series:        input.serie,
      direction:     deriveDirection(input.items.map(i => i.cfop)),
      model:         "55",
      issued_at:     input.dataEmissao ? `${input.dataEmissao}T00:00:00Z` : null,
      issuer_cnpj:   input.emitenteCnpj,
      issuer_name:   input.emitenteNome,
      gross_value:   input.valorTotal,
      status:        mapLegacyStatus(input.legacyStatus),
      source:        input.source,
      raw_xml:       input.rawXml,
      // Toda nota entra precisando de revisão: o produtor não é o revisor
      // fiscal, e B1 só publica achado sobre nota conferida.
      needs_human_review: true,
    });

    if (invErr) {
      return { ok: false, invoiceId: null, itemsWritten: 0, error: `fiscal_invoices: ${invErr.message}` };
    }

    if (input.items.length === 0) {
      return { ok: true, invoiceId: input.id, itemsWritten: 0 };
    }

    const rows = input.items.map(it => toInvoiceItemRow(it, input.id, "live_parse"));
    const { error: itemsErr } = await db.from("fiscal_invoice_items").insert(rows);

    if (itemsErr) {
      return {
        ok: false,
        invoiceId: input.id,
        itemsWritten: 0,
        error: `fiscal_invoice_items: ${itemsErr.message}`,
      };
    }

    return { ok: true, invoiceId: input.id, itemsWritten: rows.length };
  } catch (err) {
    return {
      ok: false,
      invoiceId: null,
      itemsWritten: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Atualiza o status na canônica. Nunca lança — ver invariante do módulo. */
export async function updateCanonicalStatus(
  db: SupabaseClient,
  invoiceId: string,
  legacyStatus: string,
): Promise<CanonicalWriteResult> {
  try {
    const { error } = await db
      .from("fiscal_invoices")
      .update({ status: mapLegacyStatus(legacyStatus) })
      .eq("id", invoiceId);
    return error
      ? { ok: false, invoiceId, itemsWritten: 0, error: error.message }
      : { ok: true, invoiceId, itemsWritten: 0 };
  } catch (err) {
    return {
      ok: false, invoiceId, itemsWritten: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Remove a nota da canônica. Os itens caem por ON DELETE CASCADE.
 * Nunca lança — ver invariante do módulo.
 */
export async function deleteCanonicalInvoice(
  db: SupabaseClient,
  invoiceId: string,
): Promise<CanonicalWriteResult> {
  try {
    const { error } = await db.from("fiscal_invoices").delete().eq("id", invoiceId);
    return error
      ? { ok: false, invoiceId, itemsWritten: 0, error: error.message }
      : { ok: true, invoiceId, itemsWritten: 0 };
  } catch (err) {
    return {
      ok: false, invoiceId, itemsWritten: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Consistência entre os dois destinos
// ---------------------------------------------------------------------------

/**
 * Assinatura de uma nota a partir dos seus itens, para comparar os dois
 * destinos sem depender de ordem.
 *
 * Ordena as chaves antes de concatenar: o ETL da 139 gravou os itens em ordem
 * de UUID, então comparar por posição daria divergência falsa. Só entram
 * campos que existem nos DOIS schemas — comparar o que só a canônica tem
 * acusaria diferença em toda nota anterior ao B0.
 */
export function itemsFingerprint(
  items: Array<{ ncm?: unknown; cfop?: unknown; total?: unknown }>,
): string {
  const parts = items
    .map(i => {
      const n = (i.ncm ?? "").toString().trim();
      const c = (i.cfop ?? "").toString().trim();
      const t = i.total == null ? "" : Number(i.total).toFixed(2);
      return `${n}:${c}:${t}`;
    })
    .sort();

  let h = 5381;
  const joined = parts.join("|");
  for (let i = 0; i < joined.length; i++) h = ((h << 5) + h + joined.charCodeAt(i)) | 0;
  return `${parts.length}#${(h >>> 0).toString(36)}`;
}
