/**
 * Entrada da nota no estoque — regras puras (portal Gestão, Onda 1).
 * Testes: __tests__/gestao-estoque.test.ts.
 *
 * - A nota é COMPRA do cliente? Decidido do ponto de vista do cliente — nunca
 *   por fiscal_invoices.direction, que vem do CFOP de quem EMITIU (a compra
 *   do produtor chega como "saida" do fornecedor).
 * - Conversão de unidade item → produto: o fator lembrado no apelido
 *   (produto_apelidos, migration 176) só vale quando a unidade do item na
 *   nota é a `unidade_nota` gravada; senão o de-para calcula pelo conteúdo da
 *   embalagem; sem base, fica em branco e a tela pede a quantidade.
 * - Custo unitário que entra = total do item na nota ÷ quantidade convertida:
 *   converter muda a quantidade, nunca o valor da nota.
 */

import { decidirDirecao } from "@/lib/fiscal/duplicatas";
import { fatorParaProduto } from "@/lib/gestao/de-para";

const arred6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** tpNF aproximado pelos CFOPs dos itens: 5/6/7 = saída do emitente (1); 1/2/3 = entrada (0). */
export function tpNfPorCfops(cfops: Array<string | null | undefined>): 0 | 1 | null {
  let entrada = false;
  for (const c of cfops) {
    const d = (c ?? "").trim().charAt(0);
    if (d === "5" || d === "6" || d === "7") return 1;
    if (d === "1" || d === "2" || d === "3") entrada = true;
  }
  return entrada ? 0 : null;
}

/**
 * A nota é compra do cliente (gera entrada no estoque)?
 * 1. Venda antiga registrada sem NF-e (VENDA-BACKFILL) nunca é compra.
 * 2. Títulos já decididos pelo XML (lib/gestao/titulos.ts) mandam: algum a
 *    PAGAR = compra; só a RECEBER = venda.
 * 3. Sem título: decidirDirecao (lib/fiscal/duplicatas.ts) com tpNF pelos
 *    CFOPs e os documentos das duas pontas — o mesmo critério dos títulos.
 */
export function notaEhCompra(n: {
  numero?: string | null;
  tiposTitulos?: Iterable<string>;
  cfops?: Array<string | null | undefined>;
  emitenteDoc?: string | null;
  destinatarioDoc?: string | null;
}): boolean {
  if (/^VENDA-BACKFILL/i.test(n.numero ?? "")) return false;
  const tipos = new Set(n.tiposTitulos ?? []);
  if (tipos.has("pagar")) return true;
  if (tipos.has("receber")) return false;
  return decidirDirecao({
    tpNF: tpNfPorCfops(n.cfops ?? []),
    documentoEmitente: n.emitenteDoc,
    documentoDestinatario: n.destinatarioDoc,
  }).tipo === "pagar";
}

export type ApelidoConversao = { unidadeNota: string | null; fatorConversao: number | null };
export type FatorEntrada = { fator: number | null; origem: "lembrado" | "calculado" | "desconhecido" };

const chaveUnidade = (u: string | null | undefined) => (u ?? "").trim().toUpperCase();

/** Quantas unidades do produto vale 1 unidade da nota. */
export function fatorDaEntrada(
  item: { descricao: string; unidade?: string | null },
  unidadeProduto: string | null | undefined,
  apelido?: ApelidoConversao | null,
): FatorEntrada {
  const f = apelido?.fatorConversao;
  if (f !== null && f !== undefined && Number.isFinite(f) && f > 0
      && apelido?.unidadeNota && chaveUnidade(apelido.unidadeNota) === chaveUnidade(item.unidade)) {
    return { fator: f, origem: "lembrado" };
  }
  const calc = fatorParaProduto({ descricao: item.descricao, unidade: item.unidade }, unidadeProduto);
  return calc !== null && calc > 0 ? { fator: calc, origem: "calculado" } : { fator: null, origem: "desconhecido" };
}

/** Quantidade do item convertida para a unidade do produto (6 casas). */
export function quantidadeNaUnidadeDoProduto(quantidadeNota: number | null | undefined, fator: number | null | undefined): number | null {
  if (quantidadeNota === null || quantidadeNota === undefined || !Number.isFinite(quantidadeNota) || quantidadeNota <= 0) return null;
  if (fator === null || fator === undefined || !Number.isFinite(fator) || fator <= 0) return null;
  return arred6(quantidadeNota * fator);
}

/** Custo por unidade do produto: total do item ÷ quantidade que entra. */
export function custoUnitarioDaEntrada(totalItem: number | null | undefined, quantidade: number | null | undefined): number | null {
  if (totalItem === null || totalItem === undefined || !Number.isFinite(totalItem) || totalItem <= 0) return null;
  if (quantidade === null || quantidade === undefined || !Number.isFinite(quantidade) || quantidade <= 0) return null;
  return arred6(totalItem / quantidade);
}

/** Fator implícito quando o produtor digita a quantidade que entra (para lembrar no apelido). */
export function fatorImplicito(quantidadeNota: number | null | undefined, quantidadeEntrada: number | null | undefined): number | null {
  if (!quantidadeNota || !quantidadeEntrada || !Number.isFinite(quantidadeNota) || !Number.isFinite(quantidadeEntrada)) return null;
  if (quantidadeNota <= 0 || quantidadeEntrada <= 0) return null;
  const f = arred6(quantidadeEntrada / quantidadeNota);
  return f > 0 && f <= 1_000_000 ? f : null;
}
