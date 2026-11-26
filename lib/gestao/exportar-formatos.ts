/**
 * Formatos de exportação do Agraas Gestão (pacote do contador e "seus dados").
 * Puro — sem I/O, testável.
 *
 * Dois defeitos que este módulo existe para evitar:
 * 1. Zero à esquerda. Aberto no Excel, um CSV com 01963040006132 vira
 *    1963040006132, a parcela "001" vira 1, "1/3" vira 1º de março e a chave
 *    de acesso de 44 dígitos vira 5,2E+43 — e, se o arquivo for salvo, os
 *    dígitos somem de vez. Saída: CPF/CNPJ com pontuação (texto em qualquer
 *    planilha); código só com números escrito como ="0123" no CSV; célula de
 *    texto no XLSX.
 * 2. Quebra de linha solta (\r) no meio de um texto: o Excel lê como fim de
 *    registro e desalinha todas as colunas seguintes (P2 da revisão).
 */

import { atividade } from "./atividades";
import { csvTexto, toNum } from "./resultado";

/* ───────────────────────────── Documentos ───────────────────────────── */

/**
 * CPF (11 dígitos) ou CNPJ (14 posições; desde 07/2026 as 12 primeiras podem
 * ter letras — CNPJ alfanumérico) com a pontuação oficial. O que não for nem
 * um nem outro volta como veio: não inventamos dígito.
 */
export function formatarDocumento(doc: string | null | undefined): string {
  const bruto = (doc ?? "").trim();
  if (!bruto) return "";
  const s = bruto.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (/^\d{11}$/.test(s)) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
  if (/^[0-9A-Z]{12}\d{2}$/.test(s)) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
  return bruto;
}

/**
 * Chave de acesso no formato da NF-e: 44 posições, só dígitos, exceto as 12 do
 * CNPJ do emitente (posições 7 a 18), que podem ter letra maiúscula (CNPJ
 * alfanumérico). Identificador interno (registro manual, migração) não passa:
 * no pacote do contador, chave que não é chave fica em branco.
 */
export function chaveDeAcesso(chave: string | null | undefined): string | null {
  const s = (chave ?? "").replace(/\s/g, "");
  return /^\d{6}[0-9A-Z]{12}\d{26}$/.test(s) ? s : null;
}

export type NotaRef = {
  numero: string | null;
  serie: string | null;
  modelo: string | number | null;
  chave: string | null;
};

/** "NF-e 1234 série 1" — como o contador procura a nota. Venda registrada sem NF-e não finge ser nota. */
export function documentoNota(n: Pick<NotaRef, "numero" | "serie" | "modelo"> | null | undefined): string {
  const numero = (n?.numero ?? "").trim();
  if (!numero) return "";
  if (/^VENDA-BACKFILL/i.test(numero)) return "Venda registrada sem nota";
  const modelo = String(n?.modelo ?? "").replace(/^0+/, "");
  const tipo = modelo === "65" ? "NFC-e" : modelo === "4" ? "NFP" : "NF-e";
  const serie = (n?.serie ?? "").trim();
  const base = /^nf/i.test(numero) ? numero : `${tipo} ${numero}`;
  return serie ? `${base} série ${serie}` : base;
}

/* ───────────────────────────── Rótulos ───────────────────────────── */

export const TIPO_TITULO: Record<string, string> = { pagar: "A pagar", receber: "A receber" };
export const MOVIMENTO: Record<string, string> = { pagar: "Pagamento", receber: "Recebimento" };
export const STATUS_TITULO: Record<string, string> = { aberto: "Em aberto", pago: "Pago", cancelado: "Cancelado" };
export const ORIGEM: Record<string, string> = {
  manual: "Lançamento manual", nfe: "Nota fiscal", planilha: "Planilha", tag: "Tag de abastecimento",
};
export const NATUREZA: Record<string, string> = {
  custo: "Custo", estoque: "Compra para estoque", investimento: "Investimento", financeiro: "Financeiro",
};
export const STATUS_NOTA: Record<string, string> = {
  pending_review: "A conferir", reviewed: "Conferida", rejected: "Rejeitada", archived: "Arquivada",
  pendente: "A conferir", validada: "Conferida", erro: "Com erro",
};
export const FONTE_NOTA: Record<string, string> = {
  xml_upload: "XML", pdf_upload: "PDF", audio_dictation: "Ditado", csv_import: "Planilha",
  sefaz_api: "SEFAZ", manual: "Registro manual", legacy_migration: "Registro anterior",
};
export const DIRECAO: Record<string, string> = { entrada: "Entrada", saida: "Saída" };
export const TIPO_MAQUINA: Record<string, string> = {
  trator: "Trator", caminhonete: "Caminhonete", caminhao: "Caminhão", colheitadeira: "Colheitadeira",
  pulverizador: "Pulverizador", moto: "Moto", outro: "Outro",
};
export const MEDIDOR: Record<string, string> = { horimetro: "Horímetro (h)", odometro: "Odômetro (km)" };

