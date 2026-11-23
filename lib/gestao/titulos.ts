/**
 * Nota → contas a pagar/receber (portal Gestão, 23/11/2026).
 *
 * Grava em `titulos_financeiros` (migration 172) uma linha por parcela da
 * NF-e, com origem 'nfe'. Regras de casa:
 * - NUNCA lança: quem chama é a importação da nota, que não pode quebrar por
 *   causa do financeiro. Todo erro vira `{ ok: false, motivo }`.
 * - Tabela ausente (172 ainda não aplicada) → `motivo: 'tabela_ausente'`.
 * - Idempotente: os índices únicos da 172 são PARCIAIS
 *   (`WHERE fiscal_invoice_id IS NOT NULL`), e o PostgREST não envia o
 *   predicado no ON CONFLICT — um upsert com onConflict falharia com 42P10.
 *   Por isso: lê as parcelas já gravadas, insere só as que faltam e trata
 *   23505 (corrida entre dois uploads) como "já existia".
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { tabelaAusente } from "@/lib/gestao/contexto";
import { extrairDuplicatas, direcaoDaNota, type DuplicatasNota, type DirecaoTitulo } from "@/lib/fiscal/duplicatas";

export type GerarTitulosInput = {
  clientId: string;
  xml: string;
  /** id em fiscal_notes (fluxo legado). */
  fiscalNoteId?: string | null;
  /** id em fiscal_invoices (fluxo canônico). */
  fiscalInvoiceId?: string | null;
  /** Se omitida, é a ponta da nota que não é o cliente. */
  contraparte?: { nome?: string | null; doc?: string | null } | null;
  /** Se omitida: "NF-e <número> · <contraparte>". */
  descricao?: string | null;
  /** CPF/CNPJ do cliente, quando conhecido — melhora a decisão pagar/receber. */
  documentoCliente?: string | null;
};

export type GerarTitulosResultado =
  | {
      ok: true;
      tipo: DirecaoTitulo["tipo"];
      confianca: DirecaoTitulo["confianca"];
      inseridos: number;
      existentes: number;
      divergencia: DuplicatasNota["divergencia"];
      avisos: string[];
    }
  | {
      ok: false;
      motivo: "tabela_ausente" | "sem_vinculo" | "sem_parcelas" | "erro";
      detalhe?: string;
    };

type ErroPg = { code?: string; message?: string } | null;

const duplicada = (e: ErroPg) => !!e && (e.code === "23505" || /duplicate key/i.test(e.message ?? ""));

export async function gerarTitulosDaNota(
  supabase: SupabaseClient,
  input: GerarTitulosInput,
): Promise<GerarTitulosResultado> {
  try {
    const fiscalNoteId = input.fiscalNoteId || null;
    const fiscalInvoiceId = input.fiscalInvoiceId || null;
    // Sem vínculo com a nota não há chave de idempotência: reimportar duplicaria.
    if (!fiscalNoteId && !fiscalInvoiceId) return { ok: false, motivo: "sem_vinculo" };
    if (!input.xml) return { ok: false, motivo: "sem_parcelas", detalhe: "XML vazio" };

    const dups = extrairDuplicatas(input.xml);
    if (dups.parcelas.length === 0) {
      return { ok: false, motivo: "sem_parcelas", detalhe: dups.origem + (dups.avisos[0] ? ` · ${dups.avisos[0]}` : "") };
    }

    const dir = direcaoDaNota(input.xml, input.documentoCliente);
    const outra = dir.papelCliente === "emitente" ? dir.destinatario : dir.emitente;
    const contraNome = input.contraparte?.nome?.trim() || outra.nome || null;
    const contraDoc = (input.contraparte?.doc ?? outra.doc ?? "").replace(/\D/g, "") || null;

    const numeroNota = (input.xml.match(/<(?:[A-Za-z_][\w.-]*:)?nNF>\s*(\d+)\s*</i)?.[1]) ?? "";
    const descricaoBase = input.descricao?.trim()
      || ["NF-e" + (numeroNota ? ` ${numeroNota}` : ""), contraNome].filter(Boolean).join(" · ");

    // ── Parcelas já gravadas para esta nota ────────────────────────────────
    const chaveCol = fiscalNoteId ? "fiscal_note_id" : "fiscal_invoice_id";
    const chaveVal = (fiscalNoteId ?? fiscalInvoiceId) as string;
    const { data: existentesRows, error: selErr } = await supabase
      .from("titulos_financeiros")
      .select("numero_parcela")
      .eq(chaveCol, chaveVal);
    if (selErr) {
      if (tabelaAusente(selErr)) return { ok: false, motivo: "tabela_ausente" };
      return { ok: false, motivo: "erro", detalhe: selErr.message };
    }
    const jaTem = new Set((existentesRows ?? []).map(r => String((r as { numero_parcela: string | null }).numero_parcela)));

    // Compra só de diesel vira estoque: o custo entra no abastecimento (consumo),
    // não na compra — evita contar o mesmo diesel duas vezes no resultado.
    const ncms = [...input.xml.matchAll(/<(?:[A-Za-z_][\w.-]*:)?NCM>\s*(\d+)\s*</gi)].map(m => m[1]);
    const natureza = dir.tipo === "pagar" && ncms.length > 0 && ncms.every(n => n.startsWith("27101921"))
      ? "estoque" : "custo";

    const total = dups.parcelas.length;
    const linhas = dups.parcelas
      .filter(p => !jaTem.has(p.numero))
      .map((p, i, arr) => ({
        client_id: input.clientId,
        tipo: dir.tipo,
        descricao: total > 1 ? `${descricaoBase} · parcela ${p.numero}` : descricaoBase,
        contraparte_nome: contraNome,
        contraparte_doc: contraDoc,
        numero_parcela: p.numero,
        valor: p.valor,
        vencimento: p.vencimento,
        status: "aberto",
        forma_pagamento: dups.formaPagamento,
        fiscal_note_id: fiscalNoteId,
        fiscal_invoice_id: fiscalInvoiceId,
        origem: "nfe",
        natureza,
        notas: i === arr.length - 1 && dups.divergencia
          ? `Soma das parcelas (${dups.divergencia.somaParcelas.toFixed(2)}) difere do total da nota (${dups.divergencia.valorNota.toFixed(2)}).`
          : null,
      }));

    let inseridos = 0;
    let existentes = total - linhas.length;

    if (linhas.length > 0) {
      const { error: insErr } = await supabase.from("titulos_financeiros").insert(linhas);
      if (!insErr) {
        inseridos = linhas.length;
      } else if (tabelaAusente(insErr)) {
        return { ok: false, motivo: "tabela_ausente" };
      } else if (duplicada(insErr)) {
        // Corrida: outro upload gravou parte. Linha a linha, ignorando as repetidas.
        for (const linha of linhas) {
          const { error } = await supabase.from("titulos_financeiros").insert(linha);
          if (!error) inseridos++;
          else if (duplicada(error)) existentes++;
          else return { ok: false, motivo: "erro", detalhe: error.message };
        }
      } else {
        return { ok: false, motivo: "erro", detalhe: insErr.message };
      }
    }

    return {
      ok: true,
      tipo: dir.tipo,
      confianca: dir.confianca,
      inseridos,
      existentes,
      divergencia: dups.divergencia,
      avisos: dups.avisos,
    };
  } catch (e) {
    return { ok: false, motivo: "erro", detalhe: e instanceof Error ? e.message : String(e) };
  }
}
