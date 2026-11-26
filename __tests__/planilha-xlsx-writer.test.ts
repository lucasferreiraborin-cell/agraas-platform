/**
 * Tests: lib/planilha/zip.ts + lib/planilha/xlsx-writer.ts — escritor de .xlsx sem dependência.
 *
 * Confere o ZIP byte a byte (assinaturas, CRC, tamanhos, flag UTF-8, offsets),
 * a estrutura OOXML (partes, content types, relações, XML bem formado) e o
 * caminho de volta pelo leitor do próprio projeto (`lerXlsx`).
 */

import * as zlib from "node:zlib";
import { crc32, dataHoraDos, gerarZip } from "@/lib/planilha/zip";
import {
  colunaLetra, criterioIgual, faixa, gerarXlsx, isoParaSerialExcel, limparTextoXml, linhasDaPlanilha, refPlanilha,
  textoFormula, type PlanilhaXlsx,
} from "@/lib/planilha/xlsx-writer";
import { excelSerialParaIso, lerXlsx, lerZip } from "@/lib/planilha/xlsx";

// ── leitura independente do diretório central (lerZip não confere CRC) ───────

type Entrada = { nome: string; metodo: number; flags: number; crc: number; comp: number; tam: number; offset: number };

function diretorio(buf: Buffer): Entrada[] {
  const eocd = buf.length - 22;
  expect(buf.readUInt32LE(eocd)).toBe(0x06054b50);
  const total = buf.readUInt16LE(eocd + 10);
  const tamanhoCd = buf.readUInt32LE(eocd + 12);
  const inicioCd = buf.readUInt32LE(eocd + 16);
  expect(inicioCd + tamanhoCd).toBe(eocd);
  expect(buf.readUInt16LE(eocd + 8)).toBe(total);

  const saida: Entrada[] = [];
  let p = inicioCd;
  for (let i = 0; i < total; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const tamNome = buf.readUInt16LE(p + 28);
    saida.push({
      flags: buf.readUInt16LE(p + 8), metodo: buf.readUInt16LE(p + 10), crc: buf.readUInt32LE(p + 16),
      comp: buf.readUInt32LE(p + 20), tam: buf.readUInt32LE(p + 24), offset: buf.readUInt32LE(p + 42),
      nome: buf.subarray(p + 46, p + 46 + tamNome).toString("utf8"),
    });
    p += 46 + tamNome + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return saida;
}

/** Verificador mínimo de XML bem formado: tags balanceadas, sem < > ou & soltos no texto e nos atributos. */
function bemFormado(xml: string, parte: string): void {
  const corpo = xml.replace(/^<\?xml[^?]*\?>\s*/, "");
  const tag = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  const entidadeSolta = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;
  const pilha: string[] = [];
  let pos = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(corpo))) {
    const texto = corpo.slice(pos, m.index);
    if (/[<>]/.test(texto) || entidadeSolta.test(texto)) throw new Error(`${parte}: texto inválido perto de "${texto.slice(0, 40)}"`);
    if (/</.test(m[3]) || entidadeSolta.test(m[3])) throw new Error(`${parte}: atributo inválido em <${m[2]}>`);
    pos = tag.lastIndex;
    if (m[1]) {
      const aberta = pilha.pop();
      if (aberta !== m[2]) throw new Error(`${parte}: </${m[2]}> fecha <${aberta}>`);
    } else if (!m[4]) pilha.push(m[2]);
  }
  expect(corpo.slice(pos).trim()).toBe("");
  expect(pilha).toEqual([]);
}

// ── ZIP ──────────────────────────────────────────────────────────────────────

