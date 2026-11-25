/**
 * Tests: foto do DANFE (portal Gestão, 24/11/2026).
 *
 * O Claude real não roda em CI. O que se protege: (1) a foto vai como bloco
 * `image` no modelo aprovado, com folga de tokens; (2) toda falha vira
 * fallback com motivo, nunca exceção; (3) foto que não é nota ou ilegível não
 * vira nota; (4) a conversão não inventa número, chave nem data; (5) o PDF
 * continua exatamente como era depois da refatoração do núcleo.
 */

import {
  extrairNfeDeImagem, extrairNfeDePdf, validarExtracaoFoto,
  LIMITE_IMAGEM_BYTES, PDF_EXTRACT_MODEL,
} from "@/lib/fiscal/pdf-extract";
import { avaliarLeituraFoto, dataIsoValida, formatoDaImagem, notaDeFoto } from "@/lib/fiscal/nota-foto";
import { derivarAlertas } from "@/lib/fiscal/nota-parse";

const CHAVE = "5226 1101 2345 6700 0189 5500 1000 0004 5612 3456 7890";

const RESPOSTA_FOTO = {
  documento_fiscal: true,
  chave_acesso: CHAVE,
  numero_nota: "000.000.456", serie: "001", tipo_operacao: "1",
  emitente_cnpj: "01.234.567/0001-89", emitente_nome: "AGROPECUARIA GOIAS LTDA",
  emitente_uf: "GO", destinatario_uf: "GO",
  destinatario_nome: "FAZENDA BOA VISTA", destinatario_cnpj: "123.456.789-09",
  data_emissao: "2026-11-20", valor_total: 5950,
  itens: [
    { descricao: "SAL MINERAL BOVINOS 30KG", ncm: "2309.90.90", cfop: "5102", unidade: "SC",
      quantidade: 50, valor_unitario: 95, valor_total: 4750, cst: "00", icms_base: null, icms_aliquota: null, icms_valor: null },
    { descricao: "VERMIFUGO 1L", ncm: "30049099", cfop: "5102", unidade: "FR",
      quantidade: 10, valor_unitario: 120, valor_total: 1200, cst: "40", icms_base: null, icms_aliquota: null, icms_valor: null },
  ],
  duplicatas: [
    { numero: "001", vencimento: "2026-12-20", valor: 2975 },
    { numero: "002", vencimento: "2027-01-20", valor: 2975 },
  ],
  confianca: 0.91, observacoes: "",
};

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);

function clienteFalso(resposta: unknown) {
  const chamadas: Array<Record<string, unknown>> = [];
  return {
    chamadas,
    cliente: {
      messages: {
        create: async (params: Record<string, unknown>) => {
          chamadas.push(params);
          return resposta;
        },
      },
    },
  };
}

// ── Formato pela assinatura ─────────────────────────────────────────────────

