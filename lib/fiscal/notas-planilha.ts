/**
 * Planilha de notas → NotaParseada[] (modo "CSV em lote" da controladoria).
 *
 * Uma linha por ITEM; linhas com o mesmo (número, série, CNPJ do emitente)
 * formam uma nota. Cabeçalhos são reconhecidos por apelido, sem acento e sem
 * diferenciar maiúsculas — "Nº da nota", "numero_nota" e "nNF" são a mesma
 * coluna. O que não se reconhece é reportado, nunca adivinhado.
 *
 * PREMISSA de número: se tem vírgula, é decimal brasileiro ("1.234,56"); se
 * só tem ponto e casa com milhar ("1.234"), é milhar; senão é decimal com
 * ponto ("1234.5", como o Excel grava no XLSX). Sensibilidade: "1.234" como
 * 1,234 seria lido como 1234 — por isso o modelo pede decimal com vírgula.
 */

import type { Tabela } from "@/lib/planilha/csv";
import { gerarCsv } from "@/lib/planilha/csv";
import { excelSerialParaIso } from "@/lib/planilha/xlsx";
import type { NfeItemFiscal } from "@/lib/fiscal/nfe-parser";
import { itensParaParsedItems, type NotaParseada } from "@/lib/fiscal/nota-parse";

export const CAMPOS = [
  "numero_nota", "serie", "emitente_cnpj", "emitente_nome", "data_emissao", "valor_total_nota",
  "destinatario_nome", "destinatario_cnpj",
  "item_descricao", "item_ncm", "item_cfop", "item_quantidade", "item_unidade",
  "item_valor_unitario", "item_valor_total", "item_icms_aliquota", "item_icms_valor",
] as const;
export type Campo = (typeof CAMPOS)[number];

export const OBRIGATORIOS: Campo[] = ["numero_nota", "emitente_cnpj", "data_emissao"];

/** Apelidos aceitos por coluna (normalizados: minúsculo, sem acento, só [a-z0-9]). */
const APELIDOS: Record<Campo, string[]> = {
  numero_nota:        ["numeronota", "numero", "nnf", "nota", "ndanota", "numeroda nota", "numnota", "nfe", "nf"],
  serie:              ["serie", "ser"],
  emitente_cnpj:      ["emitentecnpj", "cnpjemitente", "cnpj", "cnpjcpfemitente", "emitentecpf", "cpfemitente", "documentoemitente"],
  emitente_nome:      ["emitentenome", "emitente", "nomeemitente", "razaosocial", "fornecedor", "razaosocialemitente"],
  data_emissao:       ["dataemissao", "data", "emissao", "dtemissao", "dhemi", "demi"],
  valor_total_nota:   ["valortotalnota", "valornota", "vnf", "totalnota", "valortotaldanota"],
  destinatario_nome:  ["destinatarionome", "destinatario", "nomedestinatario", "cliente"],
  destinatario_cnpj:  ["destinatariocnpj", "cnpjdestinatario", "cpfdestinatario", "documentodestinatario"],
  item_descricao:     ["itemdescricao", "descricao", "produto", "xprod", "descricaodoitem", "item"],
  item_ncm:           ["itemncm", "ncm"],
  item_cfop:          ["itemcfop", "cfop"],
  item_quantidade:    ["itemquantidade", "quantidade", "qtd", "qcom", "qtde"],
  item_unidade:       ["itemunidade", "unidade", "un", "ucom", "unid"],
  item_valor_unitario:["itemvalorunitario", "valorunitario", "vunit", "vuncom", "vlrunit", "precounitario", "unitario"],
  item_valor_total:   ["itemvalortotal", "valortotalitem", "vprod", "totalitem", "valoritem", "vlrtotalitem"],
  item_icms_aliquota: ["itemicmsaliquota", "icmsaliquota", "aliquotaicms", "picms", "icms"],
  item_icms_valor:    ["itemicmsvalor", "icmsvalor", "valoricms", "vicms"],
};