describe("crc32", () => {
  it("bate com o valor de conferência do padrão", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
  it("bate com o zlib do Node em dados variados", () => {
    const nativo = (zlib as unknown as { crc32?: (b: Uint8Array) => number }).crc32;
    if (!nativo) return; // Node sem zlib.crc32: o valor de conferência acima já cobre
    for (const tamanho of [1, 7, 255, 4096, 70_000]) {
      const b = Buffer.alloc(tamanho);
      for (let i = 0; i < tamanho; i++) b[i] = (i * 31 + tamanho) & 0xff;
      expect(crc32(b)).toBe(nativo(b) >>> 0);
    }
  });
});

describe("gerarZip", () => {
  const grande = "linha repetida do CSV;1234,50\r\n".repeat(400);
  const arquivos = [
    { nome: "LEIAME.txt", conteudo: "oi" },
    { nome: "dados/grande.csv", conteudo: grande },
    { nome: "xml/ação-çã.xml", conteudo: "<a>ç</a>" },
    { nome: "vazio.txt", conteudo: "" },
    { nome: "bin.dat", conteudo: new Uint8Array([0, 1, 2, 250, 255]) },
  ];
  const buf = gerarZip(arquivos, new Date("2026-11-25T13:32:10Z"));
  const cd = diretorio(buf);

  it("ida e volta pelo leitor do projeto, na ordem de entrada", () => {
    const z = lerZip(buf);
    expect([...z.keys()]).toEqual(arquivos.map((a) => a.nome));
    expect(z.get("dados/grande.csv")!.toString("utf8")).toBe(grande);
    expect(z.get("xml/ação-çã.xml")!.toString("utf8")).toBe("<a>ç</a>");
    expect(z.get("vazio.txt")!.length).toBe(0);
    expect([...z.get("bin.dat")!]).toEqual([0, 1, 2, 250, 255]);
  });

  it("CRC, tamanhos e cabeçalho local coerentes com o diretório central", () => {
    const z = lerZip(buf);
    for (const e of cd) {
      const dados = z.get(e.nome)!;
      expect(e.crc).toBe(crc32(dados));
      expect(e.tam).toBe(dados.length);
      expect(buf.readUInt32LE(e.offset)).toBe(0x04034b50);
      expect(buf.readUInt32LE(e.offset + 14)).toBe(e.crc);
      expect(buf.readUInt32LE(e.offset + 18)).toBe(e.comp);
      const tamNome = buf.readUInt16LE(e.offset + 26);
      expect(buf.subarray(e.offset + 30, e.offset + 30 + tamNome).toString("utf8")).toBe(e.nome);
    }
  });

  it("comprime o que vale a pena, guarda o resto e marca nome UTF-8", () => {
    const porNome = new Map(cd.map((e) => [e.nome, e]));
    expect(porNome.get("dados/grande.csv")!.metodo).toBe(8);
    expect(porNome.get("dados/grande.csv")!.comp).toBeLessThan(grande.length / 10);
    expect(porNome.get("LEIAME.txt")!.metodo).toBe(0);
    expect(porNome.get("xml/ação-çã.xml")!.flags & 0x0800).toBe(0x0800);
    expect(porNome.get("LEIAME.txt")!.flags & 0x0800).toBe(0);
  });

  it("data DOS no horário de Brasília", () => {
    const { data, hora } = dataHoraDos(new Date("2026-11-25T13:32:10Z")); // 10:32:10 em Brasília
    expect(data).toBe(((2026 - 1980) << 9) | (11 << 5) | 25);
    expect(hora).toBe((10 << 11) | (32 << 5) | 5);
    expect(buf.readUInt16LE(cd[0].offset + 12)).toBe(data);
  });

  it("recusa nome repetido, absoluto ou com ..", () => {
    expect(() => gerarZip([{ nome: "a.txt", conteudo: "1" }, { nome: "a.txt", conteudo: "2" }])).toThrow(/repetido/);
    expect(() => gerarZip([{ nome: "/etc/x", conteudo: "1" }])).toThrow(/inválido/);
    expect(() => gerarZip([{ nome: "a/../b", conteudo: "1" }])).toThrow(/inválido/);
  });
});

// ── Ajudantes de referência ─────────────────────────────────────────────────

describe("referências e fórmulas", () => {
  it("colunaLetra", () => {
    expect(colunaLetra(0)).toBe("A");
    expect(colunaLetra(25)).toBe("Z");
    expect(colunaLetra(26)).toBe("AA");
    expect(colunaLetra(701)).toBe("ZZ");
    expect(colunaLetra(702)).toBe("AAA");
  });
  it("aba entre apóstrofos, faixa, literal e critério exato", () => {
    expect(refPlanilha("Títulos pagos e recebidos")).toBe("'Títulos pagos e recebidos'");
    expect(refPlanilha("D'Ávila")).toBe("'D''Ávila'");
    expect(faixa(7, 2, 40)).toBe("H2:H40");
    expect(faixa(0, 2, 3, "Em aberto")).toBe("'Em aberto'!A2:A3");
    expect(textoFormula('diz "oi"')).toBe('"diz ""oi"""');
    expect(criterioIgual("Trator *")).toBe('"=Trator ~*"');
    expect(criterioIgual("<5 anos?")).toBe('"=<5 anos~?"');
  });
  it("linhas da aba: cabeçalho, dados e rodapé depois de uma linha em branco", () => {
    expect(linhasDaPlanilha({ colunas: [1], linhas: [1, 2, 3] })).toEqual({ inicioDados: 2, fimDados: 4, inicioRodape: 6 });
    expect(linhasDaPlanilha({ colunas: [1], linhas: [] })).toEqual({ inicioDados: 2, fimDados: 1, inicioRodape: 3 });
    expect(linhasDaPlanilha({ linhas: [1] })).toEqual({ inicioDados: 1, fimDados: 1, inicioRodape: 3 });
  });
  it("data ISO ↔ série do Excel, ida e volta", () => {
    expect(isoParaSerialExcel("2026-11-05")).toBe(46331);
    expect(isoParaSerialExcel("2024-09-01")).toBe(45536);
    expect(isoParaSerialExcel("2026-02-30")).toBeNull();
    expect(isoParaSerialExcel("05/11/2026")).toBeNull();
    for (const iso of ["2000-01-01", "2024-02-29", "2026-12-31"]) expect(excelSerialParaIso(isoParaSerialExcel(iso)!)).toBe(iso);
  });
  it("limpa o que o XML não aceita e normaliza CR solto", () => {
    expect(limparTextoXml("a\u0001b\u0000c\u000bd")).toBe("abcd");
    expect(limparTextoXml("x\ud800y")).toBe("xy");
    expect(limparTextoXml("emoji 🐂 ok")).toBe("emoji 🐂 ok");
    expect(limparTextoXml("um\rdois\r\ntrês")).toBe("um\ndois\ntrês");
  });
});

// ── XLSX ─────────────────────────────────────────────────────────────────────

const DADOS: PlanilhaXlsx = {
  nome: "Títulos",
  colunas: [
    { titulo: "Data", formato: "data" },
    { titulo: "CPF/CNPJ", formato: "texto" },
    { titulo: "Parcela", formato: "texto" },
    { titulo: "Descrição", formato: "texto" },
    { titulo: "Valor (R$)", formato: "decimal2" },
    { titulo: "Pago", formato: "geral" },
  ],
  linhas: [
    ["2026-11-05", "01.963.040/0061-32", "001", "Ração São José & Cia <granel>", 1234.5, true],
    ["2026-11-10", "01963040006132", "1/3", "=1+1", "980.10", false],
    ["2026-11-12", null, "", "linha1\rlinha2 _x000D_\u0007", { v: 10, f: "ROUND(E2/123.45,2)" }, null],
  ],
  rodape: [[{ v: "Total", negrito: true, formato: "texto" }, null, null, null, { f: "SUM(E2:E4)", v: 2224.6, negrito: true }]],
};
const RESUMO: PlanilhaXlsx = {
  nome: "Resumo",
  larguras: [40, 18],
  linhas: [
    [{ v: "Pacote do contador — Fazenda Boa Esperança", estilo: "titulo" }],
    ["Total pago", { f: `SUM(${faixa(4, 2, 4, "Títulos")})`, v: 2224.6, formato: "decimal2" }],
    [{ v: "Confira antes de escriturar.", estilo: "nota" }],
  ],
};

describe("gerarXlsx", () => {
  const buf = gerarXlsx([DADOS, RESUMO], { titulo: "Pacote — teste & cia", autor: "Agraas Gestão", criadoEm: new Date("2026-11-25T13:00:00Z") });
  const z = lerZip(buf);
  const parte = (nome: string) => z.get(nome)!.toString("utf8");

  it("tem as partes mínimas do OOXML, com [Content_Types].xml primeiro", () => {
    expect(diretorio(buf)[0].nome).toBe("[Content_Types].xml");
    for (const p of [
      "[Content_Types].xml", "_rels/.rels", "docProps/core.xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels",
      "xl/styles.xml", "xl/sharedStrings.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml",
    ]) expect(z.has(p)).toBe(true);
    const ct = parte("[Content_Types].xml");
    expect(ct).toContain('PartName="/xl/worksheets/sheet2.xml"');
    expect(ct).toContain("spreadsheetml.sharedStrings+xml");
    expect(ct).toContain("spreadsheetml.styles+xml");
  });

  it("todo XML é bem formado e toda relação aponta para parte existente", () => {
    for (const [nome, conteudo] of z) if (nome.endsWith(".xml") || nome.endsWith(".rels")) bemFormado(conteudo.toString("utf8"), nome);
    const rels = parte("xl/_rels/workbook.xml.rels");
    for (const m of rels.matchAll(/Target="([^"]+)"/g)) expect(z.has(`xl/${m[1]}`)).toBe(true);
    for (const m of parte("_rels/.rels").matchAll(/Target="([^"]+)"/g)) expect(z.has(m[1])).toBe(true);
  });

  it("workbook: abas na ordem, filtro nomeado e recálculo ao abrir", () => {
    const wb = parte("xl/workbook.xml");
    expect([...wb.matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1])).toEqual(["Títulos", "Resumo"]);
    expect(wb).toContain(`<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Títulos'!$A$1:$F$4</definedName>`);
    expect(wb).toContain('fullCalcOnLoad="1"');
    expect(parte("docProps/core.xml")).toContain("<dc:title>Pacote — teste &amp; cia</dc:title>");
  });

  it("estilos: data dd/mm/yyyy, decimais e cabeçalho em negrito com preenchimento", () => {
    const st = parte("xl/styles.xml");
    expect(st).toContain('formatCode="dd/mm/yyyy"');
    expect(st).toContain('formatCode="#,##0.0000"');
    expect(st).toContain('numFmtId="4"');   // #,##0.00 embutido
    expect(st).toContain('numFmtId="49"');  // @ (texto)
    expect(st).toMatch(/<fill><patternFill patternType="none"\/><\/fill><fill><patternFill patternType="gray125"\/><\/fill>/);
  });

  it("aba de dados: cabeçalho fixo, filtro só nos dados, rodapé depois de linha em branco", () => {
    const s1 = parte("xl/worksheets/sheet1.xml");
    expect(s1).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
    expect(s1).toContain('<autoFilter ref="A1:F4"/>');
    expect(s1).toContain('tabSelected="1"');
    expect(s1).toMatch(/<row r="6"><c r="A6"[^>]*t="s"/);
    expect(s1).not.toContain('<row r="5"');
    expect(s1).toContain("<f>SUM(E2:E4)</f><v>2224.6</v>");
    expect(s1).toContain('<dimension ref="A1:F6"/>');
    const s2 = parte("xl/worksheets/sheet2.xml");
    expect(s2).not.toContain("tabSelected");
    expect(s2).toContain("<f>SUM('Títulos'!E2:E4)</f><v>2224.6</v>");
    expect(s2).toContain('<col min="1" max="1" width="40" customWidth="1"/>');
  });

  it("textos: compartilhados, escapados, sem controle, CR normalizado e _xHHHH_ preservado", () => {
    const ss = parte("xl/sharedStrings.xml");
    expect(ss).toContain("Ração São José &amp; Cia &lt;granel&gt;");
    expect(ss).toContain('<t xml:space="preserve">linha1\nlinha2 _x005F_x000D_</t>');
    expect(ss).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
    const unicos = Number(ss.match(/uniqueCount="(\d+)"/)![1]);
    expect(ss.match(/<si>/g)!.length).toBe(unicos);
  });

  it("volta pelo lerXlsx: texto continua texto (zero à esquerda, 1/3, =1+1), número e data no lugar", () => {
    const t = lerXlsx(buf);
    expect(t.cabecalho).toEqual(["Data", "CPF/CNPJ", "Parcela", "Descrição", "Valor (R$)", "Pago"]);
    const [l1, l2, l3, rodape] = t.linhas;
    expect(excelSerialParaIso(Number(l1[0]))).toBe("2026-11-05");
    expect(l1.slice(1)).toEqual(["01.963.040/0061-32", "001", "Ração São José & Cia <granel>", "1234.5", "VERDADEIRO"]);
    expect(l2.slice(1)).toEqual(["01963040006132", "1/3", "=1+1", "980.1", "FALSO"]);
    expect(l3[1]).toBe("");
    expect(l3[4]).toBe("10");
    expect(rodape[0]).toBe("Total");
    expect(rodape[4]).toBe("2224.6");
  });

  it("célula de texto é gravada como texto, não como número", () => {
    const s1 = parte("xl/worksheets/sheet1.xml");
    const b3 = s1.match(/<c r="B3" s="(\d+)" t="s">/);
    expect(b3).not.toBeNull();
    const c3 = s1.match(/<c r="C3" s="(\d+)" t="s">/);
    expect(c3).not.toBeNull();
    expect(s1).toMatch(/<c r="E3" s="\d+"><v>980.1<\/v><\/c>/); // texto numérico em coluna decimal vira número
  });

  it("recusa aba sem nome válido ou repetida (as fórmulas dependem do nome)", () => {
    const base = { linhas: [["x"]] };
    expect(() => gerarXlsx([{ ...base, nome: "a/b" }])).toThrow(/inválido/);
    expect(() => gerarXlsx([{ ...base, nome: "x".repeat(32) }])).toThrow(/inválido/);
    expect(() => gerarXlsx([{ ...base, nome: "History" }])).toThrow(/inválido/);
    expect(() => gerarXlsx([{ ...base, nome: "Resumo" }, { ...base, nome: "resumo" }])).toThrow(/repetida/);
    expect(() => gerarXlsx([])).toThrow();
  });

  it("aba vazia com cabeçalho ainda é válida", () => {
    const vazio = gerarXlsx([{ nome: "Vazia", colunas: [{ titulo: "A" }, { titulo: "B" }], linhas: [] }]);
    const s = lerZip(vazio).get("xl/worksheets/sheet1.xml")!.toString("utf8");
    bemFormado(s, "vazia");
    expect(s).toContain('<autoFilter ref="A1:B1"/>');
    expect(lerXlsx(vazio).cabecalho).toEqual(["A", "B"]);
  });
});
