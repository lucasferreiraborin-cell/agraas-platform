/**
 * Tests: livro de regras (`rules/`) e taxonomia de alertas.
 *
 * Ajustes 1, 3 e 4 do handoff de 05/09/2026.
 *
 * Três travas ficam aqui, porque em documentação elas não seguram:
 *  1. `fonte.verificado_em` obrigatório — impede norma não verificada de virar
 *     produto.
 *  2. Sincronia entre o YAML versionado e a constante espelho do código — se
 *     alguém editar um e esquecer o outro, a suíte reprova.
 *  3. Linguagem proibida em `suggested_action` — nada promete recuperação de
 *     imposto, percentual fundador ou valor garantido.
 */

import {
  acaoSugerida,
  normalizarAlertType,
  toCanonicalAlert,
  SEVERIDADE_MAPA,
  SEVERIDADE_DEFAULT,
} from "@/lib/fiscal/alert-writer";
import {
  carregarRegra,
  carregarTodas,
  podeCalcular,
  podePublicar,
  estaVigente,
  validarRegra,
} from "@/lib/rules/loader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sevMapa = carregarRegra("rules/alertas/severidade-mapa.yaml") as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tax = carregarRegra("rules/alertas/taxonomia.yaml") as any;

// ── Estrutura do livro de regras ────────────────────────────────────────────

