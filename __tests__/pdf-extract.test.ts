/**
 * Tests: lib/fiscal/pdf-extract.ts — DANFE em PDF via Claude.
 *
 * O Claude real não roda em CI. O que se protege aqui é o contrato em volta
 * dele: o módulo NUNCA lança, toda falha vira `fallback` com motivo, uma
 * resposta malformada nunca vira nota corrompida, e o mapeamento para
 * `NfeItemFiscal` não inventa campo que o DANFE não imprime.
 */

import {
  isolarJson,
  validarExtracao,
  extracaoParaItens,
  extrairNfeDePdf,
  ehModeloIndisponivel,
  PDF_EXTRACT_MODEL,
  PDF_EXTRACT_MODEL_FALLBACK,
} from "@/lib/fiscal/pdf-extract";

const RESPOSTA_OK = JSON.stringify({
  chave_acesso: "5226 0901 2345 6700 0189 5500 1000 0004 5612 3456 7890",
  numero_nota: "456", serie: "1",
  emitente_cnpj: "01.234.567/0001-89", emitente_nome: "AGROPECUARIA GOIAS LTDA",
  emitente_uf: "GO", destinatario_uf: "GO", data_emissao: "2026-08-20", valor_total: 5950,
  itens: [
    { descricao: "SAL MINERAL BOVINOS 30KG", ncm: "2309.90.90", cfop: "5102", unidade: "SC",
      quantidade: 50, valor_unitario: 95, valor_total: 4750, cst: "00",
      icms_base: 4750, icms_aliquota: 17, icms_valor: 807.5 },
    { descricao: "VERMIFUGO 1L", ncm: "30049099", cfop: "5102", unidade: "FR",
      quantidade: 10, valor_unitario: 120, valor_total: 1200, cst: "40",
      icms_base: null, icms_aliquota: null, icms_valor: null },
  ],
  confianca: 0.93, observacoes: "",
});

/** Cliente falso no shape mínimo que o módulo usa. */
function clienteFalso(resposta: unknown | (() => never)) {
  const chamadas: unknown[] = [];
  return {
    chamadas,
    cliente: {
      messages: {
        create: async (params: unknown) => {
          chamadas.push(params);
          if (typeof resposta === "function") (resposta as () => never)();
          return resposta;
        },
      },
    },
  };
}

const PDF = Buffer.from("%PDF-1.4 fake");

// ── Helpers puros ───────────────────────────────────────────────────────────

describe("isolarJson", () => {
  it("acha o objeto mesmo com prosa em volta", () => {
    expect(isolarJson('Aqui está:\n{"a":1}\nEspero ter ajudado.')).toBe('{"a":1}');
  });
  it("devolve null sem chaves", () => {
    expect(isolarJson("sem json aqui")).toBeNull();
    expect(isolarJson("}{")).toBeNull();
  });
});

describe("validarExtracao", () => {
  it("aceita a resposta boa e normaliza tipos", () => {
    const d = validarExtracao(RESPOSTA_OK)!;
    expect(d.numero_nota).toBe("456");
    expect(d.itens).toHaveLength(2);
    expect(d.confianca).toBe(0.93);
  });

  it("campo numérico com lixo vira null, não NaN nem crash", () => {
    const d = validarExtracao(JSON.stringify({ valor_total: "R$ 5.950,00", itens: [], confianca: 0.9 }))!;
    expect(d.valor_total).toBeNull();
  });

  it("confiança fora de 0–1 cai em 0.5, não derruba a nota", () => {
    const d = validarExtracao(JSON.stringify({ itens: [], confianca: 7 }))!;
    expect(d.confianca).toBe(0.5);
  });

  it("itens que não são lista viram lista vazia", () => {
    const d = validarExtracao(JSON.stringify({ itens: "nenhum", confianca: 0.9 }))!;
    expect(d.itens).toEqual([]);
  });

  it("JSON inválido devolve null", () => {
    expect(validarExtracao("{quebrado")).toBeNull();
    expect(validarExtracao("")).toBeNull();
  });
});

describe("extracaoParaItens", () => {
  const itens = extracaoParaItens(validarExtracao(RESPOSTA_OK)!);

  it("limpa NCM/CFOP/CST para só dígitos", () => {
    expect(itens[0].ncm).toBe("23099090");
    expect(itens[0].cfop).toBe("5102");
    expect(itens[0].cst).toBe("00");
  });

  it("leva o ICMS impresso no DANFE", () => {
    expect(itens[0].icmsBase).toBe(4750);
    expect(itens[0].icmsAliquota).toBe(17);
    expect(itens[0].icmsValor).toBe(807.5);
    expect(itens[1].icmsValor).toBeNull();
  });

  it("NÃO inventa o que o DANFE não imprime", () => {
    for (const it of itens) {
      expect(it.icmsReducaoBasePct).toBeNull();
      expect(it.icmsDesonerado).toBeNull();
      expect(it.icmsMonoValorRet).toBeNull();
      expect(it.beneficioCodigo).toBe("");
    }
  });

  it("sequencia é 1..n", () => {
    expect(itens.map(i => i.sequencia)).toEqual([1, 2]);
  });
});

// ── O contrato em volta do Claude ───────────────────────────────────────────

