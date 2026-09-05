/**
 * Tests: B4 — relatório de suporte à DITR.
 *
 * O teste que mais importa aqui não é de aritmética: é a garantia de que o
 * relatório NÃO otimiza o Grau de Utilização. Se o motor usar a pastagem
 * DECLARADA em vez da COMPROVADA pelo rebanho, ele produz um número plausível,
 * maior, e favorável — e o contador assina. Erro silencioso num documento
 * assinado é o pior resultado possível deste módulo.
 *
 * O segundo é a fronteira das faixas: GU de exatamente 80 cai em
 * "maior que 65 até 80", e confundir isso muda a alíquota em uma ordem de
 * grandeza (0,85% contra 0,15% numa fazenda de 500-1.000 ha).
 */

import {
  TABELA_ALIQUOTAS,
  faixaDeGU,
  linhaDeArea,
  aliquotaITR,
  rebanhoMedioPorCategoria,
  converterParaUA,
  areaPastagemComprovada,
  grauUtilizacao,
  montarRelatorioITR,
  EXEMPLO_MOCK,
  type FaixaGU,
} from "@/lib/fiscal/itr-report";
import { carregarRegra } from "@/lib/rules/loader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const regra = carregarRegra("rules/itr/R-ITR-01.yaml") as any;

// ── A tabela contra a fonte ─────────────────────────────────────────────────

describe("tabela de alíquotas — Lei 9.393/96 art. 11", () => {
  it("o código e o YAML são idênticos, célula a célula", () => {
    expect(TABELA_ALIQUOTAS).toHaveLength(regra.tabela_aliquotas.length);
    const faixas: FaixaGU[] = [
      "gu_maior_80", "gu_maior_65_ate_80", "gu_maior_50_ate_65", "gu_maior_30_ate_50", "gu_ate_30",
    ];
    regra.tabela_aliquotas.forEach((linhaYaml: Record<string, number | string | null>, i: number) => {
      const linhaCode = TABELA_ALIQUOTAS[i];
      expect({ i, area: linhaCode.area }).toEqual({ i, area: linhaYaml.area });
      expect({ i, ate: linhaCode.areaAteHa }).toEqual({ i, ate: linhaYaml.area_ate_ha ?? null });
      for (const f of faixas) {
        expect({ i, f, v: linhaCode.aliquotas[f] }).toEqual({ i, f, v: linhaYaml[f] });
      }
    });
  });

  it("a regra da tabela está verificada em fonte primária", () => {
    expect(regra.fonte.verificado_em).toBe("2026-09-05");
    expect(regra.fonte.url).toContain("camara.leg.br");
    expect(regra.fonte.norma).toBe("Lei 9.393/1996");
  });

  it("os extremos do anexo estão certos", () => {
    expect(aliquotaITR(40, 95)).toBe(0.03);      // menor imóvel, maior uso
    expect(aliquotaITR(10_000, 10)).toBe(20.0);  // maior imóvel, menor uso
  });
});

// ── Fronteiras — onde o erro caro mora ──────────────────────────────────────

describe("faixaDeGU — fronteiras do anexo", () => {
  it('GU exatamente 80 é "maior que 65 até 80", NÃO "maior que 80"', () => {
    expect(faixaDeGU(80)).toBe("gu_maior_65_ate_80");
    expect(faixaDeGU(80.01)).toBe("gu_maior_80");
  });

  it("as demais fronteiras são exclusivas embaixo", () => {
    expect(faixaDeGU(65)).toBe("gu_maior_50_ate_65");
    expect(faixaDeGU(65.01)).toBe("gu_maior_65_ate_80");
    expect(faixaDeGU(50)).toBe("gu_maior_30_ate_50");
    expect(faixaDeGU(30)).toBe("gu_ate_30");
    expect(faixaDeGU(0)).toBe("gu_ate_30");
  });

  it("a diferença de uma casa decimal no GU muda a alíquota em ordem de grandeza", () => {
    // Fazenda de 800 ha: 0,15% contra 0,85% — cinco vezes e meia.
    expect(aliquotaITR(800, 80.01)).toBe(0.15);
    expect(aliquotaITR(800, 80)).toBe(0.85);
  });
});