export function normalizarChave(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

/** Mapeia cabeçalho da planilha → campo. Cabeçalho ambíguo fica com o primeiro campo que casar. */
export function mapearColunas(cabecalho: string[]): { mapa: Partial<Record<Campo, number>>; naoReconhecidas: string[] } {
  const mapa: Partial<Record<Campo, number>> = {};
  const naoReconhecidas: string[] = [];
  cabecalho.forEach((h, i) => {
    const n = normalizarChave(h);
    if (!n) return;
    const campo = CAMPOS.find(c => mapa[c] === undefined && (n === c.replace(/_/g, "") || APELIDOS[c].includes(n)));
    if (campo) mapa[campo] = i;
    else naoReconhecidas.push(h);
  });
  return { mapa, naoReconhecidas };
}

export function parseNumeroBr(raw: string): number | null {
  const s = raw.replace(/\s|R\$/g, "").trim();
  if (!s) return null;
  let t = s;
  if (s.includes(",")) t = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) t = s.replace(/\./g, "");
  const n = Number(t.replace(/%$/, ""));
  return Number.isFinite(n) ? n : null;
}

/** dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd, aaaa-mm-ddThh:mm, ou serial do Excel. */
export function parseDataBr(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  if (/^\d{4,6}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial >= 20000 && serial <= 80000) return excelSerialParaIso(serial); // 1954..2119
  }
  return null;
}

export type ErroLinha = { linha: number; campo: string; mensagem: string };

export type ResultadoPlanilha = {
  notas: NotaParseada[];
  erros: ErroLinha[];
  linhasLidas: number;
  colunasMapeadas: Partial<Record<Campo, string>>;
  colunasFaltando: Campo[];
  colunasNaoReconhecidas: string[];
};

/** Limite por arquivo — acima disso é integração, não upload. */
export const MAX_NOTAS_POR_ARQUIVO = 200;

