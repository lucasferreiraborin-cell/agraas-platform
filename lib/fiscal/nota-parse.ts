/**
 * Leitura de NF-e a partir de arquivo — parte PURA (sem banco, sem request).
 *
 * Aqui vive o que todos os caminhos de entrada compartilham: o shape
 * `NotaParseada`, o adaptador XML sobre `nfe-parser`, o adaptador PDF sobre
 * `pdf-extract` (com a varredura crua só como último recurso), a detecção de
 * tipo de arquivo e a frase que o usuário lê no card de sucesso.
 *
 * A parte que grava (`saveNote`) e o handler HTTP ficam em `ingest.ts`, para
 * que este módulo possa ser testado sem Supabase nem Next.
 */

import { parseNfeHeader, parseNfeItems, type NfeItemFiscal } from "@/lib/fiscal/nfe-parser";
import { extrairNfeDePdf, extracaoParaItens, type ExtracaoPdf } from "@/lib/fiscal/pdf-extract";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type ParsedHeader = {
  numeroNota:   string;
  serie:        string;
  emitenteCnpj: string;
  emitenteNome: string;
  destinatarioNome: string;
  destinatarioCnpj: string;
  dataEmissao:  string;
  valorTotal:   number;
  rawContent:   string;
  /** Chave de 44 dígitos quando veio de XML; vazia em PDF e planilha. */
  chaveAcesso:  string;
};

export type ParsedItem = {
  descricao:     string;
  ncm:           string;
  cfop:          string;
  quantidade:    number;
  unidade:       string;
  valorUnitario: number;
  valorTotal:    number;
  icmsAliq:      number;
  icmsValor:     number;
  ipiValor:      number;
};

export type Extracao = { origem: "xml" | "claude" | "fallback" | "planilha"; modelo?: string; motivo?: string };

export type NotaParseada = {
  header:    ParsedHeader;
  items:     ParsedItem[];
  richItems: NfeItemFiscal[];
  iaFailed?: boolean;
  iaMotivo?: string;
  extracao:  Extracao;
};

export type FonteNota = "xml_upload" | "pdf_upload" | "csv_import";

export type TipoArquivo = "xml" | "pdf" | "csv" | "xlsx";

// ── Detecção de tipo ─────────────────────────────────────────────────────────

/**
 * Tipo pelo nome e, quando há bytes, pela assinatura — um DANFE salvo como
 * "nota.txt" ou um XLSX renomeado para .csv não passam batido.
 */
export function tipoDoArquivo(nome: string, bytes?: Buffer | Uint8Array): TipoArquivo | null {
  if (bytes && bytes.length >= 4) {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "xlsx"; // PK..
  }
  const n = nome.toLowerCase();
  if (n.endsWith(".xml"))  return "xml";
  if (n.endsWith(".pdf"))  return "pdf";
  if (n.endsWith(".csv") || n.endsWith(".txt")) return "csv";
  if (n.endsWith(".xlsx") || n.endsWith(".xlsm")) return "xlsx";
  if (bytes && bytes.length > 0) {
    const inicio = Buffer.from(bytes.subarray(0, 200)).toString("utf8").trimStart();
    if (inicio.startsWith("<")) return "xml";
  }
  return null;
}

// ── Mapeamento comum ─────────────────────────────────────────────────────────

export function itensParaParsedItems(richItems: NfeItemFiscal[]): ParsedItem[] {
  return richItems.map(it => ({
    descricao:     it.descricao,
    ncm:           it.ncm,
    cfop:          it.cfop,
    quantidade:    it.quantidade    ?? 0,
    unidade:       it.unidade,
    valorUnitario: it.valorUnitario ?? 0,
    valorTotal:    it.valorTotal    ?? 0,
    icmsAliq:      it.icmsAliquota  ?? 0,
    icmsValor:     it.icmsValor     ?? 0,
    ipiValor:      it.ipiValor      ?? 0,
  }));
}

// ── XML ──────────────────────────────────────────────────────────────────────

/**
 * Adaptador sobre `lib/fiscal/nfe-parser` (B0). O parser antigo usava
 * `<vICMS[^>]*>`, que casa com `<vICMSST>` — o módulo compartilhado exige
 * fronteira de nome e é a mesma fonte usada pelo backfill.
 */
export function parseXml(xml: string): NotaParseada {
  const h = parseNfeHeader(xml);
  const richItems = parseNfeItems(xml);
  const header: ParsedHeader = {
    numeroNota:   h.numeroNota,
    serie:        h.serie,
    emitenteCnpj: h.emitenteCnpj,
    emitenteNome: h.emitenteNome,
    destinatarioNome: h.destinatarioNome,
    destinatarioCnpj: h.destinatarioCnpj,
    dataEmissao:  h.dataEmissao,
    valorTotal:   h.valorTotal ?? 0,
    rawContent:   xml,
    chaveAcesso:  h.chaveAcesso,
  };
  return { header, items: itensParaParsedItems(richItems), richItems, extracao: { origem: "xml" } };
}

// ── PDF ──────────────────────────────────────────────────────────────────────

