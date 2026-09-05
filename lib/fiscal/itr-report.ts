/**
 * B4 — Relatório de suporte à DITR ("rebanho comprovado").
 *
 * Escopo deliberadamente reduzido (decisão de 05/09/2026): a plataforma monta a
 * EVIDÊNCIA — rebanho médio mensal por categoria, área de pastagem comprovada,
 * GU calculado — e o contador preenche GU e VTN na declaração e assina.
 * O motor completo fica para a DITR 2027.
 *
 * POSTURA, e ela é o ponto: este módulo NÃO otimiza o Grau de Utilização.
 * Ele sustenta o que a evidência do rebanho mostra e sinaliza quando a área
 * declarada excede a comprovada. Um relatório que inflasse GU seria pior que
 * nenhum relatório — colocaria o produtor em risco com a assinatura do contador.
 *
 * Regras e fontes em `rules/itr/R-ITR-01.yaml` (R-ITR-01). A tabela de alíquotas
 * está VERIFICADA no anexo da Lei 9.393/96; o índice de lotação e a conversão
 * para UA NÃO estão — e por isso o relatório sai marcado como não publicável
 * enquanto vierem de regra sem `verificado_em`.
 */

// ---------------------------------------------------------------------------
// Tabela de alíquotas — Lei 9.393/96, art. 11 e anexo
// ---------------------------------------------------------------------------

/** Faixa de GU do anexo, na ordem em que aparece. */
export type FaixaGU =
  | "gu_maior_80"
  | "gu_maior_65_ate_80"
  | "gu_maior_50_ate_65"
  | "gu_maior_30_ate_50"
  | "gu_ate_30";

type LinhaAliquota = {
  area: string;
  areaAteHa: number | null;
  aliquotas: Record<FaixaGU, number>;
};

/**
 * Espelho da tabela de `rules/itr/R-ITR-01.yaml`.
 *
 * Mantida em código para que o cálculo não dependa de I/O, como no de-para de
 * severidade. Um teste compara as duas fontes célula a célula — divergir entre
 * o YAML e o código seria o pior tipo de erro aqui: silencioso e num número que
 * o contador assina.
 */
export const TABELA_ALIQUOTAS: LinhaAliquota[] = [
  { area: "Até 50", areaAteHa: 50,
    aliquotas: { gu_maior_80: 0.03, gu_maior_65_ate_80: 0.20, gu_maior_50_ate_65: 0.40, gu_maior_30_ate_50: 0.70, gu_ate_30: 1.00 } },
  { area: "Maior que 50 até 200", areaAteHa: 200,
    aliquotas: { gu_maior_80: 0.07, gu_maior_65_ate_80: 0.40, gu_maior_50_ate_65: 0.80, gu_maior_30_ate_50: 1.40, gu_ate_30: 2.00 } },
  { area: "Maior que 200 até 500", areaAteHa: 500,
    aliquotas: { gu_maior_80: 0.10, gu_maior_65_ate_80: 0.60, gu_maior_50_ate_65: 1.30, gu_maior_30_ate_50: 2.30, gu_ate_30: 3.30 } },
  { area: "Maior que 500 até 1.000", areaAteHa: 1000,
    aliquotas: { gu_maior_80: 0.15, gu_maior_65_ate_80: 0.85, gu_maior_50_ate_65: 1.90, gu_maior_30_ate_50: 3.30, gu_ate_30: 4.70 } },
  { area: "Maior que 1.000 até 5.000", areaAteHa: 5000,
    aliquotas: { gu_maior_80: 0.30, gu_maior_65_ate_80: 1.60, gu_maior_50_ate_65: 3.40, gu_maior_30_ate_50: 6.00, gu_ate_30: 8.60 } },
  { area: "Acima de 5.000", areaAteHa: null,
    aliquotas: { gu_maior_80: 0.45, gu_maior_65_ate_80: 3.00, gu_maior_50_ate_65: 6.40, gu_maior_30_ate_50: 12.00, gu_ate_30: 20.00 } },
];

