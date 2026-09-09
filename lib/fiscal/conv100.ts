/**
 * B1 — verificador do Convênio ICMS 100/97.
 *
 * Recebe os campos que o parser já extrai da NF-e e devolve o ICMS que seria
 * devido com o benefício, quanto foi pago a mais, e o motivo.
 *
 * ── O QUE ESTE MÓDULO SE RECUSA A FAZER ───────────────────────────────────
 *
 * Falso positivo aqui não custa um bug: custa a credibilidade com o contador,
 * que é o canal comercial. Um alerta de "você pagou imposto a mais" que não se
 * sustenta queima a relação de uma vez. Por isso os três desfechos são
 * SEPARADOS e nunca se misturam:
 *
 *   1. BENEFÍCIO APLICÁVEL E AUSENTE — a operação tinha direito e a nota não
 *      aplicou. Só AQUI existe `icms_pago_a_mais`.
 *   2. BENEFÍCIO NÃO APLICÁVEL — produto fora da lista, destinatário errado,
 *      destinação diversa. Registro informativo. NUNCA "pago a mais".
 *   3. REGRA DESCONHECIDA — não há regra verificada para aquela UF ou aquele
 *      NCM. Alerta `info` de "verificar". NUNCA "pago a mais".
 *
 * E mais uma trava: o Convênio classifica por DESCRIÇÃO, não por NCM. O mapa
 * NCM → cláusula é inferência nossa (`mapa_ncm` em R-ICMS-CONV100-01, com
 * `verificado_em: null`). Enquanto ele não for conferido por contador, todo
 * achado sai REBAIXADO para "verificar" — `confiavelParaCobranca` diz quando.
 *
 * Regras e fontes: `rules/icms/R-ICMS-CONV100-01.yaml`.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Clausula = "primeira" | "segunda";

/** Entrada: exatamente o que `nfe-parser` já produz, mais o contexto da nota. */
export type ItemParaAvaliar = {
  ncm: string;
  cfop: string;
  descricao: string;
  valorTotal: number | null;
  cst: string;
  icmsBase: number | null;
  icmsReducaoBasePct: number | null;
  icmsAliquota: number | null;
  icmsValor: number | null;
  icmsDesonerado: number | null;
  beneficioCodigo: string;
};

export type ContextoOperacao = {
  ufEmitente: string;
  ufDestinatario: string;
  /** UF que exige cBenef na nota. Fora dessa lista, ausência não é achado. */
  ufExigeCbenef?: boolean;
  /**
   * Tratamento da UF de destino nas operações INTERNAS (cláusula terceira).
   * `null` = não verificado. Sem isso, operação interna nunca vira "pago a mais".
   */
  tratamentoInterno?: { tipo: "isencao" | "reducao"; reducaoPct?: number } | null;
};

export type DesfechoTipo =
  | "beneficio_ausente"      // 1 — tinha direito, não aplicou
  | "beneficio_divergente"   // 1 — aplicou, mas com percentual errado
  | "beneficio_aplicado"     // conforme, nada a fazer
  | "nao_aplicavel"          // 2 — fora do alcance
  | "desconhecido";          // 3 — sem regra verificada

export type Avaliacao = {
  ncm: string;
  descricao: string;
  desfecho: DesfechoTipo;
  clausula: Clausula | null;
  operacao: "interna" | "interestadual";
  reducaoEsperadaPct: number | null;
  reducaoAplicadaPct: number | null;
  icmsDestacado: number | null;
  icmsDevidoComBeneficio: number | null;
  /** Só existe no desfecho 1. Em 2 e 3 é SEMPRE null. */
  icmsPagoAMais: number | null;
  motivo: string;
  alertType: string;
  severidade: "info" | "warning" | "critical";
  /**
   * O achado pode virar número apresentado ao produtor?
   * Falso enquanto o mapa NCM for premissa não verificada.
   */
  confiavelParaCobranca: boolean;
  regra: string;
};

/** Mapa NCM → cláusula. Espelha `mapa_ncm` da regra; é PREMISSA, não norma. */
export type MapaNcm = Array<{ prefixo: string; clausula: Clausula; item: string; nota?: string }>;

export type ConfigConv100 = {
  mapaNcm: MapaNcm;
  foraDoConvenio: Array<{ prefixo: string; nota?: string }>;
  /** O mapa NCM já foi conferido por contador? Enquanto false, tudo é "verificar". */
  mapaNcmVerificado: boolean;
  reducaoPrimeiraPct: number;
  reducaoSegundaPct: number;
};

const REGRA = "R-ICMS-CONV100-01";

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------

