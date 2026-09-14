/**
 * XLSX — leitor mínimo, sem dependência.
 *
 * Por que não uma biblioteca: a versão pública do SheetJS no npm está parada
 * em 0.18.5 (2022) com avisos abertos de segurança, e exceljs traz ~1 MB para
 * ler uma planilha de notas. Um .xlsx é um ZIP com XML dentro; o Node já tem
 * `inflateRawSync`. O que este módulo cobre: primeira planilha, células com
 * shared strings, inline strings, números, booleanos e fórmulas com valor
 * cacheado. O que NÃO cobre (documentado no modelo para o usuário): ZIP64,
 * planilha protegida por senha, células mescladas como dado.
 *
 * Datas chegam como número serial do Excel — quem interpreta a coluna decide
 * (ver `excelSerialParaIso`).
 */

import { inflateRawSync } from "node:zlib";
import type { Tabela } from "@/lib/planilha/csv";

const SIG_EOCD  = 0x06054b50;
const SIG_CDIR  = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

export function ehXlsx(bytes: Buffer | Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** Lê as entradas de um ZIP (método store ou deflate) para um mapa nome → bytes. */
export function lerZip(bytes: Buffer | Uint8Array): Map<string, Buffer> {
  const buf = Buffer.from(bytes);
  if (buf.length < 22) throw new Error("arquivo pequeno demais para ser um .xlsx");

  // End of central directory: procurar de trás para frente (comentário do zip pode ter até 64 KB).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("não é um arquivo ZIP válido (.xlsx)");

  const total    = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff) throw new Error("ZIP64 não suportado — salve a planilha novamente como .xlsx simples ou exporte CSV");

  const entradas = new Map<string, Buffer>();
  let p = cdOffset;
  for (let n = 0; n < total; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== SIG_CDIR) throw new Error("diretório central do ZIP corrompido");
    const metodo    = buf.readUInt16LE(p + 10);
    const compSize  = buf.readUInt32LE(p + 20);
    const nameLen   = buf.readUInt16LE(p + 28);
    const extraLen  = buf.readUInt16LE(p + 30);
    const commLen   = buf.readUInt16LE(p + 32);
    const localOff  = buf.readUInt32LE(p + 42);
    const nome      = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    p += 46 + nameLen + extraLen + commLen;

    if (localOff + 30 > buf.length || buf.readUInt32LE(localOff) !== SIG_LOCAL) throw new Error(`entrada ZIP inválida: ${nome}`);
    const lNameLen  = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const ini = localOff + 30 + lNameLen + lExtraLen;
    const dados = buf.subarray(ini, ini + compSize);

    if (metodo === 0) entradas.set(nome, Buffer.from(dados));
    else if (metodo === 8) entradas.set(nome, inflateRawSync(dados));
    else throw new Error(`método de compressão ${metodo} não suportado em ${nome}`);
  }
  return entradas;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

/** Texto de um <si> ou <is>: concatena todos os <t> (rich text tem vários). */
function textoDe(xmlTrecho: string): string {
  const partes = [...xmlTrecho.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => decodeXml(m[1]));
  return partes.join("");
}

/** "A" → 0, "Z" → 25, "AA" → 26. */
export function colunaParaIndice(letras: string): number {
  let n = 0;
  for (const ch of letras.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Serial do Excel (sistema 1900) → YYYY-MM-DD. 45536 = 2024-09-01. */
export function excelSerialParaIso(serial: number): string {
  // O Excel conta 1900 como bissexto (bug histórico): seriais ≥ 61 têm 1 dia a mais.
  const dias = Math.floor(serial) - (serial >= 61 ? 2 : 1);
  const ms = Date.UTC(1900, 0, 1) + dias * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Nome do arquivo da primeira planilha, pela ordem do workbook.xml. */
function primeiraPlanilha(entradas: Map<string, Buffer>): string {
  const wb = entradas.get("xl/workbook.xml")?.toString("utf8") ?? "";
  const rels = entradas.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";
  const primeira = wb.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1] ?? wb.match(/<sheet\b[^>]*\bid="([^"]+)"/)?.[1];
  if (primeira) {
    const alvo = rels.match(new RegExp(`<Relationship\\b[^>]*\\bId="${primeira}"[^>]*\\bTarget="([^"]+)"`))?.[1]
      ?? rels.match(new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${primeira}"`))?.[1];
    if (alvo) {
      const caminho = alvo.startsWith("/") ? alvo.slice(1) : `xl/${alvo}`;
      if (entradas.has(caminho)) return caminho;
    }
  }
  const candidatos = [...entradas.keys()].filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort();
  if (candidatos.length === 0) throw new Error("o .xlsx não tem nenhuma planilha");
  return candidatos[0];
}

/** Lê a primeira planilha como tabela de strings (números ficam como o Excel gravou, ex.: "1234.5"). */
export function lerXlsx(bytes: Buffer | Uint8Array): Tabela {
  const entradas = lerZip(bytes);

  const shared: string[] = [];
  const ss = entradas.get("xl/sharedStrings.xml")?.toString("utf8");
  if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textoDe(m[1]));

  const sheet = entradas.get(primeiraPlanilha(entradas))!.toString("utf8");
  const linhasBrutas: string[][] = [];

  for (const row of sheet.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const corpo = row[1] ?? "";
    const celulas: string[] = [];
    for (const c of corpo.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const inner = c[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const tipo = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "n";
      const idx = ref ? colunaParaIndice(ref) : celulas.length;

      let valor = "";
      if (tipo === "s") {
        const i = parseInt(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "", 10);
        valor = Number.isFinite(i) ? (shared[i] ?? "") : "";
      } else if (tipo === "inlineStr") {
        valor = textoDe(inner);
      } else if (tipo === "b") {
        valor = (inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "") === "1" ? "VERDADEIRO" : "FALSO";
      } else {
        valor = decodeXml(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
      }
      while (celulas.length < idx) celulas.push("");
      celulas[idx] = valor.trim();
    }
    linhasBrutas.push(celulas);
  }

  const naoVazias = linhasBrutas.filter(r => r.some(c => c.length > 0));
  const cabecalho = (naoVazias[0] ?? []).map(c => c.trim());
  const linhas = naoVazias.slice(1).map(r => {
    const out = r.slice(0, cabecalho.length);
    while (out.length < cabecalho.length) out.push("");
    return out;
  });
  return { cabecalho, linhas, separador: "xlsx", codificacao: "xlsx", totalLinhas: linhas.length };
}