export const rotulo = (mapa: Record<string, string>, v: string | null | undefined) => (v ? mapa[v] ?? v : "");

/** Natureza do título como o contador lê: em conta a receber é sempre receita. */
export function naturezaTitulo(tipo: string, natureza: string | null | undefined): string {
  return tipo === "receber" ? "Receita" : rotulo(NATUREZA, natureza || "custo");
}

export function nomeAtividade(codigo: string | null | undefined): string {
  return codigo ? atividade(codigo).nome : "";
}

export type ContaBancariaRef = {
  banco_nome: string | null; agencia: string | null; conta: string | null; descricao: string | null;
};

/** "Sicredi · ag. 0101 · conta 12345-6" (com a descrição na frente, se houver). */
export function contaBancariaRotulo(c: ContaBancariaRef | null | undefined): string {
  if (!c) return "";
  const partes = [
    c.descricao?.trim(),
    c.banco_nome?.trim(),
    c.agencia?.trim() ? `ag. ${c.agencia.trim()}` : "",
    c.conta?.trim() ? `conta ${c.conta.trim()}` : "",
  ].filter(Boolean);
  return partes.join(" · ");
}

/* ───────────────────────────── Datas ───────────────────────────── */

const PARTES_SP = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

function partesSP(d: Date): Record<string, string> {
  const p: Record<string, string> = {};
  for (const x of PARTES_SP.formatToParts(d)) p[x.type] = x.value;
  p.hour = String(Number(p.hour) % 24).padStart(2, "0");
  return p;
}

/** Timestamp do banco → "2026-11-05 10:00:00" no horário de Brasília. Data pura passa direto. */
export function dataHoraSP(ts: string | null | undefined): string {
  if (!ts) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const p = partesSP(d);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** Timestamp do banco → dia (yyyy-mm-dd) em Brasília. Nota emitida às 22h de 30/11 é de novembro. */
export function diaSP(ts: string | null | undefined): string | null {
  const s = dataHoraSP(ts);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

/** "25/11/2026 às 10:32" no horário de Brasília. */
export function momentoBR(d: Date): string {
  const p = partesSP(d);
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}

/* ───────────────────────────── CSV ───────────────────────────── */

/** Tira caracteres de controle (menos tab, LF e CR). */
export function semControle(s: string): string {
  return s.replace(/[^\t\n\r\x20-\u{10FFFF}]/gu, "");
}

/**
 * Código que o Excel estragaria (só números, ou números com / . - :) sai como
 * ="0123": a planilha mostra 0123 como texto. O conteúdo é restrito a esse
 * alfabeto, então não há como injetar fórmula. O resto passa por `csvTexto`.
 */
export function csvCodigo(v: string | number | null | undefined): string {
  const s = semControle(String(v ?? "")).replace(/[\r\n]+/g, " ").trim();
  if (!s) return "";
  if (/^\d[0-9A-Za-z./:\- ]*$/.test(s)) return `="${s}"`;
  return csvTexto(s);
}

const CPF_FORMATADO = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_FORMATADO = /^[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}$/;

/**
 * CPF/CNPJ com pontuação: com os pontos e a barra o Excel já lê como texto,
 * sem precisar de ="...". Documento fora do padrão sai protegido como código.
 */
export function csvDocumento(v: string | null | undefined): string {
  const f = formatarDocumento(v);
  if (!f) return "";
  return CPF_FORMATADO.test(f) || CNPJ_FORMATADO.test(f) ? f : csvCodigo(f);
}

/**
 * Texto para o export completo: preserva quebras de linha (entre aspas, como
 * manda o RFC 4180), normaliza CR solto, tira controles e neutraliza início
 * de fórmula (= + - @) com apóstrofo.
 */
export function csvDado(v: string | null | undefined): string {
  let s = semControle(v ?? "").replace(/\r\n?/g, "\n");
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return /[";\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Número com vírgula decimal e sem milhar. Sem `casas`, mantém a precisão gravada. */
export function csvNumeroDado(v: number | string | null | undefined, casas?: number): string {
  if (v === null || v === undefined || v === "") return "";
  const n = toNum(v);
  return (casas === undefined ? String(n) : n.toFixed(casas)).replace(".", ",");
}

export function csvSimNao(v: unknown): string {
  return v === true ? "sim" : v === false ? "não" : "";
}