describe("linhaDeArea — fronteiras de área", () => {
  it('área exatamente 50 é "Até 50"', () => {
    expect(linhaDeArea(50).area).toBe("Até 50");
    expect(linhaDeArea(50.01).area).toBe("Maior que 50 até 200");
  });

  it("acima de 5.000 não tem teto", () => {
    expect(linhaDeArea(5000).area).toBe("Maior que 1.000 até 5.000");
    expect(linhaDeArea(5000.01).area).toBe("Acima de 5.000");
    expect(linhaDeArea(1_000_000).area).toBe("Acima de 5.000");
  });
});

// ── Rebanho ─────────────────────────────────────────────────────────────────

describe("rebanhoMedioPorCategoria", () => {
  it("divide pelo total de meses da série, não pelos meses em que a categoria existe", () => {
    const media = rebanhoMedioPorCategoria([
      { mes: "2025-01", porCategoria: { vaca: 100, touro: 12 } },
      { mes: "2025-02", porCategoria: { vaca: 100 } },
      { mes: "2025-03", porCategoria: { vaca: 100 } },
    ]);
    expect(media.vaca).toBe(100);
    // Touro existiu em 1 de 3 meses: 12/3 = 4, não 12. Somar só onde existe
    // inflaria o rebanho e, por consequência, a área comprovada.
    expect(media.touro).toBe(4);
  });

  it("série vazia devolve objeto vazio, não divide por zero", () => {
    expect(rebanhoMedioPorCategoria([])).toEqual({});
  });
});

describe("converterParaUA", () => {
  it("converte pelas categorias com fator conhecido", () => {
    const r = converterParaUA({ vaca: 100, bezerro_ate_12m: 40 }, { vaca: 1.0, bezerro_ate_12m: 0.25 });
    expect(r.totalUA).toBe(110);
    expect(r.categoriasSemFator).toEqual([]);
  });

  it("categoria sem fator conta ZERO e é reportada — nunca chuta um fator", () => {
    const r = converterParaUA({ vaca: 100, bufala: 50 }, { vaca: 1.0 });
    expect(r.totalUA).toBe(100);
    expect(r.categoriasSemFator).toEqual(["bufala"]);
    expect(r.porCategoria.find(c => c.categoria === "bufala")).toMatchObject({ fator: null, ua: 0 });
  });
});

describe("areaPastagemComprovada e grauUtilizacao", () => {
  it("área comprovada é UA dividido pelo índice de lotação", () => {
    expect(areaPastagemComprovada(700, 0.7)).toBeCloseTo(1000, 6);
  });

  it("índice inválido devolve null em vez de Infinity", () => {
    expect(areaPastagemComprovada(700, 0)).toBeNull();
    expect(areaPastagemComprovada(700, -1)).toBeNull();
    expect(areaPastagemComprovada(700, Number.NaN)).toBeNull();
  });

  it("GU é limitado a 100 e não divide por zero", () => {
    expect(grauUtilizacao(500, 1000)).toBe(50);
    expect(grauUtilizacao(2000, 1000)).toBe(100);
    expect(grauUtilizacao(500, 0)).toBeNull();
  });
});

// ── A garantia central: não otimizar o GU ───────────────────────────────────

