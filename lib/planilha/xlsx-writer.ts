/**
 * XLSX — escritor mínimo, sem dependência (par do leitor `lerXlsx`).
 *
 * Gera o OOXML que Excel, LibreOffice e Google Planilhas abrem sem pedir
 * reparo: [Content_Types].xml, _rels, docProps/core, workbook, styles,
 * sharedStrings e uma worksheet por aba, empacotados por `gerarZip`
 * (deflate nativo do Node + CRC-32 próprio).
 *
 * Decisões:
 * - Formato numérico vai na sintaxe invariável do arquivo (#,##0.00 e
 *   dd/mm/yyyy). O Excel em português mostra 1.234,56: o separador vem do
 *   sistema de quem abre, não do arquivo. Gravar "1.234,56" no código do
 *   formato quebraria a exibição em qualquer outro idioma.
 * - Data vira número de série (sistema 1900) com formato dd/mm/yyyy: a coluna
 *   ordena e filtra como data.
 * - Coluna "texto" grava célula de texto com formato @: CPF/CNPJ, chave de
 *   acesso, parcela "001" e NCM não perdem zero à esquerda nem viram data.
 * - Fórmula em sintaxe en-US (SUM, SUMIFS, vírgula) com valor em cache: o
 *   Excel recalcula ao abrir (fullCalcOnLoad) e quem não calcula (prévia do
 *   celular, o próprio `lerXlsx`) mostra o número certo.
 * - Texto nunca vira fórmula: "=1+1" vindo de uma nota fica texto. O
 *   apóstrofo de proteção é coisa do CSV, não do XLSX.
 * - Caracteres proibidos em XML 1.0 (controle, surrogate solto) são removidos;
 *   sem isso o Excel recusa o arquivo inteiro por uma célula.
 */

import { gerarZip, type ArquivoZip } from "@/lib/planilha/zip";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type Formato = "geral" | "texto" | "data" | "inteiro" | "decimal1" | "decimal2" | "decimal4";
export type Valor = string | number | boolean | null | undefined;

export type CelulaRica = {
  v?: Valor;
  /** Fórmula sem o "=", em sintaxe en-US (SUM, SUMIFS, vírgula). `v` é o valor em cache. */
  f?: string;
  /** Sobrepõe o formato da coluna. */
  formato?: Formato;
  negrito?: boolean;
  /** "titulo": fonte maior em negrito. "nota": itálico cinza, menor. */
  estilo?: "titulo" | "nota";
};
export type Celula = Valor | CelulaRica;

export type ColunaXlsx = { titulo: string; formato?: Formato; largura?: number };

export type PlanilhaXlsx = {
  /** Até 31 caracteres, sem : \ / ? * [ ]. Nome inválido ou repetido lança erro (fórmulas dependem dele). */
  nome: string;
  /** Com colunas, a linha 1 vira cabeçalho (negrito, fixo ao rolar, com filtro). */
  colunas?: ColunaXlsx[];
  linhas: Celula[][];
  /** Linhas depois de uma linha em branco, fora do filtro: totais. */
  rodape?: Celula[][];
  /** Larguras (em caracteres) quando não há colunas, como numa aba de resumo. */
  larguras?: number[];
};

export type MetaXlsx = { titulo?: string; autor?: string; criadoEm?: Date };

const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAX_TEXTO = 32767;     // limite de caracteres por célula no Excel
const MAX_LINHAS = 1_048_576;

/* ───────────────────────────── Estilos ───────────────────────────── */

const FORMATOS: Formato[] = ["geral", "texto", "data", "inteiro", "decimal1", "decimal2", "decimal4"];
// 0 geral · 49 @ (texto) · 3 #,##0 · 4 #,##0.00 são embutidos; os demais são próprios (164+).
const NUMFMT: Record<Formato, number> = { geral: 0, texto: 49, data: 164, inteiro: 3, decimal1: 165, decimal2: 4, decimal4: 166 };
const NUMFMT_PROPRIOS: Array<[number, string]> = [[164, "dd/mm/yyyy"], [165, "#,##0.0"], [166, "#,##0.0000"]];

