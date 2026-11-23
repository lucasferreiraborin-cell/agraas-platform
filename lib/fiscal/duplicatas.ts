/**
 * Duplicatas e forma de pagamento da NF-e — módulo PURO, sem I/O.
 *
 * Lê o grupo Y (<cobr>: <fat> + <dup>) e o grupo YA (<pag><detPag>) do XML
 * para que a nota vire contas a pagar/receber sem digitação (portal Gestão,
 * 23/11/2026). Escopo: leitura. Não emite nem valida assinatura.
 *
 * Referência de layout: Manual de Orientação do Contribuinte NF-e 4.00,
 * grupos Y (cobrança) e YA (pagamento); códigos de tPag até a NT 2020.006.
 */

import { extractBlock, extractTag, parseNfeHeader } from "@/lib/fiscal/nfe-parser";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type Parcela = {
  /** nDup da nota; quando ausente, a posição ("1", "2"...). Único na nota. */
  numero: string;
  /** YYYY-MM-DD */
  vencimento: string;
  valor: number;
};

export type PagamentoNota = {
  /** Código tPag (01 dinheiro, 15 boleto, 17 PIX...). */
  tPag: string;
  descricao: string;
  valor: number;
  /** 0 = à vista, 1 = a prazo; null quando a nota não informa. */
  indPag: 0 | 1 | null;
};