/** Entrada (CFOP 1/2/3) ou saída (5/6/7). O Convênio trata SAÍDAS do vendedor. */
export function ehEntrada(cfop: string): boolean {
  const d = (cfop ?? "").trim().charAt(0);
  return d === "1" || d === "2" || d === "3";
}

/**
 * Interna ou interestadual.
 *
 * Não usa o CFOP: o primeiro dígito distingue entrada de saída, e o segundo
 * dígito só é confiável quando a nota está bem emitida. As UFs são o fato.
 */
export function tipoDeOperacao(ctx: ContextoOperacao): "interna" | "interestadual" {
  const a = (ctx.ufEmitente ?? "").trim().toUpperCase();
  const b = (ctx.ufDestinatario ?? "").trim().toUpperCase();
  if (!a || !b) return "interestadual"; // sem as duas pontas, assume o caso com regra federal
  return a === b ? "interna" : "interestadual";
}

/** Casa o NCM com o prefixo mais específico (mais longo) que bater. */
export function classificarNcm(
  ncm: string,
  cfg: ConfigConv100,
): { clausula: Clausula; item: string } | "fora" | null {
  const n = (ncm ?? "").replace(/\D/g, "");
  if (!n) return null;

  const fora = cfg.foraDoConvenio
    .filter(f => n.startsWith(f.prefixo))
    .sort((a, b) => b.prefixo.length - a.prefixo.length)[0];
  if (fora) return "fora";

  const hit = cfg.mapaNcm
    .filter(m => n.startsWith(m.prefixo))
    .sort((a, b) => b.prefixo.length - a.prefixo.length)[0];
  return hit ? { clausula: hit.clausula, item: hit.item } : null;
}

// ---------------------------------------------------------------------------
// Avaliação
// ---------------------------------------------------------------------------

function semAchado(
  item: ItemParaAvaliar, operacao: "interna" | "interestadual",
  desfecho: DesfechoTipo, motivo: string, alertType: string,
  severidade: Avaliacao["severidade"], clausula: Clausula | null = null,
): Avaliacao {
  return {
    ncm: item.ncm, descricao: item.descricao, desfecho, clausula, operacao,
    reducaoEsperadaPct: null, reducaoAplicadaPct: item.icmsReducaoBasePct,
    icmsDestacado: item.icmsValor, icmsDevidoComBeneficio: null,
    icmsPagoAMais: null, // desfechos 2 e 3 NUNCA produzem valor
    motivo, alertType, severidade, confiavelParaCobranca: false, regra: REGRA,
  };
}

/**
 * Avalia um item de NF-e contra o Convênio 100/97.
 *
 * A ordem das guardas importa: cada uma elimina um caminho de falso positivo
 * antes que o próximo teste possa produzir um número.
 */
export function avaliarItem(
  item: ItemParaAvaliar,
  ctx: ContextoOperacao,
  cfg: ConfigConv100,
): Avaliacao {
  const a = avaliarItemBase(item, ctx, cfg);
  // O refinamento de CST é aplicado AQUI, não só em `avaliarNota`. Deixá-lo
  // fora obrigaria todo chamador a lembrar de compor — e quem esquecesse
  // perderia o achado em silêncio, que é o padrão de erro que este módulo
  // inteiro existe para evitar.
  return avaliarCst(a, item.cst) ?? a;
}