describe("montarRelatorioITR — NÃO otimiza o Grau de Utilização", () => {
  const base = {
    ...EXEMPLO_MOCK,
    areaTotalHa: 1000,
    areaAproveitavelHa: 1000,
    areaPastagemDeclaradaHa: 900,
    outrasAreasUtilizadasHa: 0,
    serieRebanho: [{ mes: "2025-01", porCategoria: { vaca: 350 } }],
    fatoresUA: { vaca: 1.0 },
    indiceLotacaoUAporHa: 0.7, // 350 UA / 0,7 = 500 ha comprovados
    ditrAnterior: null,
  };

  it("usa a pastagem COMPROVADA, nunca a DECLARADA", () => {
    const r = montarRelatorioITR(base);
    expect(r.areas.pastagemComprovadaHa).toBeCloseTo(500, 1);
    expect(r.areas.pastagemDeclaradaHa).toBe(900);
    // GU sobre 500 (comprovada) = 50%. Sobre 900 (declarada) daria 90%.
    expect(r.guPct).toBeCloseTo(50, 1);
    expect(r.guPct).not.toBeCloseTo(90, 1);
  });

  it("a alíquota resultante é a do GU comprovado, mais alta e correta", () => {
    const r = montarRelatorioITR(base);
    // 350 UA / 0,7 = 500 ha comprovados sobre 1.000 aproveitáveis → GU = 50%.
    // Faixa "Até 30"? Não: 50 não é "maior que 50", então cai em
    // "maior que 30 até 50". Linha "Maior que 500 até 1.000" → 3,30%.
    // Se usasse a pastagem declarada (900 ha → GU 90%) daria 0,15%.
    expect(r.guPct).toBe(50);
    expect(r.aliquotaPct).toBe(3.3);
  });

  it("REGRESSAO: GU exatamente 50 nao sobe de faixa por ruido de float", () => {
    // 350/0,7 devolve 500.00000000000006 em ponto flutuante. Sem o
    // arredondamento, o GU vira 50.000000000000006, cruza a fronteira
    // "maior que 50", e a aliquota cai de 3,30% para 1,90% — em silencio.
    const r = montarRelatorioITR(base);
    expect(r.faixaGU).toBe("gu_maior_30_ate_50");
    expect(r.aliquotaPct).not.toBe(1.9);
  });

  it("sinaliza a área declarada que o rebanho não comprova", () => {
    const r = montarRelatorioITR(base);
    expect(r.areas.pastagemNaoComprovadaHa).toBeCloseTo(400, 1);
    const achado = r.achados.find(a => a.tipo === "itr.gu_sem_prova");
    expect(achado).toBeDefined();
    expect(achado!.severidade).toBe("warning");
    expect(achado!.mensagem).toContain("contador");
  });

  it("não sinaliza quando o rebanho comprova tudo que foi declarado", () => {
    const r = montarRelatorioITR({ ...base, areaPastagemDeclaradaHa: 400 });
    expect(r.areas.pastagemNaoComprovadaHa).toBe(0);
    expect(r.achados.find(a => a.tipo === "itr.gu_sem_prova")).toBeUndefined();
  });
});

// ── Publicabilidade ─────────────────────────────────────────────────────────

describe("montarRelatorioITR — trava de publicação", () => {
  it("não é publicável enquanto índice de lotação e conversão UA não forem verificados", () => {
    const r = montarRelatorioITR(EXEMPLO_MOCK);
    expect(r.publicavel).toBe(false);
    expect(r.avisos.join(" ")).toContain("NÃO PUBLICÁVEL");
    expect(r.avisos.join(" ")).toContain("índice de lotação");
  });

  it("vira publicável quando as três regras estiverem verificadas", () => {
    const r = montarRelatorioITR({
      ...EXEMPLO_MOCK,
      regrasVerificadas: { tabelaAliquotas: true, indiceLotacao: true, conversaoUA: true },
    });
    expect(r.publicavel).toBe(true);
  });

  it("sempre avisa que quem declara e assina é o contador", () => {
    expect(montarRelatorioITR(EXEMPLO_MOCK).avisos.join(" ")).toContain("contador");
  });

  it("as regras que ainda faltam verificar estão marcadas como tal no YAML", () => {
    expect(regra.indice_lotacao.verificado_em).toBeNull();
    expect(regra.conversao_ua.verificado_em).toBeNull();
    expect(regra.indice_lotacao.rota_de_obtencao).toBeTruthy();
    expect(regra.conversao_ua.rota_de_obtencao).toBeTruthy();
  });
});