export type DuplicatasNota = {
  parcelas: Parcela[];
  /** "duplicatas" quando veio de <dup>; "a_vista" quando foi derivada; "sem_pagamento" com tPag 90. */
  origem: "duplicatas" | "a_vista" | "sem_pagamento" | "indefinida";
  fatura: { numero: string; valorOriginal: number | null; valorLiquido: number | null } | null;
  pagamentos: PagamentoNota[];
  /** Descrição curta da forma de pagamento predominante, ou null. */
  formaPagamento: string | null;
  somaParcelas: number;
  valorNota: number | null;
  /** Preenchida quando soma das parcelas ≠ vNF (tolerância de R$ 0,01). */
  divergencia: { somaParcelas: number; valorNota: number; diferenca: number } | null;
  avisos: string[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Valores da NF-e usam ponto decimal; vírgula é tolerada por robustez. */
function valor(raw: string): number | null {
  if (!raw) return null;
  const v = Number(raw.trim().replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function dataValida(s: string): boolean {
  if (!DATA_ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Códigos tPag do MOC 4.00 (até NT 2020.006). Desconhecido não vira palpite. */
const T_PAG: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de crédito",
  "04": "Cartão de débito",
  "05": "Crédito loja",
  "10": "Vale alimentação",
  "11": "Vale refeição",
  "12": "Vale presente",
  "13": "Vale combustível",
  "15": "Boleto",
  "16": "Depósito bancário",
  "17": "PIX",
  "18": "Transferência bancária",
  "19": "Programa de fidelidade",
  "90": "Sem pagamento",
  "99": "Outros",
};

export function descreverTPag(codigo: string): string {
  const c = codigo.trim().padStart(2, "0");
  return T_PAG[c] ?? `Código ${c}`;
}

// ── Leitura ──────────────────────────────────────────────────────────────────

export function lerPagamentos(xml: string): PagamentoNota[] {
  const pag = extractBlock(xml, "pag")[0] ?? "";
  if (!pag) return [];
  return extractBlock(pag, "detPag")
    .map((det): PagamentoNota | null => {
      const tPag = extractTag(det, "tPag").padStart(2, "0");
      if (!tPag || tPag === "00") return null;
      const ind = extractTag(det, "indPag");
      return {
        tPag,
        descricao: descreverTPag(tPag),
        valor: centavos(valor(extractTag(det, "vPag")) ?? 0),
        indPag: ind === "0" ? 0 : ind === "1" ? 1 : null,
      };
    })
    .filter((p): p is PagamentoNota => p !== null);
}

/**
 * Extrai parcelas e forma de pagamento.
 *
 * Regras:
 * - <dup> com valor > 0 vira parcela; valor ≤ 0 é ignorado (com aviso).
 * - Sem <dup>: uma parcela à vista, vencimento = emissão, valor = vNF
 *   (ou soma de detPag menos troco, se vNF faltar).
 * - Só "sem pagamento" (tPag 90) e nenhuma <dup>: nenhuma parcela —
 *   remessa, bonificação e transferência não geram título.
 * - Ordena por vencimento; soma conferida contra vNF.
 */
export function extrairDuplicatas(xml: string): DuplicatasNota {
  const header = parseNfeHeader(xml);
  const emissao = dataValida(header.dataEmissao) ? header.dataEmissao : "";
  const valorNota = header.valorTotal;
  const avisos: string[] = [];

  const cobr = extractBlock(xml, "cobr")[0] ?? "";
  const fatBloco = cobr ? extractBlock(cobr, "fat")[0] ?? "" : "";
  const fatura = fatBloco
    ? {
        numero: extractTag(fatBloco, "nFat"),
        valorOriginal: valor(extractTag(fatBloco, "vOrig")),
        valorLiquido: valor(extractTag(fatBloco, "vLiq")),
      }
    : null;

  const pagamentos = lerPagamentos(xml);
  const pagos = pagamentos.filter(p => p.tPag !== "90");
  const troco = valor(extractTag(extractBlock(xml, "pag")[0] ?? "", "vTroco")) ?? 0;

  // Forma predominante = maior valor entre os detPag com pagamento.
  const formaPagamento = pagos.length > 0
    ? [...pagos].sort((a, b) => b.valor - a.valor)[0].descricao
    : pagamentos.length > 0 ? pagamentos[0].descricao : null;

  // ── Duplicatas explícitas ───────────────────────────────────────────────
  const brutas = cobr ? extractBlock(cobr, "dup") : [];
  const parcelas: Parcela[] = [];
  const usados = new Set<string>();

  brutas.forEach((dup, i) => {
    const v = valor(extractTag(dup, "vDup"));
    let numero = extractTag(dup, "nDup") || String(i + 1);
    if (v === null || v <= 0) {
      avisos.push(`Parcela ${numero} ignorada: valor ${v ?? "ausente"}.`);
      return;
    }
    // nDup repetido quebraria a unicidade (nota, parcela) no banco.
    if (usados.has(numero)) {
      let k = 2;
      while (usados.has(`${numero}-${k}`)) k++;
      avisos.push(`Parcela ${numero} repetida na nota; gravada como ${numero}-${k}.`);
      numero = `${numero}-${k}`;
    }
    let venc = extractTag(dup, "dVenc").slice(0, 10);
    if (!dataValida(venc)) {
      if (!emissao) {
        avisos.push(`Parcela ${numero} ignorada: sem vencimento e sem data de emissão.`);
        return;
      }
      avisos.push(`Parcela ${numero} sem vencimento válido; usada a data de emissão.`);
      venc = emissao;
    }
    usados.add(numero);
    parcelas.push({ numero, vencimento: venc, valor: centavos(v) });
  });

  let origem: DuplicatasNota["origem"] = "duplicatas";

  if (parcelas.length === 0) {
    const somaPag = centavos(pagos.reduce((s, p) => s + p.valor, 0) - troco);
    const soSemPagamento = pagamentos.length > 0 && pagos.length === 0;

    if (brutas.length > 0) {
      origem = "indefinida";
    } else if (soSemPagamento) {
      origem = "sem_pagamento";
    } else {
      const v = valorNota && valorNota > 0 ? valorNota : somaPag > 0 ? somaPag : null;
      if (v === null) {
        origem = "indefinida";
        avisos.push("Nota sem duplicatas e sem valor total: nenhuma parcela gerada.");
      } else if (!emissao) {
        origem = "indefinida";
        avisos.push("Nota sem duplicatas e sem data de emissão: nenhuma parcela gerada.");
      } else {
        origem = "a_vista";
        parcelas.push({ numero: "1", vencimento: emissao, valor: centavos(v) });
      }
    }
  }

  parcelas.sort((a, b) =>
    a.vencimento.localeCompare(b.vencimento) || a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }),
  );

  const somaParcelas = centavos(parcelas.reduce((s, p) => s + p.valor, 0));
  let divergencia: DuplicatasNota["divergencia"] = null;
  if (parcelas.length > 0 && valorNota !== null && Math.abs(somaParcelas - valorNota) > 0.01) {
    divergencia = { somaParcelas, valorNota, diferenca: centavos(somaParcelas - valorNota) };
  }

  return { parcelas, origem, fatura, pagamentos, formaPagamento, somaParcelas, valorNota, divergencia, avisos };
}

// ── Direção: pagar ou receber ───────────────────────────────────────────────

export type DirecaoTitulo = {
  tipo: "pagar" | "receber";
  /** Qual ponta da nota é o cliente — a outra é a contraparte. */
  papelCliente: "emitente" | "destinatario";
  /** alta = documento do cliente casou; media = heurística CPF×CNPJ; baixa = suposição padrão. */
  confianca: "alta" | "media" | "baixa";
  motivo: string;
};

const soDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/**
 * Decide se a nota gera conta a PAGAR ou a RECEBER para o cliente.
 *
 * tpNF descreve a operação do ponto de vista do EMITENTE (0 entrada, 1 saída):
 * - cliente é emitente: saída = venda (receber); entrada = nota de entrada
 *   própria, típica de compra de não-contribuinte (pagar).
 * - cliente é destinatário: saída do fornecedor = compra (pagar); entrada do
 *   emitente = contranota, ex. frigorífico emitindo a entrada do gado comprado
 *   do produtor (receber).
 *
 * Sem documento do cliente (clients não tem CPF/CNPJ nativo — ver 147:97):
 * produtor rural é tipicamente PF (CPF, 11 dígitos); se só uma ponta é CPF,
 * ela é o cliente (confiança média). Senão, supõe-se que o cliente é o
 * destinatário, porque o upload típico é a nota do fornecedor (baixa).
 */
export function decidirDirecao(input: {
  tpNF: string | number | null | undefined;
  documentoEmitente: string | null | undefined;
  documentoDestinatario: string | null | undefined;
  documentoCliente?: string | null;
}): DirecaoTitulo {
  const tp = String(input.tpNF ?? "").trim();
  // tpNF ausente: o emitente está, na prática, emitindo uma saída.
  const saida = tp !== "0";
  const emit = soDigitos(input.documentoEmitente);
  const dest = soDigitos(input.documentoDestinatario);
  const cli = soDigitos(input.documentoCliente);

  const resolver = (papel: "emitente" | "destinatario", confianca: DirecaoTitulo["confianca"], base: string): DirecaoTitulo => {
    const tipo: DirecaoTitulo["tipo"] =
      papel === "emitente" ? (saida ? "receber" : "pagar") : (saida ? "pagar" : "receber");
    const op = saida ? "saída" : "entrada";
    return { tipo, papelCliente: papel, confianca, motivo: `${base}; nota de ${op} (tpNF ${saida ? 1 : 0}).` };
  };

  if (cli) {
    if (emit && emit === cli) return resolver("emitente", "alta", "Cliente é o emitente");
    if (dest && dest === cli) return resolver("destinatario", "alta", "Cliente é o destinatário");
  }
  if (emit.length === 11 && dest.length !== 11 && dest.length > 0) {
    return resolver("emitente", "media", "Emitente é pessoa física (CPF) e destinatário é empresa");
  }
  if (dest.length === 11 && emit.length !== 11) {
    return resolver("destinatario", "media", "Destinatário é pessoa física (CPF) e emitente é empresa");
  }
  return resolver("destinatario", "baixa", "Documento do cliente desconhecido; suposto destinatário");
}

/** Lê tpNF e documentos do XML e aplica `decidirDirecao`. */
export function direcaoDaNota(xml: string, documentoCliente?: string | null): DirecaoTitulo & {
  emitente: { nome: string; doc: string };
  destinatario: { nome: string; doc: string };
} {
  const h = parseNfeHeader(xml);
  const ide = extractBlock(xml, "ide")[0] ?? xml;
  const d = decidirDirecao({
    tpNF: extractTag(ide, "tpNF"),
    documentoEmitente: h.emitenteCnpj,
    documentoDestinatario: h.destinatarioCnpj,
    documentoCliente,
  });
  return {
    ...d,
    emitente: { nome: h.emitenteNome, doc: soDigitos(h.emitenteCnpj) },
    destinatario: { nome: h.destinatarioNome, doc: soDigitos(h.destinatarioCnpj) },
  };
}