// cellXfs: 0 = padrão; 1 + 2i (+1 em negrito) = FORMATOS[i]; depois cabeçalho, título e nota.
const XF_CABECALHO = 1 + FORMATOS.length * 2;
const XF_TITULO = XF_CABECALHO + 1;
const XF_NOTA = XF_CABECALHO + 2;
const xfDe = (formato: Formato, negrito = false) => 1 + FORMATOS.indexOf(formato) * 2 + (negrito ? 1 : 0);

function stylesXml(): string {
  const xf = (numFmtId: number, fontId: number) =>
    `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="0" borderId="0" xfId="0"`
    + `${numFmtId ? ' applyNumberFormat="1"' : ""}${fontId ? ' applyFont="1"' : ""}/>`;
  const xfs = [xf(0, 0)];
  for (const f of FORMATOS) xfs.push(xf(NUMFMT[f], 0), xf(NUMFMT[f], 1));
  xfs.push('<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>');
  xfs.push(xf(0, 2), xf(0, 3));

  return DECL
    + `<styleSheet xmlns="${NS_MAIN}">`
    + `<numFmts count="${NUMFMT_PROPRIOS.length}">${NUMFMT_PROPRIOS.map(([id, cod]) => `<numFmt numFmtId="${id}" formatCode="${escAttr(cod)}"/>`).join("")}</numFmts>`
    + '<fonts count="4">'
    + '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'
    + '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>'
    + '<font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font>'
    + '<font><i/><sz val="9"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>'
    + "</fonts>"
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F1EB"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
    + '<border><left/><right/><top/><bottom style="thin"><color rgb="FFA7B8AD"/></bottom><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>`
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '<dxfs count="0"/><tableStyles count="0"/>'
    + "</styleSheet>";
}

/* ───────────────────────────── Texto e XML ───────────────────────────── */