// ── Casos degradados ────────────────────────────────────────────────────────

describe("montarRelatorioITR — dado faltando", () => {
  it("sem índice de lotação, não inventa GU nem alíquota", () => {
    const r = montarRelatorioITR({ ...EXEMPLO_MOCK, indiceLotacaoUAporHa: null });
    expect(r.areas.pastagemComprovadaHa).toBeNull();
    expect(r.guPct).toBeNull();
    expect(r.aliquotaPct).toBeNull();
    expect(r.impostoEstimadoReais).toBeNull();
    expect(r.achados.find(a => a.tipo === "itr.indice_lotacao_ausente")?.severidade).toBe("critical");
  });

  it("sem série de rebanho, acusa e não calcula", () => {
    const r = montarRelatorioITR({ ...EXEMPLO_MOCK, serieRebanho: [] });
    expect(r.achados.find(a => a.tipo === "itr.rebanho_ausente")?.severidade).toBe("critical");
    expect(r.rebanho.conversao.totalUA).toBe(0);
  });

  it("série parcial é aceita, mas avisada", () => {
    const r = montarRelatorioITR({ ...EXEMPLO_MOCK, serieRebanho: EXEMPLO_MOCK.serieRebanho.slice(0, 5) });
    const a = r.achados.find(x => x.tipo === "itr.serie_incompleta");
    expect(a?.mensagem).toContain("5 de 12");
  });

  it("sem VTN, não estima imposto", () => {
    const r = montarRelatorioITR({ ...EXEMPLO_MOCK, vtnTributavelReais: null });
    expect(r.impostoEstimadoReais).toBeNull();
    expect(r.aliquotaPct).not.toBeNull();
  });
});

// ── Comparação com a DITR anterior ──────────────────────────────────────────

describe("comparação com o exercício anterior", () => {
  it("calcula a variação em pontos percentuais", () => {
    const r = montarRelatorioITR(EXEMPLO_MOCK);
    expect(r.comparacaoAnterior?.exercicio).toBe(2025);
    expect(typeof r.comparacaoAnterior?.deltaGUpp).toBe("number");
  });

  it("queda relevante de GU vira achado, porque a alíquota sobe", () => {
    // Rebanho pequeno numa area grande: GU baixo neste exercicio.
    const r = montarRelatorioITR({
      ...EXEMPLO_MOCK,
      areaAproveitavelHa: 1000,
      serieRebanho: [{ mes: "2025-01", porCategoria: { vaca: 210 } }],
      fatoresUA: { vaca: 1.0 },
      indiceLotacaoUAporHa: 0.7, // 300 ha comprovados sobre 1.000 → GU 30%
      ditrAnterior: { exercicio: 2025, guPct: 85, aliquotaPct: 0.3, imposto: null },
    });
    expect(r.guPct).toBe(30);
    const a = r.achados.find(x => x.tipo === "itr.queda_de_gu");
    expect(a?.severidade).toBe("warning");
    expect(a?.mensagem).toContain("contador");
  });

  it("sem exercício anterior, não inventa comparação", () => {
    expect(montarRelatorioITR({ ...EXEMPLO_MOCK, ditrAnterior: null }).comparacaoAnterior).toBeNull();
  });
});

// ── O mock ──────────────────────────────────────────────────────────────────

describe("EXEMPLO_MOCK", () => {
  it("está marcado como mock no próprio nome — não vaza para material externo", () => {
    expect(EXEMPLO_MOCK.propriedade.nome).toContain("[MOCK]");
  });

  it("tem a forma exata que o dado da FSJBE terá", () => {
    const r = montarRelatorioITR(EXEMPLO_MOCK);
    expect(r.rebanho.mesesNaSerie).toBe(12);
    expect(r.guPct).not.toBeNull();
    expect(r.aliquotaPct).not.toBeNull();
    expect(r.publicavel).toBe(false);
  });
});
