/**
 * FUNRURAL — alíquotas parametrizadas por cliente (camada de EXIBIÇÃO).
 *
 * Fonte legal: Lei Complementar 224/2025, vigente a partir de 01/04/2026.
 * Alíquotas da contribuição previdenciária rural sobre a receita bruta da
 * comercialização da produção:
 *
 *   - Produtor rural PESSOA FÍSICA (PF) ......... 1,63%  (0.0163)
 *   - Produtor rural PESSOA JURÍDICA (PJ) ....... 2,23%  (0.0223)
 *   - Segurado especial (agricultura familiar) .. 1,50%  (0.0150)
 *
 * As alíquotas acima já contemplam o total consolidado (INSS + RAT/SAT +
 * SENAR) conforme a LC 224/2025 — NÃO somar RAT/SENAR por cima.
 *
 * IMPORTANTE: este módulo é PURO (sem I/O) e serve apenas para exibir os
 * números nas telas de controladoria/contador/banco. A cadeia de ROI e os
 * cálculos gravados no banco vivem em triggers/migrations já parametrizados
 * (migrations 131/141) — não duplicar essa lógica aqui.
 *
 * Parametrização por cliente:
 *   clients.funrural_rate  numeric  DEFAULT 0.0163  (alíquota decimal explícita)
 *   clients.tax_regime     text     DEFAULT 'pf'    (regime tributário)
 *
 * Precedência: se `funrural_rate` estiver preenchido, ele MANDA (permite
 * override manual pelo contador). Só caímos no mapeamento por `tax_regime`
 * quando `funrural_rate` for nulo. Fallback final: 0.0163 (PF), o caso mais
 * comum de produtor rural — evita exibir "0" ou quebrar a tela quando um
 * cliente antigo não tem nenhum dos dois campos preenchido.
 */

/** Alíquota decimal do produtor rural PF — LC 224/2025 (01/04/2026). */
export const FUNRURAL_RATE_PF = 0.0163;
/** Alíquota decimal do produtor rural PJ — LC 224/2025 (01/04/2026). */
export const FUNRURAL_RATE_PJ = 0.0223;
/** Alíquota decimal do segurado especial — LC 224/2025 (01/04/2026). */
export const FUNRURAL_RATE_SEGURADO_ESPECIAL = 0.015;

/** Fallback quando cliente não tem funrural_rate nem tax_regime. */
export const FUNRURAL_RATE_DEFAULT = FUNRURAL_RATE_PF;

/** Forma mínima do cliente exigida pelos helpers (só os campos fiscais). */
export type FunruralClient = {
  funrural_rate?: number | null;
  tax_regime?: string | null;
};

/**
 * Mapeia o regime tributário textual para a alíquota decimal.
 * Aceita as variações comuns em pt-BR e os códigos curtos do banco
 * ('pf', 'pj', 'segurado_especial').
 */
function rateFromTaxRegime(taxRegime: string): number | null {
  const norm = taxRegime.trim().toLowerCase();

  // Segurado especial (agricultura familiar) — checar antes de PF/PJ para
  // não colidir com substrings.
  if (
    norm.includes("segurado especial") ||
    norm.includes("segurado_especial") ||
    norm === "se"
  ) {
    return FUNRURAL_RATE_SEGURADO_ESPECIAL;
  }

  // Pessoa jurídica
  if (
    norm === "pj" ||
    norm.includes("pessoa juridica") ||
    norm.includes("pessoa jurídica") ||
    norm.includes("juridica") ||
    norm.includes("jurídica")
  ) {
    return FUNRURAL_RATE_PJ;
  }

  // Pessoa física
  if (
    norm === "pf" ||
    norm.includes("pessoa fisica") ||
    norm.includes("pessoa física") ||
    norm.includes("fisica") ||
    norm.includes("física")
  ) {
    return FUNRURAL_RATE_PF;
  }

  return null;
}

/**
 * Retorna a alíquota decimal do FUNRURAL para um cliente.
 * Precedência: funrural_rate explícito > mapeamento por tax_regime > fallback PF.
 */
export function funruralRate(client: FunruralClient | null | undefined): number {
  if (client) {
    // funrural_rate explícito manda (override do contador).
    if (
      client.funrural_rate !== null &&
      client.funrural_rate !== undefined &&
      Number.isFinite(Number(client.funrural_rate))
    ) {
      return Number(client.funrural_rate);
    }

    // Senão, deriva do regime tributário.
    if (client.tax_regime) {
      const byRegime = rateFromTaxRegime(client.tax_regime);
      if (byRegime !== null) return byRegime;
    }
  }

  // Fallback: PF (caso mais comum) — comentado em detalhe no topo do arquivo.
  return FUNRURAL_RATE_DEFAULT;
}

/**
 * Valor de FUNRURAL devido sobre um total de receita bruta.
 * `totalAmount` é a base (receita bruta de saídas/comercialização).
 */
export function funruralValue(
  totalAmount: number,
  client: FunruralClient | null | undefined,
): number {
  return totalAmount * funruralRate(client);
}

/**
 * Label da alíquota em pt-BR para exibição em textos ("1,63%").
 * Usa 2 casas quando necessário, sem casas quando inteiro (raro).
 */
export function funruralRateLabel(
  client: FunruralClient | null | undefined,
): string {
  const pct = funruralRate(client) * 100;
  const formatted = pct.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted}%`;
}