describe("rules/ — validação estrutural", () => {
  const { regras, erros } = carregarTodas();

  it("toda regra passa na validação", () => {
    expect(erros.map(e => `${e.arquivo}: ${e.problema}`).join("\n")).toBe("");
  });

  it("nenhum id duplicado entre arquivos", () => {
    const ids = regras.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("as regras de alerta estão registradas", () => {
    const ids = regras.map(r => r.id);
    expect(ids).toContain("R-ALERTA-SEV-01");
    expect(ids).toContain("R-ALERTA-TAX-01");
  });
});

describe("validarRegra — a trava de verificado_em", () => {
  const base = {
    id: "R-TESTE-X-01", titulo: "regra de teste valida",
    classe: "FATO", vigencia: { inicio: "2026-01-01", fim: null },
    fonte: { verificado_em: "2026-09-05" }, aplicabilidade: {},
  };

  it("aceita regra completa", () => {
    expect(validarRegra(base, "x.yaml")).toEqual([]);
  });

  it("REJEITA regra sem o campo verificado_em", () => {
    const { fonte: _f, ...semFonte } = base;
    const erros = validarRegra({ ...semFonte, fonte: {} }, "x.yaml");
    expect(erros.map(e => e.problema).join(" ")).toContain("verificado_em AUSENTE");
  });

  it("aceita verificado_em null — é o registro explícito de A VERIFICAR", () => {
    expect(validarRegra({ ...base, fonte: { verificado_em: null } }, "x.yaml")).toEqual([]);
  });

  it("rejeita id fora do padrão e classe inválida", () => {
    expect(validarRegra({ ...base, id: "sev-01" }, "x.yaml").length).toBeGreaterThan(0);
    expect(validarRegra({ ...base, classe: "OPINIAO" }, "x.yaml").length).toBeGreaterThan(0);
  });

  it("rejeita data em formato não-ISO", () => {
    expect(validarRegra({ ...base, fonte: { verificado_em: "05/09/2026" } }, "x.yaml").length)
      .toBeGreaterThan(0);
  });
});

describe("podeCalcular e podePublicar", () => {
  const semFonte = {
    id: "R-X-Y-01", titulo: "regra sem fonte", classe: "FATO" as const,
    vigencia: { inicio: null, fim: null }, fonte: { verificado_em: null },
    revisor_humano: "alguem",
  };

  it("sem verificado_em não calcula nem publica, mesmo com revisor", () => {
    expect(podeCalcular(semFonte)).toBe(false);
    expect(podePublicar(semFonte)).toBe(false);
  });

  it("verificado_em habilita cálculo; publicar ainda exige revisor humano", () => {
    expect(sevMapa.fonte.verificado_em).toBe("2026-09-05");
    expect(podeCalcular(sevMapa)).toBe(true);
    expect(podePublicar(sevMapa)).toBe(false); // revisor_humano segue null
  });

  it("estaVigente respeita início e fim", () => {
    const r = { ...semFonte, vigencia: { inicio: "2026-04-01", fim: "2027-12-31" } };
    expect(estaVigente(r, "2026-03-31")).toBe(false);
    expect(estaVigente(r, "2026-04-01")).toBe(true);
    expect(estaVigente(r, "2028-01-01")).toBe(false);
  });
});

// ── Sincronia YAML ↔ código ─────────────────────────────────────────────────

describe("severidade-mapa.yaml × constante do código", () => {
  it("o mapeamento é idêntico nos dois lugares", () => {
    expect(SEVERIDADE_MAPA).toEqual(sevMapa.mapeamento);
  });

  it("o default é idêntico nos dois lugares", () => {
    expect(SEVERIDADE_DEFAULT).toBe(sevMapa.default_desconhecido);
  });

  it("todo destino do mapeamento está na lista de valores canônicos", () => {
    for (const v of Object.values(sevMapa.mapeamento)) {
      expect(sevMapa.valores_canonicos).toContain(v);
    }
    expect(sevMapa.valores_canonicos).toContain(sevMapa.default_desconhecido);
  });

  it("os valores canônicos são exatamente o CHECK da migration 133", () => {
    expect([...sevMapa.valores_canonicos].sort()).toEqual(["critical", "info", "warning"]);
  });
});

// ── Taxonomia (ajuste 3) ────────────────────────────────────────────────────

describe("taxonomia de alert_type", () => {
  const ids: string[] = tax.tipos.map((t: { id: string }) => t.id);

  it("todo tipo segue o formato namespaced declarado na própria regra", () => {
    const re = new RegExp(tax.formato);
    for (const id of ids) expect({ id, ok: re.test(id) }).toEqual({ id, ok: true });
  });

  it("nenhum id duplicado", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("os tipos que o B1 vai usar já estão reservados", () => {
    for (const esperado of [
      "icms.conv100.beneficio_ausente", "icms.conv100.base_cheia",
      "icms.conv100.reducao_divergente", "icms.conv100.nao_aplicavel",
      "icms.conv100.uf_nao_mapeada", "icms.cbenef_ausente", "icms.cst_incoerente",
      "icms.diesel.credito_acumulado", "funrural.duplicidade",
      "livrocaixa.despesa_sem_comprovacao", "itr.gu_sem_prova", "ibscbs.limiar_36mi",
    ]) expect(ids).toContain(esperado);
  });

  it("todo tipo herdado tem de-para no código e destino na taxonomia", () => {
    const herdados = tax.tipos.filter((t: { substitui?: string }) => t.substitui);
    expect(herdados.length).toBeGreaterThan(0);
    for (const t of herdados) {
      expect(normalizarAlertType(t.substitui)).toBe(t.id);
      expect(ids).toContain(t.id);
    }
  });

  it("tipo desconhecido passa intacto — não inventa namespace", () => {
    expect(normalizarAlertType("tipo.que.nao.existe")).toBe("tipo.que.nao.existe");
    expect(normalizarAlertType("  icms.conv100.base_cheia  ")).toBe("icms.conv100.base_cheia");
  });

  it("severidade padrão de todo tipo respeita o CHECK", () => {
    for (const t of tax.tipos) {
      expect({ id: t.id, sev: t.severidade_padrao })
        .toEqual({ id: t.id, sev: expect.stringMatching(/^(info|warning|critical)$/) });
    }
  });

  it("nao_aplicavel e uf_nao_mapeada são info — NÃO são imposto pago a mais", () => {
    // Ajuste 5a: falso positivo é o que destrói credibilidade com contador.
    for (const id of ["icms.conv100.nao_aplicavel", "icms.conv100.uf_nao_mapeada", "icms.diesel.uf_sem_rota"]) {
      const t = tax.tipos.find((x: { id: string }) => x.id === id);
      expect({ id, sev: t.severidade_padrao }).toEqual({ id, sev: "info" });
    }
  });

  it("tipo que cita regra aponta para um id de regra existente", () => {
    const { regras } = carregarTodas();
    const idsRegras = new Set(regras.map(r => r.id));
    const pendentes = ["R-ICMS-CONV100-01", "R-ICMS-DIESEL-01", "R-FUN-01", "R-IR-01", "R-ITR-01", "R-REF-01"];
    for (const t of tax.tipos.filter((t: { regra?: string }) => t.regra)) {
      // Regras ainda não escritas são aceitas se estiverem na lista de pendentes
      // do backlog — mas nunca um id inventado fora dela.
      expect(idsRegras.has(t.regra) || pendentes.includes(t.regra)).toBe(true);
    }
  });
});

// ── Ajuste 4: linguagem proibida ────────────────────────────────────────────

describe("suggested_action — proibições de linguagem", () => {
  const textos = tax.tipos
    .map((t: { id: string }) => acaoSugerida(t.id))
    .filter(Boolean) as string[];

  const PROIBIDO = [
    "recuperação tributária", "recuperacao tributaria",
    "você tem direito", "voce tem direito",
    "8-12%", "8–12%", "8 a 12%", "8–12 %",
    "garantido", "garantia de", "assegurado", "com certeza",
  ];

  it("existe texto para os tipos herdados", () => {
    expect(textos.length).toBeGreaterThan(0);
  });

  it("nenhum texto usa expressão proibida", () => {
    for (const txt of textos) {
      const t = txt.toLowerCase();
      for (const p of PROIBIDO) expect({ txt, proibido: p, achou: t.includes(p) })
        .toEqual({ txt, proibido: p, achou: false });
    }
  });

  it("nenhum texto promete valor em reais sem a palavra estimado", () => {
    for (const txt of textos) {
      if (/r\$\s*[\d.,]+/i.test(txt)) {
        expect({ txt, temEstimado: /estimad/i.test(txt) }).toEqual({ txt, temEstimado: true });
      }
    }
  });

  it("todo texto remete ao contador ou a uma conferência", () => {
    for (const txt of textos) {
      expect({ txt, remete: /contador|conferir|confirmar|revisar|verificar/i.test(txt) })
        .toEqual({ txt, remete: true });
    }
  });
});

// ── rule_id enquanto a coluna não existe (migration 161) ───────────────────

describe("rule_id e verificado_em — pendência da migration 161", () => {
  it("viajam na mensagem, sem inventar coluna que o schema não tem", () => {
    const c = toCanonicalAlert({
      note_id: "n1", client_id: "c1", tipo: "icms.conv100.base_cheia",
      descricao: "Base cheia em operacao com direito a reducao.",
      severidade: "aviso", rule_id: "R-ICMS-CONV100-01", verificado_em: "2026-09-05",
    });
    expect(c.message).toContain("R-ICMS-CONV100-01");
    expect(c.message).toContain("verificado em 2026-09-05");
    expect(Object.keys(c)).not.toContain("rule_id");
    expect(Object.keys(c)).not.toContain("rule_verificado_em");
  });

  it("sem rule_id a mensagem fica limpa", () => {
    const c = toCanonicalAlert({
      note_id: "n1", client_id: "c1", tipo: "ncm_incorreto",
      descricao: "NCM invalido.", severidade: "critico",
    });
    expect(c.message).toBe("NCM invalido.");
  });

  it("normaliza o tipo herdado ao converter", () => {
    const c = toCanonicalAlert({
      note_id: "n1", client_id: "c1", tipo: "ia_fiscal",
      descricao: "x", severidade: "aviso",
    });
    expect(c.alert_type).toBe("nfe.ia_fiscal");
    expect(c.suggested_action).toContain("contador");
  });
});
