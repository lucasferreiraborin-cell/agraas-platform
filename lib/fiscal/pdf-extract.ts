/**
 * Extração de NF-e a partir de PDF (DANFE) — via Claude, documento nativo.
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 * O commit fcc173b (jun/2026) fazia PDF -> pdf-parse -> Claude. O 31b3e64
 * removeu o pdf-parse (DOMMatrix não existe no Node serverless) e, junto,
 * levou a chamada ao Claude. Sobrou uma varredura de texto em latin1 por
 * operadores BT/ET — que só funciona em PDF com stream sem compressão. DANFE
 * real é FlateDecode: a varredura devolve vazio, e a nota é gravada como casca
 * (CNPJ vazio, R$ 0,00, 0 itens). Foi o que o Lucas viu em 11/09/2026.
 *
 * ── Como resolve ─────────────────────────────────────────────────────────────
 * O Claude aceita PDF como bloco `document` (base64). Não precisa de biblioteca
 * de parsing, roda em serverless, e lê DANFE comprimido e até escaneado. A
 * resposta vem em JSON validado por zod. Qualquer falha — sem API key,
 * timeout, JSON inválido, refusal — cai em `origem: "fallback"` e o chamador
 * segue pelo caminho antigo. Este módulo NUNCA lança.
 *
 * ── Modelo ───────────────────────────────────────────────────────────────────
 * `claude-sonnet-5`: alvo de unificação das rotas fiscais aprovado pelo Lucas
 * em 05/09/2026 (Etapa 1). Custo por DANFE de 1-2 páginas: ~3-4k tokens de
 * entrada + ~600 de saída ≈ US$ 0,01-0,02.
 *
 * ── Timeout ──────────────────────────────────────────────────────────────────
 * O FiscalUpload aborta em 30 s. O SDK recebe 25 s para falhar ANTES do cliente
 * desistir — assim o fallback ainda grava a nota em vez de o usuário ver
 * "tempo limite excedido" com nada salvo.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { NfeItemFiscal } from "@/lib/fiscal/nfe-parser";

/** Modelo das rotas fiscais — decisão de 05/09/2026. */
export const PDF_EXTRACT_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// Schema do que pedimos ao Claude
// ---------------------------------------------------------------------------

const numOuNull = z.union([z.number(), z.null()]).catch(null);
const strOuVazia = z.union([z.string(), z.null()]).transform(v => (v ?? "").trim()).catch("");

const ItemSchema = z.object({
  descricao:     strOuVazia,
  ncm:           strOuVazia,
  cfop:          strOuVazia,
  unidade:       strOuVazia,
  quantidade:    numOuNull,
  valor_unitario: numOuNull,
  valor_total:   numOuNull,
  cst:           strOuVazia,
  icms_base:     numOuNull,
  icms_aliquota: numOuNull,
  icms_valor:    numOuNull,
});

const ExtracaoSchema = z.object({
  chave_acesso:   strOuVazia,
  numero_nota:    strOuVazia,
  serie:          strOuVazia,
  emitente_cnpj:  strOuVazia,
  emitente_nome:  strOuVazia,
  emitente_uf:    strOuVazia,
  destinatario_uf: strOuVazia,
  data_emissao:   strOuVazia,          // YYYY-MM-DD
  valor_total:    numOuNull,
  itens:          z.array(ItemSchema).catch([]),
  confianca:      z.number().min(0).max(1).catch(0.5),
  observacoes:    strOuVazia,
});

export type ExtracaoPdf = z.infer<typeof ExtracaoSchema>;

export type ResultadoExtracaoPdf =
  | { origem: "claude"; dados: ExtracaoPdf; modelo: string; tokens: { entrada: number; saida: number } }
  | { origem: "fallback"; motivo: string };

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const INSTRUCOES = `Você lê um DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) brasileiro em PDF e devolve os dados estruturados.

Regras:
- Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, sem markdown.
- Campos ausentes ou ilegíveis: use null para números e "" para textos. NUNCA invente valor.
- Números em formato JSON (ponto decimal), sem "R$", sem separador de milhar.
- data_emissao no formato YYYY-MM-DD.
- chave_acesso: os 44 dígitos, só números, se estiverem legíveis.
- ncm: 8 dígitos só números. cfop: 4 dígitos.
- cst: o CST ou CSOSN do ICMS do item (2 ou 3 dígitos), se impresso.
- icms_base, icms_aliquota, icms_valor: por item, como impresso na coluna de ICMS do DANFE; null se não houver.
- confianca: sua confiança de 0 a 1 na extração como um todo. Use abaixo de 0.7 quando o documento estiver borrado, cortado ou quando houver campos essenciais ilegíveis.
- observacoes: uma frase curta sobre qualquer limitação da leitura, ou "".

Formato exato:
{"chave_acesso":"","numero_nota":"","serie":"","emitente_cnpj":"","emitente_nome":"","emitente_uf":"","destinatario_uf":"","data_emissao":"","valor_total":null,"itens":[{"descricao":"","ncm":"","cfop":"","unidade":"","quantidade":null,"valor_unitario":null,"valor_total":null,"cst":"","icms_base":null,"icms_aliquota":null,"icms_valor":null}],"confianca":0.0,"observacoes":""}`;

