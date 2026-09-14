/**
 * Tests: lib/planilha/csv.ts — o que o Excel brasileiro exporta de verdade.
 */

import { parseCsv, parseCsvTexto, detectarSeparador, decodificar, gerarCsv } from "@/lib/planilha/csv";

describe("detectarSeparador", () => {
  it("ponto e vírgula, vírgula e tab", () => {
    expect(detectarSeparador("a;b;c")).toBe(";");
    expect(detectarSeparador("a,b,c")).toBe(",");
    expect(detectarSeparador("a\tb\tc")).toBe("\t");
  });
  it("empate entre ; e , fica com ; (padrão BR)", () => {
    expect(detectarSeparador("a;b,c;d,e")).toBe(";");
  });
  it("sem separador assume ;", () => {
    expect(detectarSeparador("so-uma-coluna")).toBe(";");
  });
});

describe("decodificar", () => {
  it("UTF-8 com BOM perde o BOM", () => {
    const { texto, codificacao } = decodificar(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("ração", "utf8")]));
    expect(texto).toBe("ração");
    expect(codificacao).toBe("UTF-8");
  });
  it("Latin-1 (Excel Windows) é reconhecido", () => {
    const { texto, codificacao } = decodificar(Buffer.from("ração;vermífugo", "latin1"));
    expect(texto).toBe("ração;vermífugo");
    expect(codificacao).toBe("Latin-1");
  });
});

describe("parseCsvTexto", () => {
  it("campos entre aspas com ; e quebra de linha dentro", () => {
    const { cabecalho, linhas } = parseCsvTexto('a;b\r\n"x;y";"linha 1\nlinha 2"\r\n');
    expect(cabecalho).toEqual(["a", "b"]);
    expect(linhas).toEqual([["x;y", "linha 1\nlinha 2"]]);
  });
  it("aspas duplas escapadas", () => {
    const { linhas } = parseCsvTexto('a\n"diz ""oi"""');
    expect(linhas).toEqual([['diz "oi"']]);
  });
  it("linhas vazias são ignoradas e linhas curtas são completadas", () => {
    const { linhas } = parseCsvTexto("a;b;c\n1;2\n\n\n4;5;6;7\n");
    expect(linhas).toEqual([["1", "2", ""], ["4", "5", "6"]]);
  });
  it("separador explícito vence a detecção", () => {
    const { cabecalho } = parseCsvTexto("a,b;c", ",");
    expect(cabecalho).toEqual(["a", "b;c"]);
  });
});

describe("parseCsv (bytes)", () => {
  it("arquivo Latin-1 com ; e decimal com vírgula chega inteiro", () => {
    const t = parseCsv(Buffer.from("descrição;valor\nRAÇÃO;1.234,56\n", "latin1"));
    expect(t.codificacao).toBe("Latin-1");
    expect(t.separador).toBe(";");
    expect(t.linhas).toEqual([["RAÇÃO", "1.234,56"]]);
    expect(t.totalLinhas).toBe(1);
  });
});

describe("gerarCsv", () => {
  it("BOM + ; + escape, e reabre igual", () => {
    const csv = gerarCsv(["a", "b"], [["x;y", 'diz "oi"'], [1, null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    const t = parseCsv(Buffer.from(csv, "utf8"));
    expect(t.cabecalho).toEqual(["a", "b"]);
    expect(t.linhas).toEqual([["x;y", 'diz "oi"'], ["1", ""]]);
  });
});
