/**
 * Tests: lib/planilha/xlsx.ts — leitor mínimo de .xlsx.
 *
 * O .xlsx é montado aqui mesmo (ZIP + XML), sem biblioteca: é o mesmo formato
 * que o Excel grava, e o teste cobre store e deflate, shared strings (com
 * rich text e entidades), inline strings, números, booleanos, fórmulas com
 * valor cacheado, células puladas, linhas vazias e a ordem do workbook.
 */

import { deflateRawSync } from "node:zlib";
import { lerZip, lerXlsx, ehXlsx, colunaParaIndice, excelSerialParaIso } from "@/lib/planilha/xlsx";

// ── construtor de ZIP para o teste ───────────────────────────────────────────

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(arquivos: Record<string, string>, metodo: 0 | 8 = 8): Buffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let offset = 0;
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const dados = Buffer.from(conteudo, "utf8");
    const comp = metodo === 8 ? deflateRawSync(dados) : dados;
    const nomeB = Buffer.from(nome, "utf8");
    const crc = crc32(dados);

    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0, 6); l.writeUInt16LE(metodo, 8);
    l.writeUInt16LE(0, 10); l.writeUInt16LE(0, 12); l.writeUInt32LE(crc, 14);
    l.writeUInt32LE(comp.length, 18); l.writeUInt32LE(dados.length, 22); l.writeUInt16LE(nomeB.length, 26); l.writeUInt16LE(0, 28);
    locais.push(l, nomeB, comp);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0, 8); c.writeUInt16LE(metodo, 10);
    c.writeUInt16LE(0, 12); c.writeUInt16LE(0, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(dados.length, 24);
    c.writeUInt16LE(nomeB.length, 28); c.writeUInt16LE(0, 30); c.writeUInt16LE(0, 32); c.writeUInt16LE(0, 34); c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38); c.writeUInt32LE(offset, 42);
    centrais.push(c, nomeB);

    offset += l.length + nomeB.length + comp.length;
  }
  const cd = Buffer.concat(centrais);
  const n = Object.keys(arquivos).length;
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(0, 4); e.writeUInt16LE(0, 6); e.writeUInt16LE(n, 8); e.writeUInt16LE(n, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(offset, 16); e.writeUInt16LE(0, 20);
  return Buffer.concat([...locais, cd, e]);
}

const SHARED = `<?xml version="1.0"?><sst count="4" uniqueCount="4">
<si><t>numero_nota</t></si>
<si><t>Descrição</t></si>
<si><r><rPr><b/></rPr><t>SAL </t></r><r><t>&amp; MINERAL</t></r></si>
<si><t xml:space="preserve"> com espaço </t></si>
</sst>`;

const SHEET1 = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>data_emissao</t></is></c><c r="D1" t="inlineStr"><is><t>ok</t></is></c></row>
<row r="2"><c r="A2"><v>1001</v></c><c r="B2" t="s"><v>2</v></c><c r="C2" s="14"><v>45536</v></c><c r="D2" t="b"><v>1</v></c></row>
<row r="3"/>
<row r="4"><c r="A4" t="str"><f>A2+1</f><v>1002</v></c><c r="D4"><v>3.5</v></c></row>
<row r="5"><c r="A5" t="s"><v>3</v></c><c r="B5"/></row>
</sheetData></worksheet>`;

const SHEET2 = `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>outra</t></is></c></row></sheetData></worksheet>`;

const WORKBOOK = `<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Notas" sheetId="1" r:id="rId7"/><sheet name="Outra" sheetId="2" r:id="rId8"/></sheets></workbook>`;
const RELS = `<Relationships><Relationship Id="rId8" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId7" Type="x" Target="worksheets/sheet2.xml"/></Relationships>`;

// Repare: rId7 (primeira do workbook) aponta para sheet2.xml — o leitor tem
// de seguir o workbook, não o nome do arquivo.
const ARQUIVOS = {
  "[Content_Types].xml": "<Types/>",
  "xl/workbook.xml": WORKBOOK,
  "xl/_rels/workbook.xml.rels": RELS,
  "xl/sharedStrings.xml": SHARED,
  "xl/worksheets/sheet1.xml": SHEET2,
  "xl/worksheets/sheet2.xml": SHEET1,
};

describe("ehXlsx / lerZip", () => {
  it("reconhece a assinatura PK e rejeita o que não é zip", () => {
    expect(ehXlsx(zip(ARQUIVOS))).toBe(true);
    expect(ehXlsx(Buffer.from("%PDF-1.4"))).toBe(false);
    expect(() => lerZip(Buffer.from("isso nao e um zip, mas tem mais de 22 bytes"))).toThrow(/ZIP/);
  });
  it("lê entradas em deflate e em store", () => {
    for (const metodo of [8, 0] as const) {
      const z = lerZip(zip(ARQUIVOS, metodo));
      expect(z.get("xl/workbook.xml")!.toString("utf8")).toBe(WORKBOOK);
      expect(z.size).toBe(6);
    }
  });
});

describe("lerXlsx", () => {
  const t = lerXlsx(zip(ARQUIVOS));

  it("segue a ordem do workbook para achar a primeira planilha", () => {
    expect(t.cabecalho).toEqual(["numero_nota", "Descrição", "data_emissao", "ok"]);
  });
  it("shared strings com rich text e entidades, número, serial de data, booleano", () => {
    expect(t.linhas[0]).toEqual(["1001", "SAL & MINERAL", "45536", "VERDADEIRO"]);
  });
  it("linha vazia some; fórmula usa o valor cacheado; célula pulada vira vazio", () => {
    expect(t.linhas[1]).toEqual(["1002", "", "", "3.5"]);
  });
  it("célula auto-fechada e string com espaços preservados (trim no fim)", () => {
    expect(t.linhas[2]).toEqual(["com espaço", "", "", ""]);
    expect(t.totalLinhas).toBe(3);
    expect(t.separador).toBe("xlsx");
  });
  it("sem workbook.xml cai no menor sheetN.xml", () => {
    const semWb = { ...ARQUIVOS } as Record<string, string>;
    delete semWb["xl/workbook.xml"];
    delete semWb["xl/_rels/workbook.xml.rels"];
    expect(lerXlsx(zip(semWb)).cabecalho).toEqual(["outra"]);
  });
});

describe("helpers", () => {
  it("colunaParaIndice", () => {
    expect(colunaParaIndice("A")).toBe(0);
    expect(colunaParaIndice("Z")).toBe(25);
    expect(colunaParaIndice("AA")).toBe(26);
    expect(colunaParaIndice("AZ")).toBe(51);
  });
  it("excelSerialParaIso — inclusive o bug do ano 1900", () => {
    expect(excelSerialParaIso(45292)).toBe("2024-01-01");
    expect(excelSerialParaIso(45536)).toBe("2024-09-01");
    expect(excelSerialParaIso(46266)).toBe("2026-09-01");
    expect(excelSerialParaIso(1)).toBe("1900-01-01");
    expect(excelSerialParaIso(61)).toBe("1900-03-01");
  });
});
