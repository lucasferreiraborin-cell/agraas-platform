/**
 * CSV — leitor sem dependência, tolerante ao que o Excel brasileiro exporta:
 * separador `;`, decimal com vírgula, codificação Latin-1 (Windows-1252), BOM
 * do UTF-8, campos entre aspas com `;` e quebras de linha dentro.
 */

export type Tabela = {
  cabecalho: string[];
  linhas: string[][];
  /** "," | ";" | "\t" — ou "xlsx" quando veio de planilha Excel. */
  separador: string;
  codificacao: string;
  /** Linhas de dados (sem o cabeçalho). */
  totalLinhas: number;
};

/** UTF-8 estrito; se não for válido, Latin-1 (o que o Excel BR costuma gravar). */
export function decodificar(bytes: Buffer | Uint8Array): { texto: string; codificacao: "UTF-8" | "Latin-1" } {
  const buf = Buffer.from(bytes);
  try {
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return { texto: texto.replace(/^﻿/, ""), codificacao: "UTF-8" };
  } catch {
    return { texto: buf.toString("latin1"), codificacao: "Latin-1" };
  }
}

/** Separador pela contagem na primeira linha — `;` ganha empate com `,` (padrão BR). */
export function detectarSeparador(primeiraLinha: string): "," | ";" | "\t" {
  const conta = (ch: string) => (primeiraLinha.match(new RegExp(ch === "\t" ? "\t" : `\\${ch}`, "g")) ?? []).length;
  const candidatos: Array<[";" | "," | "\t", number]> = [[";", conta(";")], ["\t", conta("\t")], [",", conta(",")]];
  candidatos.sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : ";";
}

/** Máquina de estados RFC 4180: aspas duplas escapam aspas, e quebra dentro de aspas é conteúdo. */
export function parseCsvTexto(texto: string, separador?: string): { cabecalho: string[]; linhas: string[][]; separador: string } {
  const normalizado = texto.replace(/\r\n?/g, "\n");
  const primeira = normalizado.split("\n").find(l => l.trim().length > 0) ?? "";
  const sep = separador ?? detectarSeparador(primeira);

  const registros: string[][] = [];
  let campo = "";
  let registro: string[] = [];
  let entreAspas = false;

  for (let i = 0; i < normalizado.length; i++) {
    const ch = normalizado[i];
    if (entreAspas) {
      if (ch === '"') {
        if (normalizado[i + 1] === '"') { campo += '"'; i++; }
        else entreAspas = false;
      } else campo += ch;
      continue;
    }
    if (ch === '"') { entreAspas = true; continue; }
    if (ch === sep) { registro.push(campo); campo = ""; continue; }
    if (ch === "\n") { registro.push(campo); registros.push(registro); registro = []; campo = ""; continue; }
    campo += ch;
  }
  if (campo.length > 0 || registro.length > 0) { registro.push(campo); registros.push(registro); }

  const limpos = registros
    .map(r => r.map(c => c.trim()))
    .filter(r => r.some(c => c.length > 0));

  const cabecalho = limpos[0] ?? [];
  const linhas = limpos.slice(1).map(r => {
    // alinha ao cabeçalho: sobra é descartada, falta vira ""
    const out = r.slice(0, cabecalho.length);
    while (out.length < cabecalho.length) out.push("");
    return out;
  });
  return { cabecalho, linhas, separador: sep };
}

export function parseCsv(bytes: Buffer | Uint8Array): Tabela {
  const { texto, codificacao } = decodificar(bytes);
  const { cabecalho, linhas, separador } = parseCsvTexto(texto);
  return { cabecalho, linhas, separador, codificacao, totalLinhas: linhas.length };
}

/** Gera CSV com `;` e BOM — é o que o Excel BR abre com acentos e colunas certas. */
export function gerarCsv(cabecalho: string[], linhas: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const corpo = [cabecalho, ...linhas].map(r => r.map(esc).join(";")).join("\r\n");
  return "﻿" + corpo + "\r\n";
}