export function interpretarPlanilha(tabela: Tabela): ResultadoPlanilha {
  const { mapa, naoReconhecidas } = mapearColunas(tabela.cabecalho);
  const colunasMapeadas: Partial<Record<Campo, string>> = {};
  for (const c of CAMPOS) if (mapa[c] !== undefined) colunasMapeadas[c] = tabela.cabecalho[mapa[c]!];
  const colunasFaltando = OBRIGATORIOS.filter(c => mapa[c] === undefined);

  const erros: ErroLinha[] = [];
  const base: ResultadoPlanilha = {
    notas: [], erros, linhasLidas: tabela.linhas.length,
    colunasMapeadas, colunasFaltando, colunasNaoReconhecidas: naoReconhecidas,
  };
  if (colunasFaltando.length > 0) {
    erros.push({ linha: 1, campo: colunasFaltando.join(", "), mensagem: `Coluna obrigatória não encontrada no cabeçalho: ${colunasFaltando.join(", ")}` });
    return base;
  }

  const col = (row: string[], c: Campo) => (mapa[c] === undefined ? "" : (row[mapa[c]!] ?? "").trim());

  type Grupo = { header: NotaParseada["header"]; itens: NfeItemFiscal[]; somaInformada: number | null; primeiraLinha: number };
  const grupos = new Map<string, Grupo>();

  tabela.linhas.forEach((row, i) => {
    const linha = i + 2; // 1 = cabeçalho
    const numero = col(row, "numero_nota");
    if (!numero) { erros.push({ linha, campo: "numero_nota", mensagem: "Número da nota vazio" }); return; }
    if (/^exemplo/i.test(numero)) { erros.push({ linha, campo: "numero_nota", mensagem: "Linha de exemplo do modelo — apague antes de enviar" }); return; }

    const cnpj = col(row, "emitente_cnpj").replace(/\D/g, "");
    if (cnpj.length !== 14 && cnpj.length !== 11) {
      erros.push({ linha, campo: "emitente_cnpj", mensagem: `CNPJ/CPF do emitente inválido: "${col(row, "emitente_cnpj")}"` }); return;
    }
    const data = parseDataBr(col(row, "data_emissao"));
    if (!data) { erros.push({ linha, campo: "data_emissao", mensagem: `Data de emissão inválida: "${col(row, "data_emissao")}" (use dd/mm/aaaa)` }); return; }

    const serie = col(row, "serie") || "-";
    const chave = `${numero}|${serie}|${cnpj}`;
    let g = grupos.get(chave);
    if (!g) {
      g = {
        header: {
          numeroNota: numero, serie,
          emitenteCnpj: cnpj,
          emitenteNome: col(row, "emitente_nome"),
          destinatarioNome: col(row, "destinatario_nome"),
          destinatarioCnpj: col(row, "destinatario_cnpj").replace(/\D/g, ""),
          dataEmissao: data,
          valorTotal: 0,
          rawContent: `[planilha] linha ${linha}`,
          chaveAcesso: "",
        },
        itens: [],
        somaInformada: null,
        primeiraLinha: linha,
      };
      grupos.set(chave, g);
    }
    const vTotalNota = parseNumeroBr(col(row, "valor_total_nota"));
    if (vTotalNota != null) g.somaInformada = vTotalNota;

    const descricao = col(row, "item_descricao");
    const temItem = descricao || col(row, "item_valor_total") || col(row, "item_quantidade");
    if (!temItem) return; // nota sem itens (só cabeçalho) é permitida

    const qtd  = parseNumeroBr(col(row, "item_quantidade"));
    const vUn  = parseNumeroBr(col(row, "item_valor_unitario"));
    let   vTot = parseNumeroBr(col(row, "item_valor_total"));
    if (vTot == null && qtd != null && vUn != null) vTot = Math.round(qtd * vUn * 100) / 100;
    if (vTot == null) { erros.push({ linha, campo: "item_valor_total", mensagem: "Item sem valor total (nem quantidade × unitário)" }); return; }

    const aliq = parseNumeroBr(col(row, "item_icms_aliquota"));
    const vIcms = parseNumeroBr(col(row, "item_icms_valor"));

    g.itens.push({
      sequencia:     g.itens.length + 1,
      codigoProduto: "",
      descricao,
      ncm:           col(row, "item_ncm").replace(/\D/g, ""),
      cfop:          col(row, "item_cfop").replace(/\D/g, ""),
      unidade:       col(row, "item_unidade"),
      quantidade:    qtd,
      valorUnitario: vUn,
      valorTotal:    vTot,
      cst:           "",
      icmsBase:      null,
      icmsReducaoBasePct: null,
      icmsAliquota:  aliq,
      icmsValor:     vIcms,
      icmsDesonerado: null,
      icmsMotDesoneracao: "",
      beneficioCodigo: "",
      icmsMonoQtdBc: null, icmsMonoAdRem: null, icmsMonoValor: null,
      icmsMonoQtdBcRet: null, icmsMonoAdRemRet: null, icmsMonoValorRet: null,
      ipiValor: null,
    });
  });

  for (const g of grupos.values()) {
    const soma = g.itens.reduce((s, it) => s + (it.valorTotal ?? 0), 0);
    g.header.valorTotal = g.somaInformada ?? Math.round(soma * 100) / 100;
    base.notas.push({
      header: g.header,
      items: itensParaParsedItems(g.itens),
      richItems: g.itens,
      extracao: { origem: "planilha" },
    });
  }

  if (base.notas.length > MAX_NOTAS_POR_ARQUIVO) {
    erros.push({ linha: 1, campo: "arquivo", mensagem: `Arquivo com ${base.notas.length} notas — o limite por envio é ${MAX_NOTAS_POR_ARQUIVO}. Divida a planilha.` });
    base.notas = [];
  }
  return base;
}

/** O modelo que o usuário baixa: cabeçalho oficial + uma linha de exemplo que o import rejeita. */
export function modeloCsv(): string {
  const cab = [
    "numero_nota", "serie", "emitente_cnpj", "emitente_nome", "data_emissao", "valor_total_nota",
    "destinatario_nome", "destinatario_cnpj",
    "item_descricao", "item_ncm", "item_cfop", "item_quantidade", "item_unidade",
    "item_valor_unitario", "item_valor_total", "item_icms_aliquota", "item_icms_valor",
  ];
  const exemplo1 = ["EXEMPLO-APAGUE", "1", "01.234.567/0001-89", "AGROPECUARIA EXEMPLO LTDA", "20/08/2026", "5950,00",
    "FAZENDA SAO JOAO", "12.345.678/0001-90",
    "SAL MINERAL BOVINOS 30KG", "23099090", "5102", "50", "SC", "95,00", "4750,00", "17", "807,50"];
  const exemplo2 = ["EXEMPLO-APAGUE", "1", "01.234.567/0001-89", "AGROPECUARIA EXEMPLO LTDA", "20/08/2026", "5950,00",
    "FAZENDA SAO JOAO", "12.345.678/0001-90",
    "VERMIFUGO 1L", "30049099", "5102", "10", "FR", "120,00", "1200,00", "", ""];
  return gerarCsv(cab, [exemplo1, exemplo2]);
}