function avaliarItemBase(
  item: ItemParaAvaliar,
  ctx: ContextoOperacao,
  cfg: ConfigConv100,
): Avaliacao {
  const operacao = tipoDeOperacao(ctx);
  const cst = (item.cst ?? "").trim();

  // ── Guarda 1: combustível é do B2, não daqui ─────────────────────────────
  if (cst === "61") {
    return semAchado(item, operacao, "nao_aplicavel",
      "Item com ICMS monofásico (CST 61). Combustível é tratado no crédito de diesel, não no Convênio 100/97.",
      "icms.conv100.nao_aplicavel", "info");
  }

  // ── Guarda 2: diferimento, suspensão e não-tributada estão fora ──────────
  if (cst === "51" || cst === "50" || cst === "41") {
    return semAchado(item, operacao, "nao_aplicavel",
      `CST ${cst} não é caso de Convênio 100/97 — o tratamento vem de outra norma.`,
      "icms.conv100.nao_aplicavel", "info");
  }

  // ── Guarda 3: o produto está no alcance? ────────────────────────────────
  const classe = classificarNcm(item.ncm, cfg);

  if (classe === "fora") {
    return semAchado(item, operacao, "nao_aplicavel",
      `NCM ${item.ncm} está expressamente fora do Convênio 100/97.`,
      "icms.conv100.nao_aplicavel", "info");
  }
  if (classe === null) {
    // Desfecho 3: não sabemos. Jamais afirmar que pagou a mais.
    return semAchado(item, operacao, "desconhecido",
      `NCM ${item.ncm} não consta do mapeamento do Convênio 100/97. Verificar com o contador se o produto se enquadra.`,
      "icms.conv100.uf_nao_mapeada", "info");
  }

  // ── Guarda 4: operação interna depende da UF ter internalizado ───────────
  if (operacao === "interna") {
    const t = ctx.tratamentoInterno;
    if (!t) {
      return semAchado(item, operacao, "desconhecido",
        `Operação interna em ${ctx.ufDestinatario}. A cláusula terceira apenas AUTORIZA o Estado a isentar ou reduzir — sem a regra da UF verificada, não é possível afirmar o tratamento.`,
        "icms.conv100.uf_nao_mapeada", "info", classe.clausula);
    }
    if (t.tipo === "isencao") {
      const conforme = cst === "40" || (item.icmsValor ?? 0) === 0;
      return conforme
        ? semAchado(item, operacao, "beneficio_aplicado",
            `Operação interna isenta em ${ctx.ufDestinatario}, conforme aplicado.`,
            "icms.conv100.nao_aplicavel", "info", classe.clausula)
        : {
            ...semAchado(item, operacao, "beneficio_ausente",
              `Operação interna com isenção em ${ctx.ufDestinatario}, mas a nota destacou ICMS de ${item.icmsValor}.`,
              "icms.conv100.beneficio_ausente", "warning", classe.clausula),
            icmsDevidoComBeneficio: 0,
            icmsPagoAMais: item.icmsValor ?? 0,
            confiavelParaCobranca: cfg.mapaNcmVerificado,
          };
    }
    // UF reduz em vez de isentar: segue o cálculo com o percentual dela.
    return avaliarReducao(item, ctx, cfg, operacao, classe.clausula, t.reducaoPct ?? 0);
  }

  // ── Interestadual: percentual da cláusula ───────────────────────────────
  const esperada = classe.clausula === "primeira" ? cfg.reducaoPrimeiraPct : cfg.reducaoSegundaPct;
  return avaliarReducao(item, ctx, cfg, operacao, classe.clausula, esperada);
}

/** Compara a redução aplicada com a esperada e apura a diferença. */
function avaliarReducao(
  item: ItemParaAvaliar,
  ctx: ContextoOperacao,
  cfg: ConfigConv100,
  operacao: "interna" | "interestadual",
  clausula: Clausula,
  esperadaPct: number,
): Avaliacao {
  const aplicadaPct = item.icmsReducaoBasePct ?? 0;
  const aliq = item.icmsAliquota;
  const valorItem = item.valorTotal;
  const destacado = item.icmsValor;

  const base = {
    ncm: item.ncm, descricao: item.descricao, clausula, operacao,
    reducaoEsperadaPct: esperadaPct, reducaoAplicadaPct: item.icmsReducaoBasePct,
    icmsDestacado: destacado, regra: REGRA,
  };

  // Sem alíquota ou sem valor, não há como calcular. Não inventa número.
  if (aliq == null || valorItem == null) {
    return {
      ...base, desfecho: "desconhecido",
      icmsDevidoComBeneficio: null, icmsPagoAMais: null,
      motivo: "Nota sem alíquota ou sem valor do item — não é possível apurar a diferença.",
      alertType: "icms.conv100.uf_nao_mapeada", severidade: "info",
      confiavelParaCobranca: false,
    };
  }

  const devido = Number((valorItem * (1 - esperadaPct / 100) * (aliq / 100)).toFixed(2));

  // Tolerância de um centavo: arredondamento do emitente não é achado.
  if (Math.abs(aplicadaPct - esperadaPct) < 0.01) {
    return {
      ...base, desfecho: "beneficio_aplicado",
      icmsDevidoComBeneficio: devido, icmsPagoAMais: null,
      motivo: `Redução de ${esperadaPct}% aplicada conforme a cláusula ${clausula}.`,
      alertType: "icms.conv100.nao_aplicavel", severidade: "info",
      confiavelParaCobranca: false,
    };
  }

  const diferenca = Number(((destacado ?? 0) - devido).toFixed(2));

  // Redução MAIOR que a esperada: benefício a mais, não a menos. Nunca vira
  // "pago a mais" — e é achado do contador, não nosso.
  if (diferenca <= 0) {
    return {
      ...base, desfecho: "beneficio_divergente",
      icmsDevidoComBeneficio: devido, icmsPagoAMais: null,
      motivo: `Redução aplicada (${aplicadaPct}%) é maior que a prevista (${esperadaPct}%) para a cláusula ${clausula}. Conferir o enquadramento com o contador.`,
      alertType: "icms.conv100.reducao_divergente", severidade: "warning",
      confiavelParaCobranca: false,
    };
  }

  const semReducao = aplicadaPct === 0;
  return {
    ...base,
    desfecho: semReducao ? "beneficio_ausente" : "beneficio_divergente",
    icmsDevidoComBeneficio: devido,
    icmsPagoAMais: diferenca,
    motivo: semReducao
      ? `Base cheia numa operação com direito a redução de ${esperadaPct}% (cláusula ${clausula}). Diferença estimada de R$ ${diferenca.toFixed(2)}. Verificar com o contador.`
      : `Redução aplicada de ${aplicadaPct}% contra ${esperadaPct}% previstos na cláusula ${clausula}. Diferença estimada de R$ ${diferenca.toFixed(2)}. Verificar com o contador.`,
    alertType: semReducao ? "icms.conv100.base_cheia" : "icms.conv100.reducao_divergente",
    severidade: "warning",
    // Só é número apresentável se o mapa NCM já tiver sido conferido.
    confiavelParaCobranca: cfg.mapaNcmVerificado,
  };
}