// Fora do XML 1.0: controles (menos tab, LF, CR), U+FFFE/U+FFFF e surrogate solto.
const INVALIDO_XML = /[^\t\n\r\x20-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/gu;

/** Normaliza quebras (CRLF e CR solto viram LF) e tira o que o XML não aceita. */
export function limparTextoXml(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(INVALIDO_XML, "");
}

function escXml(s: string): string {
  return limparTextoXml(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return escXml(s).replace(/"/g, "&quot;").replace(/\n/g, "&#10;").replace(/\t/g, "&#9;");
}

/** Tabela de textos compartilhados (sharedStrings.xml): cada texto distinto é gravado uma vez. */
class TextosCompartilhados {
  private indices = new Map<string, number>();
  private textos: string[] = [];
  private referencias = 0;

  indice(bruto: string): number {
    // Corta antes de limpar: se o corte partir um par surrogate, a limpeza remove a metade solta.
    const texto = limparTextoXml(bruto.length > MAX_TEXTO ? bruto.slice(0, MAX_TEXTO) : bruto);
    this.referencias++;
    let i = this.indices.get(texto);
    if (i === undefined) {
      i = this.textos.length;
      this.textos.push(texto);
      this.indices.set(texto, i);
    }
    return i;
  }

  xml(): string {
    const itens = this.textos.map((t) => {
      // "_x000D_" escrito pelo usuário seria lido como caractere escapado; "_x005F_" preserva o literal.
      const corpo = escXml(t.replace(/_(x[0-9A-Fa-f]{4}_)/g, "_x005F_$1"));
      const preserva = /^\s|\s$|[\n\t]/.test(t) ? ' xml:space="preserve"' : "";
      return `<si><t${preserva}>${corpo}</t></si>`;
    });
    return DECL + `<sst xmlns="${NS_MAIN}" count="${this.referencias}" uniqueCount="${this.textos.length}">${itens.join("")}</sst>`;
  }
}

/* ───────────────────────────── Referências ───────────────────────────── */

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function colunaLetra(indice: number): string {
  let n = Math.floor(indice) + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Nome de aba para fórmula: sempre entre apóstrofos (aceito em qualquer nome), apóstrofo interno dobrado. */
export function refPlanilha(nome: string): string {
  return `'${nome.replace(/'/g, "''")}'`;
}

/** "H2:H40" (ou "'Aba'!H2:H40"). Coluna em índice 0, linhas em base 1. */
export function faixa(coluna: number, linhaInicial: number, linhaFinal: number, aba?: string): string {
  const r = `${colunaLetra(coluna)}${linhaInicial}:${colunaLetra(coluna)}${linhaFinal}`;
  return aba ? `${refPlanilha(aba)}!${r}` : r;
}

/** Literal de texto dentro de fórmula: "texto" com aspas internas dobradas. */
export function textoFormula(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Critério de SUMIFS/COUNTIFS que casa o texto exato: "=" na frente (senão
 * "<5" ou ">x" viram comparação) e ~ antes de * ? ~ (senão viram curinga).
 */
export function criterioIgual(s: string): string {
  return textoFormula("=" + s.replace(/[~*?]/g, "~$&"));
}

/** Onde ficam dados e rodapé de uma aba (linhas em base 1). `fimDados < inicioDados` quando não há dados. */
export function linhasDaPlanilha(p: { colunas?: unknown[]; linhas: unknown[] }) {
  const inicioDados = p.colunas && p.colunas.length > 0 ? 2 : 1;
  return {
    inicioDados,
    fimDados: inicioDados + p.linhas.length - 1,
    inicioRodape: inicioDados + p.linhas.length + 1, // uma linha em branco separa dados e totais
  };
}

/* ───────────────────────────── Células ───────────────────────────── */

/** "2026-11-05" → número de série do Excel (5 de novembro de 2026 = 46331). Inválida → null. */
export function isoParaSerialExcel(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(a, me - 1, d);
  const dt = new Date(ms);
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== me - 1 || dt.getUTCDate() !== d) return null;
  if (a < 1900) return null;
  return Math.round(ms / 86_400_000) + 25569; // 25569 = série de 01/01/1970
}

const numeroXml = (n: number) => (Object.is(n, -0) ? "0" : String(n));
const ehRica = (c: Celula): c is CelulaRica => typeof c === "object" && c !== null;

function celulaXml(ref: string, celula: Celula, formatoColuna: Formato | undefined, sst: TextosCompartilhados): string | null {
  const c: CelulaRica = ehRica(celula) ? celula : { v: celula };
  const formato = c.formato ?? formatoColuna ?? "geral";
  const s = c.estilo === "titulo" ? XF_TITULO : c.estilo === "nota" ? XF_NOTA : xfDe(formato, !!c.negrito);
  const atr = `r="${ref}" s="${s}"`;
  const v = c.v;

  if (c.f) {
    const f = `<f>${escXml(c.f.replace(/^=/, ""))}</f>`;
    if (typeof v === "number" && Number.isFinite(v)) return `<c ${atr}>${f}<v>${numeroXml(v)}</v></c>`;
    if (typeof v === "boolean") return `<c ${atr} t="b">${f}<v>${v ? 1 : 0}</v></c>`;
    if (typeof v === "string") return `<c ${atr} t="str">${f}<v>${escXml(v)}</v></c>`;
    return `<c ${atr}>${f}</c>`;
  }

  if (v === null || v === undefined || v === "") return null;
  const texto = (t: string) => `<c ${atr} t="s"><v>${sst.indice(t)}</v></c>`;
  const numero = (n: number) => (Number.isFinite(n) ? `<c ${atr}><v>${numeroXml(n)}</v></c>` : null);

  if (typeof v === "boolean") return `<c ${atr} t="b"><v>${v ? 1 : 0}</v></c>`;
  if (formato === "texto") return texto(String(v));
  if (formato === "data") {
    const serial = typeof v === "number" ? v : isoParaSerialExcel(v);
    return serial != null ? numero(serial) : texto(String(v));
  }
  if (typeof v === "number") return numero(v);
  // Texto numérico ("1234.50", como o banco devolve numeric) em coluna de número vira número.
  if (formato !== "geral" && /^-?\d+(\.\d+)?$/.test(v.trim())) return numero(Number(v.trim()));
  return texto(v);
}

/** Largura estimada (em caracteres) do que a célula mostra. */
function tamanhoExibido(celula: Celula, formato: Formato | undefined): number {
  const c: CelulaRica = ehRica(celula) ? celula : { v: celula };
  const v = c.v;
  if (v === null || v === undefined || v === "") return 0;
  const f = c.formato ?? formato ?? "geral";
  if (f === "data") return 10;
  if (typeof v === "number" || (f !== "geral" && f !== "texto" && /^-?\d+(\.\d+)?$/.test(String(v)))) {
    const n = Math.abs(Number(v));
    const inteiros = String(Math.trunc(n)).length;
    const casas = f === "decimal4" ? 5 : f === "decimal2" ? 3 : f === "decimal1" ? 2 : 0;
    return inteiros + Math.floor((inteiros - 1) / 3) + casas + (Number(v) < 0 ? 1 : 0);
  }
  return Math.max(...String(v).split(/\r\n|\r|\n/).map((l) => l.length));
}

function larguras(p: PlanilhaXlsx, nColunas: number): number[] {
  if (!p.colunas?.length) return (p.larguras ?? []).map((w) => Math.round(w * 100) / 100);
  return p.colunas.map((col, i) => {
    if (col.largura) return col.largura;
    let maior = col.titulo.length + 3; // negrito + seta do filtro
    for (const linha of p.linhas.slice(0, 2000)) maior = Math.max(maior, tamanhoExibido(linha[i], col.formato) + 2);
    return Math.min(60, Math.max(8, maior));
  }).slice(0, nColunas);
}

/* ───────────────────────────── Partes do pacote ───────────────────────────── */

const INVALIDO_ABA = /[\\/?*[\]:]/;

function validarNomes(planilhas: PlanilhaXlsx[]): void {
  const usados = new Set<string>();
  for (const p of planilhas) {
    const n = p.nome;
    if (!n || n.length > 31 || INVALIDO_ABA.test(n) || n.startsWith("'") || n.endsWith("'") || n.toLowerCase() === "history") {
      throw new Error(`nome de aba inválido no Excel: "${n}"`);
    }
    if (usados.has(n.toLowerCase())) throw new Error(`aba repetida: "${n}"`);
    usados.add(n.toLowerCase());
  }
}

function folhaXml(p: PlanilhaXlsx, indice: number, sst: TextosCompartilhados): { xml: string; filtro: string | null } {
  const colunas = p.colunas ?? [];
  const rodape = p.rodape ?? [];
  const pos = linhasDaPlanilha(p);
  const ultimaLinhaPossivel = rodape.length ? pos.inicioRodape + rodape.length - 1 : pos.fimDados;
  if (ultimaLinhaPossivel > MAX_LINHAS) throw new Error(`a aba "${p.nome}" passa do limite de linhas do Excel`);

  // reduce, não Math.max(...): espalhar 100 mil linhas como argumentos estoura a pilha.
  const nColunas = [...p.linhas, ...rodape].reduce((m, l) => Math.max(m, l.length), Math.max(1, colunas.length, p.larguras?.length ?? 0));
  const linhasXml: string[] = [];
  let ultimaLinha = 0;
  let ultimaColuna = colunas.length ? colunas.length - 1 : 0;

  const gravar = (numero: number, celulas: Celula[]) => {
    const partes: string[] = [];
    celulas.forEach((cel, i) => {
      const x = celulaXml(`${colunaLetra(i)}${numero}`, cel, colunas[i]?.formato, sst);
      if (x) { partes.push(x); ultimaColuna = Math.max(ultimaColuna, i); }
    });
    if (partes.length) { linhasXml.push(`<row r="${numero}">${partes.join("")}</row>`); ultimaLinha = numero; }
  };

  if (colunas.length) {
    linhasXml.push(`<row r="1">${colunas.map((c, i) => `<c r="${colunaLetra(i)}1" s="${XF_CABECALHO}" t="s"><v>${sst.indice(c.titulo)}</v></c>`).join("")}</row>`);
    ultimaLinha = 1;
  }
  p.linhas.forEach((l, i) => gravar(pos.inicioDados + i, l));
  rodape.forEach((l, j) => gravar(pos.inicioRodape + j, l));

  const dimensao = ultimaLinha ? `A1:${colunaLetra(ultimaColuna)}${ultimaLinha}` : "A1";
  const filtro = colunas.length ? `A1:${colunaLetra(colunas.length - 1)}${Math.max(1, pos.fimDados)}` : null;
  const ativa = indice === 0 ? ' tabSelected="1"' : "";
  const vista = colunas.length
    ? `<sheetView workbookViewId="0"${ativa}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>`
    : `<sheetView workbookViewId="0"${ativa}/>`;
  const ws = larguras(p, nColunas);
  const cols = ws.length
    ? `<cols>${ws.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const paisagem = colunas.length > 8 ? ' orientation="landscape"' : "";

  const xml = DECL
    + `<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">`
    + `<dimension ref="${dimensao}"/>`
    + `<sheetViews>${vista}</sheetViews>`
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + cols
    + `<sheetData>${linhasXml.join("")}</sheetData>`
    + (filtro ? `<autoFilter ref="${filtro}"/>` : "")
    + '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    + `<pageSetup paperSize="9"${paisagem}/>`
    + "</worksheet>";

  return { xml, filtro: filtro ? filtro.replace(/([A-Z]+)(\d+)/g, "$$$1$$$2") : null };
}

/** Gera o .xlsx. A primeira aba abre selecionada. */
export function gerarXlsx(planilhas: PlanilhaXlsx[], meta: MetaXlsx = {}): Buffer {
  if (planilhas.length === 0) throw new Error("a planilha precisa de ao menos uma aba");
  validarNomes(planilhas);

  const sst = new TextosCompartilhados();
  const folhas = planilhas.map((p, i) => folhaXml(p, i, sst));
  const n = planilhas.length;
  const quando = (meta.criadoEm ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");

  const contentTypes = DECL
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + "</Types>";

  const relsRaiz = DECL
    + `<Relationships xmlns="${NS_PKG_REL}">`
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + "</Relationships>";

  const core = DECL
    + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + (meta.titulo ? `<dc:title>${escXml(meta.titulo)}</dc:title>` : "")
    + `<dc:creator>${escXml(meta.autor ?? "Agraas")}</dc:creator>`
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${quando}</dcterms:created>`
    + `<dcterms:modified xsi:type="dcterms:W3CDTF">${quando}</dcterms:modified>`
    + "</cp:coreProperties>";

  const filtros = folhas
    .map((f, i) => (f.filtro ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${escXml(`${refPlanilha(planilhas[i].nome)}!${f.filtro}`)}</definedName>` : ""))
    .join("");
  const workbook = DECL
    + `<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">`
    + "<workbookPr/>"
    + '<bookViews><workbookView activeTab="0"/></bookViews>'
    + `<sheets>${planilhas.map((p, i) => `<sheet name="${escAttr(p.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>`
    + (filtros ? `<definedNames>${filtros}</definedNames>` : "")
    + '<calcPr calcId="191029" fullCalcOnLoad="1"/>'
    + "</workbook>";

  const relsWorkbook = DECL
    + `<Relationships xmlns="${NS_PKG_REL}">`
    + folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")
    + `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    + `<Relationship Id="rId${n + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`
    + "</Relationships>";

  const arquivos: ArquivoZip[] = [
    { nome: "[Content_Types].xml", conteudo: contentTypes },
    { nome: "_rels/.rels", conteudo: relsRaiz },
    { nome: "docProps/core.xml", conteudo: core },
    { nome: "xl/workbook.xml", conteudo: workbook },
    { nome: "xl/_rels/workbook.xml.rels", conteudo: relsWorkbook },
    { nome: "xl/styles.xml", conteudo: stylesXml() },
    ...folhas.map((f, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, conteudo: f.xml })),
    { nome: "xl/sharedStrings.xml", conteudo: sst.xml() },
  ];
  return gerarZip(arquivos, meta.criadoEm);
}
