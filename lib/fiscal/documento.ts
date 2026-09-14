/**
 * Documento (NF-e) → campos de formulário. Usado pelo DocumentGate em
 * abates, vendas, estoque/novo e timeline via /api/parse-doc.
 *
 * Shape estável desde o início (`header` + `items` + `ia_failed`); o que
 * mudou em 14/09/2026 é a origem: o XML passa pelo `nfe-parser` (fronteira
 * de nome — `<det>` não casa mais `<detPag>`) e o PDF passa pelo Claude como
 * documento nativo, em vez da varredura crua que só lia PDF sem compressão.
 */

import { parseNfeHeader, parseNfeItems } from "@/lib/fiscal/nfe-parser";
import type { ExtracaoPdf } from "@/lib/fiscal/pdf-extract";

export type ParsedDocHeader = {
  numero_nota:       string;
  emitente_cnpj:     string;
  emitente_nome:     string;
  data_emissao:      string;
  valor_total:       number;
  destinatario_nome: string;
  destinatario_cnpj: string;
};

export type ParsedDocItem = {
  descricao:      string;
  quantidade:     number;
  unidade:        string;
  valor_unitario: number;
  valor_total:    number;
};

export type ParseDocResponse = {
  header: ParsedDocHeader;
  items:  ParsedDocItem[];
  ia_failed?: boolean;
  extracao?: "xml" | "claude" | "fallback";
  extracao_modelo?: string | null;
  extracao_motivo?: string | null;
};

export function documentoDeXml(xml: string): ParseDocResponse {
  const h = parseNfeHeader(xml);
  const items = parseNfeItems(xml).map(it => ({
    descricao:      it.descricao,
    quantidade:     it.quantidade    ?? 0,
    unidade:        it.unidade,
    valor_unitario: it.valorUnitario ?? 0,
    valor_total:    it.valorTotal    ?? 0,
  }));
  return {
    header: {
      numero_nota:       h.numeroNota,
      emitente_cnpj:     h.emitenteCnpj.replace(/\D/g, ""),
      emitente_nome:     h.emitenteNome,
      data_emissao:      h.dataEmissao,
      valor_total:       h.valorTotal ?? 0,
      destinatario_nome: h.destinatarioNome,
      destinatario_cnpj: h.destinatarioCnpj.replace(/\D/g, ""),
    },
    items,
    extracao: "xml",
  };
}

export function documentoDeExtracao(d: ExtracaoPdf, modelo: string): ParseDocResponse {
  return {
    header: {
      numero_nota:       d.numero_nota || "PDF importado",
      emitente_cnpj:     d.emitente_cnpj.replace(/\D/g, ""),
      emitente_nome:     d.emitente_nome,
      data_emissao:      d.data_emissao,
      valor_total:       d.valor_total ?? 0,
      destinatario_nome: d.destinatario_nome,
      destinatario_cnpj: d.destinatario_cnpj.replace(/\D/g, ""),
    },
    items: d.itens.map(it => ({
      descricao:      it.descricao,
      quantidade:     it.quantidade     ?? 0,
      unidade:        it.unidade,
      valor_unitario: it.valor_unitario ?? 0,
      valor_total:    it.valor_total    ?? 0,
    })),
    ia_failed: d.confianca < 0.7,
    extracao: "claude",
    extracao_modelo: modelo,
    extracao_motivo: d.confianca < 0.7 ? `confiança ${d.confianca.toFixed(2)}${d.observacoes ? " — " + d.observacoes : ""}` : null,
  };
}

/** Quando nem a IA leu: o formulário abre vazio, marcado como não verificado. */
export function documentoVazio(motivo: string): ParseDocResponse {
  return {
    header: { numero_nota: "", emitente_cnpj: "", emitente_nome: "", data_emissao: "", valor_total: 0, destinatario_nome: "", destinatario_cnpj: "" },
    items: [],
    ia_failed: true,
    extracao: "fallback",
    extracao_modelo: null,
    extracao_motivo: motivo,
  };
}