/**
 * Classifica o GU na faixa do anexo.
 *
 * As fronteiras são "maior que X até Y" — exclusivas embaixo, inclusivas em
 * cima. GU de exatamente 80 cai em "maior que 65 até 80", não em "maior que 80".
 * Errar isso muda a alíquota em uma ordem de grandeza.
 */
export function faixaDeGU(guPct: number): FaixaGU {
  if (guPct > 80) return "gu_maior_80";
  if (guPct > 65) return "gu_maior_65_ate_80";
  if (guPct > 50) return "gu_maior_50_ate_65";
  if (guPct > 30) return "gu_maior_30_ate_50";
  return "gu_ate_30";
}

/** Linha da tabela para a área total. "Até 50" inclui exatamente 50. */
export function linhaDeArea(areaTotalHa: number): LinhaAliquota {
  for (const linha of TABELA_ALIQUOTAS) {
    if (linha.areaAteHa === null) return linha;
    if (areaTotalHa <= linha.areaAteHa) return linha;
  }
  return TABELA_ALIQUOTAS[TABELA_ALIQUOTAS.length - 1];
}

/** Alíquota do ITR em % ao ano. */
export function aliquotaITR(areaTotalHa: number, guPct: number): number {
  return linhaDeArea(areaTotalHa).aliquotas[faixaDeGU(guPct)];
}

// ---------------------------------------------------------------------------
// Rebanho → área de pastagem comprovada
// ---------------------------------------------------------------------------

/** Contagem de cabeças por categoria, num mês. */
export type RebanhoMensal = {
  /** `YYYY-MM`. */
  mes: string;
  porCategoria: Record<string, number>;
};

/** Fatores de conversão categoria → Unidade Animal (UA = 450 kg). */
export type FatoresUA = Record<string, number>;

/**
 * Rebanho médio mensal por categoria ao longo do período.
 *
 * Média sobre TODOS os meses informados, não só os que têm a categoria: uma
 * categoria que existiu em 3 de 12 meses tem média baixa, e é isso mesmo que a
 * evidência mostra. Somar só onde existe inflaria o rebanho.
 */
export function rebanhoMedioPorCategoria(serie: RebanhoMensal[]): Record<string, number> {
  if (serie.length === 0) return {};
  const soma: Record<string, number> = {};
  for (const mes of serie) {
    for (const [cat, n] of Object.entries(mes.porCategoria)) {
      soma[cat] = (soma[cat] ?? 0) + (Number(n) || 0);
    }
  }
  const media: Record<string, number> = {};
  for (const [cat, total] of Object.entries(soma)) {
    media[cat] = total / serie.length;
  }
  return media;
}

export type ConversaoUA = {
  totalUA: number;
  porCategoria: Array<{ categoria: string; cabecas: number; fator: number | null; ua: number }>;
  /** Categorias sem fator conhecido — contam zero e são reportadas. */
  categoriasSemFator: string[];
};

/**
 * Converte rebanho médio em Unidades Animais.
 *
 * Categoria sem fator conhecido entra com UA zero e é REPORTADA. Aplicar um
 * fator arbitrário inflaria a área comprovada com um número inventado — que é
 * exatamente o que não pode acontecer num documento que o contador assina.
 */
export function converterParaUA(
  rebanhoMedio: Record<string, number>,
  fatores: FatoresUA,
): ConversaoUA {
  const porCategoria: ConversaoUA["porCategoria"] = [];
  const categoriasSemFator: string[] = [];
  let totalUA = 0;

  for (const [categoria, cabecas] of Object.entries(rebanhoMedio)) {
    const fator = fatores[categoria];
    if (fator === undefined) {
      categoriasSemFator.push(categoria);
      porCategoria.push({ categoria, cabecas, fator: null, ua: 0 });
      continue;
    }
    const ua = cabecas * fator;
    totalUA += ua;
    porCategoria.push({ categoria, cabecas, fator, ua });
  }

  return { totalUA, porCategoria, categoriasSemFator };
}