describe("extrairNfeDePdf", () => {
  it("caminho feliz: devolve origem claude com dados e tokens", async () => {
    const { cliente, chamadas } = clienteFalso({
      content: [{ type: "text", text: RESPOSTA_OK }],
      stop_reason: "end_turn",
      usage: { input_tokens: 3200, output_tokens: 610 },
    });
    const r = await extrairNfeDePdf(PDF, { cliente });
    expect(r.origem).toBe("claude");
    if (r.origem !== "claude") return;
    expect(r.dados.emitente_nome).toBe("AGROPECUARIA GOIAS LTDA");
    expect(r.tokens).toEqual({ entrada: 3200, saida: 610 });
    expect(r.modelo).toBe(PDF_EXTRACT_MODEL);
  });

  it("manda o PDF como bloco document base64, no modelo aprovado", async () => {
    const { cliente, chamadas } = clienteFalso({ content: [{ type: "text", text: RESPOSTA_OK }] });
    await extrairNfeDePdf(PDF, { cliente });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = chamadas[0] as any;
    expect(p.model).toBe("claude-sonnet-5");
    const doc = p.messages[0].content[0];
    expect(doc.type).toBe("document");
    expect(doc.source.media_type).toBe("application/pdf");
    expect(doc.source.data).toBe(PDF.toString("base64"));
  });

  it("recusa do modelo vira fallback, não erro", async () => {
    const { cliente } = clienteFalso({ content: [], stop_reason: "refusal" });
    const r = await extrairNfeDePdf(PDF, { cliente });
    expect(r).toMatchObject({ origem: "fallback", motivo: expect.stringMatching(/recusou/) });
  });

  it("resposta sem JSON válido vira fallback", async () => {
    const { cliente } = clienteFalso({ content: [{ type: "text", text: "Não consegui ler o documento." }] });
    const r = await extrairNfeDePdf(PDF, { cliente });
    expect(r.origem).toBe("fallback");
  });

  it("exceção do SDK vira fallback com a mensagem — NUNCA lança", async () => {
    const { cliente } = clienteFalso(() => { throw new Error("timeout de 25s"); });
    const r = await extrairNfeDePdf(PDF, { cliente });
    expect(r).toMatchObject({ origem: "fallback", motivo: expect.stringMatching(/timeout de 25s/) });
  });

  it("sem API key e sem cliente injetado, é fallback antes de qualquer chamada", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const r = await extrairNfeDePdf(PDF);
      expect(r).toMatchObject({ origem: "fallback", motivo: expect.stringMatching(/ANTHROPIC_API_KEY/) });
    } finally {
      if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
    }
  });

  it("PDF vazio ou gigante não gasta token", async () => {
    const { cliente, chamadas } = clienteFalso({ content: [] });
    expect((await extrairNfeDePdf(Buffer.alloc(0), { cliente })).origem).toBe("fallback");
    expect((await extrairNfeDePdf(Buffer.alloc(11 * 1024 * 1024), { cliente })).origem).toBe("fallback");
    expect(chamadas).toHaveLength(0);
  });
});

// ── Fallback de modelo — a diferença de conta que não dá para testar daqui ──

describe("ehModeloIndisponivel", () => {
  it("status 404 é modelo indisponível", () => {
    expect(ehModeloIndisponivel({ status: 404, message: "Not found" })).toBe(true);
  });
  it("mensagem de model not found sem status também", () => {
    expect(ehModeloIndisponivel({ message: "model: claude-sonnet-5 not found" })).toBe(true);
  });
  it("timeout, 429 e 500 NÃO são", () => {
    expect(ehModeloIndisponivel({ status: 429, message: "rate limited" })).toBe(false);
    expect(ehModeloIndisponivel({ status: 500, message: "internal" })).toBe(false);
    expect(ehModeloIndisponivel(new Error("timeout de 25s"))).toBe(false);
    expect(ehModeloIndisponivel(null)).toBe(false);
  });
});

describe("fallback de modelo em 404", () => {
  const OK = { content: [{ type: "text", text: RESPOSTA_OK }], usage: { input_tokens: 1, output_tokens: 1 } };

  it("404 no modelo principal repete UMA vez com o de fallback e reporta qual respondeu", async () => {
    const chamadas: string[] = [];
    const cliente = {
      messages: {
        create: async (params: { model: string }) => {
          chamadas.push(params.model);
          if (params.model === PDF_EXTRACT_MODEL) {
            const e = Object.assign(new Error("model not found"), { status: 404 });
            throw e;
          }
          return OK;
        },
      },
    };
    const r = await extrairNfeDePdf(PDF, { cliente });
    expect(chamadas).toEqual([PDF_EXTRACT_MODEL, PDF_EXTRACT_MODEL_FALLBACK]);
    expect(r.origem).toBe("claude");
    if (r.origem === "claude") expect(r.modelo).toBe(PDF_EXTRACT_MODEL_FALLBACK);
  });

  it("erro que NÃO é 404 não aciona o fallback de modelo — vira fallback com motivo", async () => {
    const chamadas: string[] = [];
    const cliente = {
      messages: {
        create: async (params: { model: string }) => {
          chamadas.push(params.model);
          throw Object.assign(new Error("rate limited"), { status: 429 });
        },
      },
    };
    const r = await extrairNfeDePdf(PDF, { cliente });
    expect(chamadas).toEqual([PDF_EXTRACT_MODEL]); // uma chamada só
    expect(r).toMatchObject({ origem: "fallback", motivo: expect.stringMatching(/rate limited/) });
  });

  it("se o fallback também falhar, ainda é fallback com motivo — nunca lança", async () => {
    const cliente = {
      messages: {
        create: async () => { throw Object.assign(new Error("model not found"), { status: 404 }); },
      },
    };
    const r = await extrairNfeDePdf(PDF, { cliente });
    expect(r.origem).toBe("fallback");
  });

  it("caminho feliz usa o modelo principal e o reporta", async () => {
    const cliente = { messages: { create: async () => OK } };
    const r = await extrairNfeDePdf(PDF, { cliente });
    if (r.origem === "claude") expect(r.modelo).toBe(PDF_EXTRACT_MODEL);
  });
});
