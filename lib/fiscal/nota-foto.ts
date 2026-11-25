/**
 * Foto do DANFE → nota (portal Gestão, 24/11/2026). Parte PURA: formato da
 * imagem pela assinatura, decisão "dá para gravar?" e conversão no shape
 * comum `NotaParseada` — o mesmo que o `saveNote` grava para XML e PDF.
 *
 * Diferença deliberada em relação ao PDF: foto ilegível NÃO vira nota. O PDF
 * grava casca com aviso (tem a varredura crua como último recurso); a foto
 * não tem plano B, e nota vazia com R$ 0,00 é exatamente o erro silencioso de
 * 11/09/2026. Sem leitura útil, a rota responde 422 e nada é gravado.
 */

import { extracaoParaItens, type ExtracaoFoto, type TipoImagem } from "@/lib/fiscal/pdf-extract";
import { itensParaParsedItems, type NotaParseada } from "@/lib/fiscal/nota-parse";

export type FormatoImagem = TipoImagem | "heic" | "avif";

/** Marcas ISO-BMFF de HEIC/HEIF (fotos do iPhone no formato "Alta eficiência"). */
const MARCAS_HEIC = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/**
 * Formato pela assinatura do arquivo (magic bytes). Nome e MIME vindos do
 * celular não são confiáveis: foto HEIC às vezes chega como "image.jpg".
 */
export function formatoDaImagem(bytes: Uint8Array): FormatoImagem | null {
  if (!bytes || bytes.length < 12) return null;
  const ascii = (ini: number, fim: number) => String.fromCharCode(...Array.from(bytes.subarray(ini, fim)));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp") {
    const marca = ascii(8, 12).toLowerCase();
    if (MARCAS_HEIC.has(marca)) return "heic";
    if (marca === "avif" || marca === "avis") return "avif";
  }
  return null;
}

export type LeituraFoto =
  | { ok: true }
  | { ok: false; motivo: "nao_documento" | "ilegivel"; mensagem: string };

/** A leitura tem o mínimo para virar nota? (valor total ou ao menos um item com valor/quantidade) */
export function avaliarLeituraFoto(d: ExtracaoFoto): LeituraFoto {
  if (!d.documento_fiscal) {
    return {
      ok: false, motivo: "nao_documento",
      mensagem: "A foto não parece ser de uma nota fiscal. Fotografe o DANFE inteiro, de frente. Nada foi gravado.",
    };
  }
  const temValor = (d.valor_total ?? 0) > 0;
  const temItens = d.itens.some((i) => i.descricao.trim().length > 0 && ((i.valor_total ?? 0) > 0 || (i.quantidade ?? 0) > 0));
  if (!temValor && !temItens) {
    return {
      ok: false, motivo: "ilegivel",
      mensagem: "Não deu para ler o valor nem os itens nesta foto. Tire outra com a nota inteira, reta e com boa luz. Nada foi gravado.",
    };
  }
  return { ok: true };
}

/** Data ISO real (2026-02-30 não passa), entre 2000 e 2100. */
export function dataIsoValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** CNPJ (inclusive alfanumérico) ou CPF sem pontuação, em maiúsculas. */
export const docSemPontuacao = (s: string) => s.toUpperCase().replace(/[^0-9A-Z]/g, "");

/** "000.001.234" → "1234" (o DANFE imprime com zeros; o XML não). */
const numeroLimpo = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d ? d.replace(/^0+(?=\d)/, "") : "";
};

/**
 * Converte a leitura da foto no shape comum. Diferenças para o PDF
 * (`notaDeExtracao`): número e série sem zeros à esquerda e sem rótulo
 * inventado ("PDF importado"); data inválida vira vazia em vez de derrubar o
 * insert; chave só com os 44 dígitos completos (chave parcial criaria falso
 * "já importada").
 */
export function notaDeFoto(d: ExtracaoFoto, foto: Buffer, modelo: string, formato: TipoImagem): NotaParseada {
  const richItems = extracaoParaItens(d);
  const chave = d.chave_acesso.replace(/\D/g, "");
  const baixaConfianca = d.confianca < 0.7;
  return {
    header: {
      numeroNota: numeroLimpo(d.numero_nota),
      serie: numeroLimpo(d.serie),
      emitenteCnpj: docSemPontuacao(d.emitente_cnpj),
      emitenteNome: d.emitente_nome,
      destinatarioNome: d.destinatario_nome,
      destinatarioCnpj: docSemPontuacao(d.destinatario_cnpj),
      dataEmissao: dataIsoValida(d.data_emissao) ? d.data_emissao : "",
      valorTotal: d.valor_total !== null && d.valor_total > 0 ? d.valor_total : 0,
      rawContent: `[FOTO ${formato.replace("image/", "").toUpperCase()} · ${Math.max(1, Math.round(foto.length / 1024))} KB · lida por IA]`,
      chaveAcesso: chave.length === 44 ? chave : "",
    },
    items: itensParaParsedItems(richItems),
    richItems,
    iaFailed: baixaConfianca,
    iaMotivo: baixaConfianca ? `confiança ${d.confianca.toFixed(2)}${d.observacoes ? " — " + d.observacoes : ""}` : undefined,
    extracao: { origem: "claude", modelo },
    arquivo: "foto",
  };
}