// ---------------------------------------------------------------------------
// Extração
// ---------------------------------------------------------------------------

/** Isola o primeiro objeto JSON de um texto. Tolera prosa em volta. */
export function isolarJson(texto: string): string | null {
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  return texto.slice(ini, fim + 1);
}

/**
 * Valida a resposta do modelo. Exportada para teste — é aqui que uma resposta
 * malformada vira fallback controlado em vez de nota corrompida.
 */
export function validarExtracao(texto: string): ExtracaoPdf | null {
  const json = isolarJson(texto);
  if (!json) return null;
  try {
    const parsed = ExtracaoSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type ClienteMinimo = {
  messages: { create: (params: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<unknown> };
};

/**
 * Extrai a NF-e de um PDF via Claude.
 *
 * `cliente` é injetável para teste; em produção é o SDK oficial. Nunca lança.
 */
export async function extrairNfeDePdf(
  pdf: Buffer,
  opts: { cliente?: ClienteMinimo; timeoutMs?: number } = {},
): Promise<ResultadoExtracaoPdf> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!opts.cliente && !apiKey) {
    return { origem: "fallback", motivo: "ANTHROPIC_API_KEY não configurada" };
  }
  if (!pdf || pdf.length === 0) {
    return { origem: "fallback", motivo: "PDF vazio" };
  }
  // 32 MB é o limite da API; um DANFE tem dezenas de KB. Acima de 10 MB algo
  // está errado com o arquivo — não vale gastar token.
  if (pdf.length > 10 * 1024 * 1024) {
    return { origem: "fallback", motivo: `PDF grande demais (${(pdf.length / 1024 / 1024).toFixed(1)} MB)` };
  }

  const cliente: ClienteMinimo =
    opts.cliente ?? (new Anthropic({ apiKey, timeout: opts.timeoutMs ?? 25_000 }) as unknown as ClienteMinimo);

  try {
    const res = (await cliente.messages.create({
      model: PDF_EXTRACT_MODEL,
      max_tokens: 4000,
      system: INSTRUCOES,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") },
            },
            { type: "text", text: "Extraia os dados deste DANFE no formato pedido." },
          ],
        },
      ],
    })) as {
      content: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    if (res.stop_reason === "refusal") {
      return { origem: "fallback", motivo: "modelo recusou o documento" };
    }

    const texto = res.content.filter(b => b.type === "text").map(b => b.text ?? "").join("\n");
    const dados = validarExtracao(texto);
    if (!dados) {
      return { origem: "fallback", motivo: "resposta do modelo não é JSON válido no formato esperado" };
    }

    return {
      origem: "claude",
      dados,
      modelo: PDF_EXTRACT_MODEL,
      tokens: { entrada: res.usage?.input_tokens ?? 0, saida: res.usage?.output_tokens ?? 0 },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { origem: "fallback", motivo: `falha na chamada ao modelo: ${msg}` };
  }
}

// ---------------------------------------------------------------------------
// Mapeamento para o shape do parser de XML
// ---------------------------------------------------------------------------

/**
 * Converte a extração no mesmo `NfeItemFiscal` que o parser de XML produz,
 * para que `saveNote` não precise saber de onde a nota veio.
 *
 * Campos que o DANFE não imprime (redução de base, desoneração, monofasia)
 * ficam null — não são inventados.
 */
export function extracaoParaItens(dados: ExtracaoPdf): NfeItemFiscal[] {
  return dados.itens.map((it, i) => ({
    sequencia:     i + 1,
    codigoProduto: "",
    descricao:     it.descricao,
    ncm:           it.ncm.replace(/\D/g, ""),
    cfop:          it.cfop.replace(/\D/g, ""),
    unidade:       it.unidade,
    quantidade:    it.quantidade,
    valorUnitario: it.valor_unitario,
    valorTotal:    it.valor_total,
    cst:           it.cst.replace(/\D/g, ""),
    icmsBase:      it.icms_base,
    icmsReducaoBasePct: null,
    icmsAliquota:  it.icms_aliquota,
    icmsValor:     it.icms_valor,
    icmsDesonerado: null,
    icmsMotDesoneracao: "",
    beneficioCodigo: "",
    icmsMonoQtdBc: null, icmsMonoAdRem: null, icmsMonoValor: null,
    icmsMonoQtdBcRet: null, icmsMonoAdRemRet: null, icmsMonoValorRet: null,
    ipiValor: null,
  }));
}