describe("formatoDaImagem", () => {
  const pad = (b: Buffer) => Buffer.concat([b, Buffer.alloc(16)]);

  it("reconhece JPEG, PNG, GIF e WebP pelos bytes, não pelo nome", () => {
    expect(formatoDaImagem(JPEG)).toBe("image/jpeg");
    expect(formatoDaImagem(pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))).toBe("image/png");
    expect(formatoDaImagem(pad(Buffer.from("GIF89a")))).toBe("image/gif");
    expect(formatoDaImagem(pad(Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBP")])))).toBe("image/webp");
  });

  it("separa HEIC (iPhone) e AVIF, que a API não lê", () => {
    const ftyp = (marca: string) => pad(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftyp"), Buffer.from(marca)]));
    expect(formatoDaImagem(ftyp("heic"))).toBe("heic");
    expect(formatoDaImagem(ftyp("mif1"))).toBe("heic");
    expect(formatoDaImagem(ftyp("avif"))).toBe("avif");
  });

  it("PDF, texto e arquivo curto não são imagem", () => {
    expect(formatoDaImagem(pad(Buffer.from("%PDF-1.4")))).toBeNull();
    expect(formatoDaImagem(pad(Buffer.from("<?xml version")))).toBeNull();
    expect(formatoDaImagem(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

// ── Validação da resposta ───────────────────────────────────────────────────

describe("validarExtracaoFoto", () => {
  it("aceita a resposta completa, com duplicatas e operação", () => {
    const d = validarExtracaoFoto(JSON.stringify(RESPOSTA_FOTO))!;
    expect(d.documento_fiscal).toBe(true);
    expect(d.tipo_operacao).toBe("1");
    expect(d.duplicatas).toHaveLength(2);
    expect(d.itens).toHaveLength(2);
  });

  it("'false' em texto é false; ausente não barra a nota", () => {
    expect(validarExtracaoFoto(JSON.stringify({ ...RESPOSTA_FOTO, documento_fiscal: "false" }))!.documento_fiscal).toBe(false);
    const semCampo: Record<string, unknown> = { ...RESPOSTA_FOTO };
    delete semCampo.documento_fiscal;
    expect(validarExtracaoFoto(JSON.stringify(semCampo))!.documento_fiscal).toBe(true);
  });

  it("duplicatas ausentes ou malformadas viram lista vazia", () => {
    expect(validarExtracaoFoto(JSON.stringify({ itens: [], confianca: 0.9 }))!.duplicatas).toEqual([]);
    expect(validarExtracaoFoto(JSON.stringify({ itens: [], duplicatas: "nenhuma", confianca: 0.9 }))!.duplicatas).toEqual([]);
  });
});

// ── O contrato em volta do Claude ───────────────────────────────────────────

describe("extrairNfeDeImagem", () => {
  it("manda a foto como bloco image base64, no modelo aprovado, com max_tokens 8000", async () => {
    const { cliente, chamadas } = clienteFalso({
      content: [{ type: "thinking" }, { type: "text", text: JSON.stringify(RESPOSTA_FOTO) }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1800, output_tokens: 900 },
    });
    const r = await extrairNfeDeImagem(JPEG, "image/jpeg", { cliente });
    expect(r.origem).toBe("claude");
    if (r.origem !== "claude") return;
    expect(r.modelo).toBe(PDF_EXTRACT_MODEL);
    expect(r.dados.emitente_nome).toBe("AGROPECUARIA GOIAS LTDA");

    const p = chamadas[0] as { model: string; max_tokens: number; messages: Array<{ content: Array<Record<string, unknown>> }> };
    expect(p.model).toBe(PDF_EXTRACT_MODEL);
    expect(p.max_tokens).toBe(8000);
    const bloco = p.messages[0].content[0] as { type: string; source: { media_type: string; data: string } };
    expect(bloco.type).toBe("image");
    expect(bloco.source.media_type).toBe("image/jpeg");
    expect(bloco.source.data).toBe(JPEG.toString("base64"));
  });

  it("resposta cortada pelo limite de tokens vira fallback com o motivo certo", async () => {
    const { cliente } = clienteFalso({ content: [{ type: "thinking" }], stop_reason: "max_tokens" });
    const r = await extrairNfeDeImagem(JPEG, "image/jpeg", { cliente });
    expect(r).toMatchObject({ origem: "fallback", motivo: expect.stringMatching(/limite de tokens/) });
  });

  it("foto vazia, gigante ou em formato não aceito não gasta token", async () => {
    const { cliente, chamadas } = clienteFalso({ content: [] });
    expect((await extrairNfeDeImagem(Buffer.alloc(0), "image/jpeg", { cliente })).origem).toBe("fallback");
    expect((await extrairNfeDeImagem(Buffer.alloc(LIMITE_IMAGEM_BYTES + 1), "image/jpeg", { cliente })).origem).toBe("fallback");
    expect((await extrairNfeDeImagem(JPEG, "image/heic" as unknown as "image/jpeg", { cliente })).origem).toBe("fallback");
    expect(chamadas).toHaveLength(0);
  });

  it("exceção do SDK vira fallback — NUNCA lança", async () => {
    const cliente = { messages: { create: async () => { throw new Error("timeout de 50s"); } } };
    const r = await extrairNfeDeImagem(JPEG, "image/jpeg", { cliente });
    expect(r).toMatchObject({ origem: "fallback", motivo: expect.stringMatching(/timeout de 50s/) });
  });

  it("sem API key e sem cliente injetado, é fallback antes de qualquer chamada", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(await extrairNfeDeImagem(JPEG, "image/jpeg")).toMatchObject({ origem: "fallback", motivo: expect.stringMatching(/ANTHROPIC_API_KEY/) });
    } finally {
      if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
    }
  });
});

describe("extrairNfeDePdf depois da refatoração do núcleo", () => {
  it("continua com bloco document e max_tokens 4000", async () => {
    const { cliente, chamadas } = clienteFalso({ content: [{ type: "text", text: JSON.stringify({ itens: [], confianca: 0.9 }) }] });
    const r = await extrairNfeDePdf(Buffer.from("%PDF-1.4 fake"), { cliente });
    expect(r.origem).toBe("claude");
    const p = chamadas[0] as { max_tokens: number; messages: Array<{ content: Array<{ type: string }> }> };
    expect(p.max_tokens).toBe(4000);
    expect(p.messages[0].content.map((b) => b.type)).toEqual(["document", "text"]);
  });
});

// ── Dá para gravar? ─────────────────────────────────────────────────────────

describe("avaliarLeituraFoto", () => {
  const base = validarExtracaoFoto(JSON.stringify(RESPOSTA_FOTO))!;

  it("nota legível passa", () => {
    expect(avaliarLeituraFoto(base)).toEqual({ ok: true });
  });

  it("foto que não é nota não grava", () => {
    expect(avaliarLeituraFoto({ ...base, documento_fiscal: false })).toMatchObject({ ok: false, motivo: "nao_documento" });
  });

  it("sem valor e sem item com valor/quantidade não grava (nada de nota casca)", () => {
    const vazia = { ...base, valor_total: null, itens: [{ ...base.itens[0], valor_total: null, quantidade: null }] };
    expect(avaliarLeituraFoto(vazia)).toMatchObject({ ok: false, motivo: "ilegivel" });
  });

  it("só o valor total já basta", () => {
    expect(avaliarLeituraFoto({ ...base, itens: [] })).toEqual({ ok: true });
  });
});

// ── Conversão para o shape do saveNote ──────────────────────────────────────

describe("notaDeFoto", () => {
  const dados = validarExtracaoFoto(JSON.stringify(RESPOSTA_FOTO))!;
  const nota = notaDeFoto(dados, JPEG, "claude-sonnet-5", "image/jpeg");

  it("número e série sem zeros do DANFE; chave com os 44 dígitos", () => {
    expect(nota.header.numeroNota).toBe("456");
    expect(nota.header.serie).toBe("1");
    expect(nota.header.chaveAcesso).toHaveLength(44);
    expect(nota.header.emitenteCnpj).toBe("01234567000189");
    expect(nota.header.destinatarioCnpj).toBe("12345678909");
    expect(nota.header.dataEmissao).toBe("2026-11-20");
    expect(nota.header.valorTotal).toBe(5950);
  });

  it("marca a origem: foto, lida por IA", () => {
    expect(nota.arquivo).toBe("foto");
    expect(nota.extracao).toEqual({ origem: "claude", modelo: "claude-sonnet-5" });
    expect(nota.header.rawContent).toMatch(/^\[FOTO JPEG · \d+ KB · lida por IA\]$/);
    expect(nota.items.map((i) => i.ncm)).toEqual(["23099090", "30049099"]);
  });

  it("não inventa: chave parcial, data impossível e número ilegível ficam vazios", () => {
    const n = notaDeFoto({ ...dados, chave_acesso: "5226 1101 2345", data_emissao: "2026-02-30", numero_nota: "", serie: "" }, JPEG, "m", "image/jpeg");
    expect(n.header.chaveAcesso).toBe("");
    expect(n.header.dataEmissao).toBe("");
    expect(n.header.numeroNota).toBe("");
    expect(n.header.serie).toBe("");
  });

  it("confiança baixa entra com aviso de revisão que fala em foto, não em PDF", () => {
    const n = notaDeFoto({ ...dados, confianca: 0.55, observacoes: "canto direito cortado" }, JPEG, "m", "image/jpeg");
    expect(n.iaFailed).toBe(true);
    const alertas = derivarAlertas(n, "n1", "c1").filter((a) => a.tipo === "pdf_revisao_manual");
    expect(alertas).toHaveLength(1);
    expect(alertas[0].descricao).toMatch(/^Foto da nota importada com extração parcial \(confiança 0\.55 — canto direito cortado\)/);
  });
});

describe("dataIsoValida", () => {
  it("só data real entre 2000 e 2100", () => {
    expect(dataIsoValida("2026-11-20")).toBe(true);
    expect(dataIsoValida("2026-02-30")).toBe(false);
    expect(dataIsoValida("20/11/2026")).toBe(false);
    expect(dataIsoValida("1999-12-31")).toBe(false);
  });
});