/** Varredura crua (BT/ET em latin1). Só funciona em PDF sem compressão. */
export function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const blocos: string[] = [];
  const btEt = /BT([\s\S]*?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEt.exec(raw)) !== null) {
    const strings = m[1].match(/\(([^)]*)\)/g) ?? [];
    const linha = strings.map(s => s.slice(1, -1)).join(" ").trim();
    if (linha) blocos.push(linha);
  }
  return blocos.join("\n");
}

export function parsePdfTextoCru(text: string, rawBuffer: Buffer): NotaParseada {
  const cnpj   = text.match(/(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/)?.[1]?.replace(/\D/g, "") ?? "";
  const numero = text.match(/N[º°ú]\s*[:\s]?\s*(\d{6,9})/i)?.[1] ?? "";
  const serie  = text.match(/[Ss][eé]rie\s*[:\s]?\s*(\d+)/i)?.[1] ?? "";
  const data   = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1]?.split("/").reverse().join("-") ?? "";
  const valor  = parseFloat(
    text.match(/[Vv]alor\s*[Tt]otal\s*[:\s]?\s*R?\$?\s*([\d.,]+)/)?.[1]?.replace(/\./g, "").replace(",", ".") ?? "0",
  );
  const linhas  = text.split("\n").map(l => l.trim()).filter(Boolean);
  const cnpjIdx = linhas.findIndex(l => l.replace(/\D/g, "").includes(cnpj.slice(0, 8)));
  const nome    = cnpjIdx > 0 ? linhas[cnpjIdx - 1] : "";

  return {
    header: {
      numeroNota:   numero || "PDF importado",
      serie:        serie  || "-",
      emitenteCnpj: cnpj,
      emitenteNome: nome,
      destinatarioNome: "",
      destinatarioCnpj: "",
      dataEmissao:  data,
      valorTotal:   Number.isFinite(valor) ? valor : 0,
      rawContent:   rawBuffer.toString("base64").slice(0, 500) + "…[PDF]",
      chaveAcesso:  "",
    },
    items: [],
    richItems: [],
    iaFailed: !numero && !cnpj && !valor,
    extracao: { origem: "fallback" },
  };
}

/** Converte a resposta do Claude no shape comum. Exportada para teste. */
export function notaDeExtracao(d: ExtracaoPdf, rawBuffer: Buffer, modelo: string): NotaParseada {
  const richItems = extracaoParaItens(d);
  const header: ParsedHeader = {
    numeroNota:   d.numero_nota || "PDF importado",
    serie:        d.serie || "-",
    emitenteCnpj: d.emitente_cnpj.replace(/\D/g, ""),
    emitenteNome: d.emitente_nome,
    destinatarioNome: d.destinatario_nome,
    destinatarioCnpj: d.destinatario_cnpj.replace(/\D/g, ""),
    dataEmissao:  d.data_emissao,
    valorTotal:   d.valor_total ?? 0,
    rawContent:   rawBuffer.toString("base64").slice(0, 500) + "…[PDF]",
    chaveAcesso:  d.chave_acesso.replace(/\D/g, ""),
  };
  // Confiança baixa não é falha — a nota entra com dados, mas o aviso de
  // revisão manual permanece para o produtor conferir.
  const baixaConfianca = d.confianca < 0.7;
  return {
    header,
    items: itensParaParsedItems(richItems),
    richItems,
    iaFailed: baixaConfianca,
    iaMotivo: baixaConfianca ? `confiança ${d.confianca.toFixed(2)}${d.observacoes ? " — " + d.observacoes : ""}` : undefined,
    extracao: { origem: "claude", modelo },
  };
}

/**
 * PDF (DANFE): IA primeiro; varredura crua só como fallback, com o motivo
 * registrado para chegar ao card do usuário.
 */
export async function parsePdf(buffer: Buffer): Promise<NotaParseada> {
  const ia = await extrairNfeDePdf(buffer);
  if (ia.origem === "claude") return notaDeExtracao(ia.dados, buffer, ia.modelo);

  console.warn("[fiscal] extração por IA indisponível, usando varredura crua:", ia.motivo);
  const cru = parsePdfTextoCru(extractPdfText(buffer), buffer);
  return { ...cru, iaMotivo: ia.motivo, extracao: { origem: "fallback", motivo: ia.motivo } };
}

// ── Mensagem do card ─────────────────────────────────────────────────────────

export type ResumoUpload = {
  numero_nota: string;
  total_items: number;
  alerts_count: number;
  extracao: Extracao["origem"];
  extracao_modelo?: string | null;
  extracao_motivo?: string | null;
};

/** A frase que fecha o diagnóstico na tela — sem depender de log. */
export function mensagemUpload(r: ResumoUpload): string {
  const itens = `${r.total_items} ${r.total_items === 1 ? "item" : "itens"}`;
  const alertas = `${r.alerts_count} ${r.alerts_count === 1 ? "alerta" : "alertas"}`;
  let origem: string;
  switch (r.extracao) {
    case "xml":      origem = "XML"; break;
    case "claude":   origem = `lido por IA${r.extracao_modelo ? ` (${r.extracao_modelo})` : ""}`; break;
    case "planilha": origem = "planilha"; break;
    default:         origem = `IA indisponível${r.extracao_motivo ? `: ${r.extracao_motivo}` : ""} — leitura básica`;
  }
  return `NF-e ${r.numero_nota || "S/N"} · ${itens} · ${alertas} · ${origem}`;
}
