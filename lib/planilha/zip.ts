/**
 * ZIP — escritor mínimo, sem dependência (o leitor é `lerZip`, em lib/planilha/xlsx.ts).
 *
 * Por que próprio: o .xlsx é um ZIP com XML dentro, e o export "seus dados"
 * é um ZIP de CSVs. O Node já traz `deflateRawSync`; faltava montar os
 * cabeçalhos e calcular o CRC-32. Cobre: deflate (ou store, quando comprimir
 * não compensa), nomes UTF-8 (bit 11) e data/hora DOS no horário de Brasília.
 *
 * Não cobre ZIP64: até 65.535 arquivos e 4 GB — ordens de grandeza acima de
 * uma planilha ou do export de uma fazenda. Passou disso, lança erro claro em
 * vez de gerar arquivo corrompido.
 */

import { deflateRawSync } from "node:zlib";

export type ArquivoZip = { nome: string; conteudo: string | Uint8Array };

const SIG_LOCAL = 0x04034b50;
const SIG_CDIR = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const LIMITE_32 = 0xffffffff;

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 do ZIP (polinômio 0xEDB88320). Valor de conferência: crc32("123456789") = 0xCBF43926. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Data e hora no formato DOS (resolução de 2 s). O ZIP não guarda fuso:
 * gravamos o horário de Brasília, que é o que o produtor vê no relógio.
 */
export function dataHoraDos(agora: Date): { data: number; hora: number } {
  const p: Record<string, string> = {};
  for (const parte of new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(agora)) p[parte.type] = parte.value;

  const ano = Math.min(2107, Math.max(1980, Number(p.year)));
  return {
    data: ((ano - 1980) << 9) | (Number(p.month) << 5) | Number(p.day),
    hora: ((Number(p.hour) % 24) << 11) | (Number(p.minute) << 5) | (Number(p.second) >> 1),
  };
}

/** Empacota os arquivos num ZIP. A ordem de entrada é mantida (o .xlsx pede [Content_Types].xml primeiro). */
export function gerarZip(arquivos: ArquivoZip[], agora: Date = new Date()): Buffer {
  if (arquivos.length > 0xffff) throw new Error("ZIP com arquivos demais (limite de 65.535 sem ZIP64)");
  const { data, hora } = dataHoraDos(agora);
  const vistos = new Set<string>();
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let offset = 0;

  for (const arquivo of arquivos) {
    const nome = arquivo.nome.replace(/\\/g, "/");
    if (!nome || nome.startsWith("/") || nome.split("/").includes("..")) {
      throw new Error(`nome inválido no ZIP: ${arquivo.nome}`);
    }
    if (vistos.has(nome)) throw new Error(`arquivo repetido no ZIP: ${nome}`);
    vistos.add(nome);

    const dados = typeof arquivo.conteudo === "string"
      ? Buffer.from(arquivo.conteudo, "utf8")
      : Buffer.from(arquivo.conteudo);
    if (dados.length > LIMITE_32) throw new Error(`arquivo grande demais para ZIP sem ZIP64: ${nome}`);

    // Deflate só quando ganha espaço; arquivo minúsculo vai em store (método 0).
    const comprimido = deflateRawSync(dados, { level: 9 });
    const deflate = comprimido.length < dados.length;
    const corpo = deflate ? comprimido : dados;
    const metodo = deflate ? 8 : 0;
    const nomeBytes = Buffer.from(nome, "utf8");
    const flags = /[^\x20-\x7e]/.test(nome) ? 0x0800 : 0; // bit 11: nome em UTF-8
    const crc = crc32(dados);
    if (offset > LIMITE_32) throw new Error("ZIP grande demais (limite de 4 GB sem ZIP64)");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(20, 4);            // versão necessária: 2.0 (deflate)
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(metodo, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(data, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(corpo.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBytes.length, 26);
    local.writeUInt16LE(0, 28);            // sem campo extra
    locais.push(local, nomeBytes, corpo);

    const central = Buffer.alloc(46);      // zerado: extra, comentário, disco e atributos ficam 0
    central.writeUInt32LE(SIG_CDIR, 0);
    central.writeUInt16LE(20, 4);          // gravado por: 2.0, MS-DOS
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(data, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(corpo.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nomeBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrais.push(central, nomeBytes);

    offset += 30 + nomeBytes.length + corpo.length;
  }

  const diretorio = Buffer.concat(centrais);
  if (offset > LIMITE_32 || diretorio.length > LIMITE_32) throw new Error("ZIP grande demais (limite de 4 GB sem ZIP64)");
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(SIG_EOCD, 0);
  fim.writeUInt16LE(arquivos.length, 8);   // entradas neste disco
  fim.writeUInt16LE(arquivos.length, 10);  // entradas no total
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(offset, 16);
  return Buffer.concat([...locais, diretorio, fim]);
}