/**
 * Área de pastagem que o rebanho comprova, em hectares.
 *
 * `area = rebanho em UA ÷ índice de lotação da zona (UA/ha)`
 */
export function areaPastagemComprovada(totalUA: number, indiceLotacao: number): number | null {
  if (!Number.isFinite(indiceLotacao) || indiceLotacao <= 0) return null;
  return totalUA / indiceLotacao;
}

/**
 * Grau de Utilização em %, limitado a 100.
 *
 * Arredonda a 6 casas antes de devolver, e isso NÃO é cosmético.
 * `700 / 0.7 * 100` dá `100.00000000000001` em ponto flutuante. Um GU que é
 * matematicamente igual a 50 vira `50.000000000000006`, cruza a fronteira
 * "maior que 50" do anexo, e a alíquota cai de 3,30% para 1,90% — a favor do
 * contribuinte, sem erro visível, num documento que o contador assina.
 *
 * Seis casas eliminam o ruído (ordem de 1e-13) e preservam qualquer precisão
 * real que o dado tenha.
 */
export function grauUtilizacao(areaUtilizadaHa: number, areaAproveitavelHa: number): number | null {
  if (!Number.isFinite(areaAproveitavelHa) || areaAproveitavelHa <= 0) return null;
  const bruto = (areaUtilizadaHa / areaAproveitavelHa) * 100;
  return Math.min(100, Math.round(bruto * 1e6) / 1e6);
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

export type EntradaRelatorioITR = {
  propriedade: { nome: string; municipio: string; uf: string; nirf?: string | null };
  exercicio: number;
  areaTotalHa: number;
  areaAproveitavelHa: number;
  /** Pastagem declarada pelo produtor, para confronto com a comprovada. */
  areaPastagemDeclaradaHa: number;
  /** Demais áreas utilizadas que não vêm do rebanho (lavoura, floresta plantada). */
  outrasAreasUtilizadasHa?: number;
  serieRebanho: RebanhoMensal[];
  fatoresUA: FatoresUA;
  /** UA/ha da zona. Vem de regra ainda não verificada — ver R-ITR-01. */
  indiceLotacaoUAporHa: number | null;
  vtnTributavelReais?: number | null;
  ditrAnterior?: { exercicio: number; guPct: number; aliquotaPct: number; imposto?: number | null } | null;
  /** Estado de verificação das regras usadas. Decide se o relatório é publicável. */
  regrasVerificadas: { tabelaAliquotas: boolean; indiceLotacao: boolean; conversaoUA: boolean };
};

export type Achado = {
  tipo: string;
  severidade: "info" | "warning" | "critical";
  mensagem: string;
  regra: string | null;
};

export type RelatorioITR = {
  cabecalho: EntradaRelatorioITR["propriedade"] & { exercicio: number };
  rebanho: {
    mesesNaSerie: number;
    medioPorCategoria: Record<string, number>;
    conversao: ConversaoUA;
  };
  areas: {
    totalHa: number;
    aproveitavelHa: number;
    pastagemDeclaradaHa: number;
    pastagemComprovadaHa: number | null;
    pastagemNaoComprovadaHa: number | null;
    outrasUtilizadasHa: number;
    utilizadaTotalHa: number | null;
  };
  guPct: number | null;
  faixaGU: FaixaGU | null;
  aliquotaPct: number | null;
  impostoEstimadoReais: number | null;
  comparacaoAnterior: null | {
    exercicio: number;
    deltaGUpp: number | null;
    deltaAliquotaPP: number | null;
    observacao: string;
  };
  achados: Achado[];
  publicavel: boolean;
  avisos: string[];
};

/**
 * Monta o relatório de suporte à DITR.
 *
 * Nada aqui é declaração. É a evidência que o contador usa para preencher e
 * assinar — e o campo `publicavel` diz se ela pode sequer sair do sistema.
 */
export function montarRelatorioITR(e: EntradaRelatorioITR): RelatorioITR {
  const achados: Achado[] = [];
  const avisos: string[] = [];

  const medio = rebanhoMedioPorCategoria(e.serieRebanho);
  const conversao = converterParaUA(medio, e.fatoresUA);

  if (e.serieRebanho.length === 0) {
    achados.push({
      tipo: "itr.rebanho_ausente", severidade: "critical", regra: null,
      mensagem: "Sem série de rebanho no período. Não há como comprovar área de pastagem.",
    });
  } else if (e.serieRebanho.length < 12) {
    achados.push({
      tipo: "itr.serie_incompleta", severidade: "warning", regra: null,
      mensagem: `Série com ${e.serieRebanho.length} de 12 meses. A média mensal fica sobre base parcial.`,
    });
  }

  if (conversao.categoriasSemFator.length > 0) {
    achados.push({
      tipo: "itr.categoria_sem_fator_ua", severidade: "warning", regra: "R-ITR-01",
      mensagem:
        `Categorias sem fator de conversão para UA, contadas como zero: ` +
        `${conversao.categoriasSemFator.join(", ")}. A área comprovada está subestimada.`,
    });
  }

  const pastagemComprovada =
    e.indiceLotacaoUAporHa === null
      ? null
      : areaPastagemComprovada(conversao.totalUA, e.indiceLotacaoUAporHa);

  if (pastagemComprovada === null) {
    achados.push({
      tipo: "itr.indice_lotacao_ausente", severidade: "critical", regra: "R-ITR-01",
      mensagem:
        "Índice de lotação da zona não informado. Sem ele não há conversão de rebanho em área de pastagem.",
    });
  }

  const naoComprovada =
    pastagemComprovada === null ? null : Math.max(0, e.areaPastagemDeclaradaHa - pastagemComprovada);

  if (naoComprovada !== null && naoComprovada > 0) {
    achados.push({
      tipo: "itr.gu_sem_prova", severidade: "warning", regra: "R-ITR-01",
      mensagem:
        `Pastagem declarada excede a comprovada pelo rebanho em ${naoComprovada.toFixed(1)} ha ` +
        `(${e.areaPastagemDeclaradaHa.toFixed(1)} declarados contra ${pastagemComprovada!.toFixed(1)} comprovados). ` +
        "Conferir com o contador antes de declarar.",
    });
  }

  const outras = e.outrasAreasUtilizadasHa ?? 0;
  // A pastagem que entra no GU é a COMPROVADA, nunca a declarada. Usar a
  // declarada seria otimizar o GU com número que a evidência não sustenta.
  const utilizadaTotal = pastagemComprovada === null ? null : pastagemComprovada + outras;

  const gu = utilizadaTotal === null ? null : grauUtilizacao(utilizadaTotal, e.areaAproveitavelHa);
  const faixa = gu === null ? null : faixaDeGU(gu);
  const aliquota = gu === null ? null : aliquotaITR(e.areaTotalHa, gu);

  const imposto =
    aliquota === null || e.vtnTributavelReais == null
      ? null
      : (e.vtnTributavelReais * aliquota) / 100;

  let comparacao: RelatorioITR["comparacaoAnterior"] = null;
  if (e.ditrAnterior) {
    const dGU = gu === null ? null : gu - e.ditrAnterior.guPct;
    const dAl = aliquota === null ? null : aliquota - e.ditrAnterior.aliquotaPct;
    comparacao = {
      exercicio: e.ditrAnterior.exercicio,
      deltaGUpp: dGU,
      deltaAliquotaPP: dAl,
      observacao:
        dGU === null
          ? "Sem GU calculado neste exercício — comparação indisponível."
          : Math.abs(dGU) < 1
            ? "GU praticamente estável em relação ao exercício anterior."
            : dGU > 0
              ? `GU ${dGU.toFixed(1)} p.p. maior que no exercício anterior.`
              : `GU ${Math.abs(dGU).toFixed(1)} p.p. menor. Conferir se houve redução real de rebanho ou de área.`,
    };
    if (dGU !== null && dGU < -10) {
      achados.push({
        tipo: "itr.queda_de_gu", severidade: "warning", regra: null,
        mensagem:
          `Queda de ${Math.abs(dGU).toFixed(1)} p.p. no GU em relação a ${e.ditrAnterior.exercicio}. ` +
          "Alíquota tende a subir. Confirmar a causa com o contador.",
      });
    }
  }

  // Publicabilidade: toda regra que entrou no cálculo precisa estar verificada.
  const naoVerificadas: string[] = [];
  if (!e.regrasVerificadas.tabelaAliquotas) naoVerificadas.push("tabela de alíquotas");
  if (!e.regrasVerificadas.indiceLotacao) naoVerificadas.push("índice de lotação da zona");
  if (!e.regrasVerificadas.conversaoUA) naoVerificadas.push("conversão para UA");

  if (naoVerificadas.length > 0) {
    avisos.push(
      `NÃO PUBLICÁVEL: ${naoVerificadas.join(", ")} sem verificação em fonte primária (R-ITR-01).`,
    );
  }
  avisos.push(
    "Este relatório é evidência de apoio, não declaração. Quem preenche GU e VTN na DITR e assina é o contador.",
  );

  return {
    cabecalho: { ...e.propriedade, exercicio: e.exercicio },
    rebanho: { mesesNaSerie: e.serieRebanho.length, medioPorCategoria: medio, conversao },
    areas: {
      totalHa: e.areaTotalHa,
      aproveitavelHa: e.areaAproveitavelHa,
      pastagemDeclaradaHa: e.areaPastagemDeclaradaHa,
      pastagemComprovadaHa: pastagemComprovada,
      pastagemNaoComprovadaHa: naoComprovada,
      outrasUtilizadasHa: outras,
      utilizadaTotalHa: utilizadaTotal,
    },
    guPct: gu,
    faixaGU: faixa,
    aliquotaPct: aliquota,
    impostoEstimadoReais: imposto,
    comparacaoAnterior: comparacao,
    achados,
    publicavel: naoVerificadas.length === 0,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// Dados de exemplo — estrutura pronta para receber a FSJBE
// ---------------------------------------------------------------------------

/**
 * Fazenda de exemplo, com a MESMA forma que o dado da FSJBE terá.
 *
 * São dados inventados e estão marcados como tal: servem para validar o motor e
 * mostrar o formato ao contador antes de o dado real chegar (prazo 12/09/2026).
 * Nenhum número daqui pode aparecer em material externo.
 */
export const EXEMPLO_MOCK: EntradaRelatorioITR = {
  propriedade: { nome: "[MOCK] Fazenda Exemplo", municipio: "Jussara", uf: "GO", nirf: null },
  exercicio: 2026,
  areaTotalHa: 1200,
  areaAproveitavelHa: 980,
  areaPastagemDeclaradaHa: 900,
  outrasAreasUtilizadasHa: 0,
  serieRebanho: Array.from({ length: 12 }, (_, i) => ({
    mes: `2025-${String(i + 1).padStart(2, "0")}`,
    porCategoria: {
      vaca: 420 + (i % 3) * 10,
      bezerro_ate_12m: 180 - (i % 4) * 5,
      novilha_12_24m: 150,
      boi_adulto: 60,
      touro: 12,
    },
  })),
  fatoresUA: {
    vaca: 1.0, bezerro_ate_12m: 0.25, novilha_12_24m: 0.5, boi_adulto: 1.0, touro: 1.25,
  },
  indiceLotacaoUAporHa: 0.7,
  vtnTributavelReais: 4_800_000,
  ditrAnterior: { exercicio: 2025, guPct: 78.0, aliquotaPct: 0.15, imposto: 7200 },
  // Só a tabela de alíquotas está verificada. Por isso o relatório sai NÃO PUBLICÁVEL.
  regrasVerificadas: { tabelaAliquotas: true, indiceLotacao: false, conversaoUA: false },
};