// ---------------------------------------------------------------------------
// cBenef e CST — achados próprios
// ---------------------------------------------------------------------------

/**
 * UF que exige `cBenef` e nota sem o código.
 *
 * Achado separado de propósito: é problema de preenchimento da nota, não de
 * imposto pago a mais. Misturar os dois inflaria o valor apurado.
 */
export function avaliarCbenef(
  item: ItemParaAvaliar, ctx: ContextoOperacao, temBeneficio: boolean,
): Avaliacao | null {
  if (!ctx.ufExigeCbenef || !temBeneficio || item.beneficioCodigo) return null;
  return semAchado(item, tipoDeOperacao(ctx), "desconhecido",
    `A UF ${ctx.ufEmitente} exige o código de benefício (cBenef) na nota e o campo veio vazio. Conferir com o fornecedor.`,
    "icms.cbenef_ausente", "warning");
}

/** CST 00 (tributada integral) num item com direito a redução é suspeita. */
export function avaliarCst(a: Avaliacao, cst: string): Avaliacao | null {
  if ((cst ?? "").trim() !== "00") return null;
  if (a.desfecho !== "beneficio_ausente") return null;
  return {
    ...a,
    alertType: "icms.cst_incoerente",
    motivo: `CST 00 (tributada integralmente) num item com direito a redução pela cláusula ${a.clausula}. ${a.motivo}`,
  };
}

// ---------------------------------------------------------------------------
// Nota inteira
// ---------------------------------------------------------------------------

export type ResultadoNota = {
  avaliacoes: Avaliacao[];
  /** Soma APENAS dos itens com desfecho 1 e mapa verificado. */
  totalPagoAMais: number;
  /** Soma dos itens com desfecho 1 mas mapa ainda não verificado. */
  totalAVerificar: number;
  itensForaDoAlcance: number;
  itensDesconhecidos: number;
  /** Nenhum valor pode ser apresentado como devido enquanto isto for falso. */
  apresentavelAoProdutor: boolean;
};

/** Avalia todos os itens de uma nota e consolida. */
export function avaliarNota(
  itens: ItemParaAvaliar[],
  ctx: ContextoOperacao,
  cfg: ConfigConv100,
): ResultadoNota {
  // `avaliarItem` já aplica o refinamento de CST — não recompor aqui.
  const avaliacoes = itens.map(item => avaliarItem(item, ctx, cfg));

  const comDiferenca = avaliacoes.filter(a => (a.icmsPagoAMais ?? 0) > 0);
  const soma = (list: Avaliacao[]) =>
    Number(list.reduce((n, a) => n + (a.icmsPagoAMais ?? 0), 0).toFixed(2));

  return {
    avaliacoes,
    totalPagoAMais: soma(comDiferenca.filter(a => a.confiavelParaCobranca)),
    totalAVerificar: soma(comDiferenca.filter(a => !a.confiavelParaCobranca)),
    itensForaDoAlcance: avaliacoes.filter(a => a.desfecho === "nao_aplicavel").length,
    itensDesconhecidos: avaliacoes.filter(a => a.desfecho === "desconhecido").length,
    apresentavelAoProdutor: cfg.mapaNcmVerificado,
  };
}
