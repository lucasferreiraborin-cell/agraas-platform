export function calculateAgeInMonths(birthDate: string | null | undefined) {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const now = new Date();

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}


export function getPassportConfidenceText(score: number): string {
  if (score >= 80) return "Animal com alto nível de rastreabilidade e confiabilidade operacional";
  if (score >= 60) return "Animal com nível moderado de rastreabilidade e histórico em consolidação";
  return "Animal com rastreabilidade em desenvolvimento — enriqueça os dados para elevar o score";
}

export function getPassportClassification(score: number): string {
  if (score >= 80) return "Premium";
  if (score >= 60) return "Standard";
  return "Em desenvolvimento";
}

export function getMarketPotential(score: number): string {
  if (score >= 80) return "Alto valor";
  if (score >= 60) return "Valor moderado";
  return "Em formação";
}

export function getExportEligibility(score: number): string {
  if (score >= 80) return "Elegível para exportação";
  if (score >= 60) return "Verificar requisitos";
  return "Não elegível";
}

export function calculateDailyGain(
  currentWeight: number | null,
  previousWeight: number | null,
  currentDate: string | null | undefined,
  previousDate: string | null | undefined
) {
  if (
    currentWeight === null ||
    previousWeight === null ||
    !currentDate ||
    !previousDate
  ) {
    return null;
  }

  const current = new Date(currentDate).getTime();
  const previous = new Date(previousDate).getTime();

  const diffDays = Math.round((current - previous) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return null;

  return Number(((currentWeight - previousWeight) / diffDays).toFixed(3));
}

export function getProductiveRiskLabel(
  delta: number | null,
  gmd: number | null
) {
  if (delta === null && gmd === null) return "Sem base";
  if (delta !== null && delta < 0) return "Risco";
  if (gmd !== null && gmd < 0.2) return "Atenção";
  if (gmd !== null && gmd >= 0.8) return "Destaque";
  return "Estável";
}

export function getRiskBadgeClass(label: string) {
  if (label === "Risco") {
    return "inline-flex rounded-full bg-[rgba(214,69,69,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)]";
  }

  if (label === "Atenção") {
    return "inline-flex rounded-full bg-[rgba(217,163,67,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)]";
  }

  if (label === "Destaque") {
    return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  }

  return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
}

// =============================================================================
// GMD PREDITIVO — v1 HONESTA (trajetória de ganho médio diário por fase)
// -----------------------------------------------------------------------------
// PRINCÍPIO DE HONESTIDADE (inegociável — validado com o zootecnista):
//   Isto NÃO é uma "previsão calibrada" nem um "modelo com X% de acurácia".
//   Com uma base de poucas dezenas de animais de UMA fazenda, é uma REGRA DE
//   NEGÓCIO / referência técnica ancorada em literatura Embrapa Gado de Corte.
//   Nunca exibimos probabilidade. O flag de risco é um GATILHO PARA INVESTIGAR
//   A CAUSA (verminose, mineral, pasto, disputa de cocho), nunca um veredito de
//   descarte. Ganho compensatório é real: um GMD baixo isolado (ex.: na seca)
//   NÃO condena o animal — o sinal só vale em trajetória sustentada.
// =============================================================================

const DAY_MS = 86_400_000;

/**
 * Janela mínima (em dias) para um intervalo entre pesagens ser considerado
 * confiável. Abaixo disso o GMD é dominado por ruído de enchimento de trato
 * (rúmen cheio/vazio, água, bosta) e não por deposição real de tecido.
 * Fonte: prática de campo de pesagem em curral (recomenda-se intervalos
 * de ~28 dias ou mais para leitura de ganho a pasto).
 */
export const GMD_MIN_RELIABLE_DAYS = 21;

/**
 * Janela mínima acumulada (em dias) para o flag de "risco de atraso no ciclo".
 * Exigir ~2 meses de trajetória evita condenar o animal por uma pesagem ruim
 * isolada e respeita o ganho compensatório.
 */
export const GMD_RISK_MIN_WINDOW_DAYS = 60;

// -----------------------------------------------------------------------------
// FAIXAS DE GMD (kg/dia) POR FASE
// DECISÃO DE EQUIPE AGRAAS PENDENTE DE VALIDAÇÃO CIENTÍFICA (Renata/Franzon)
// -----------------------------------------------------------------------------
// Fonte: literatura aplicada Embrapa Gado de Corte (recria/suplementação a
// pasto). Recria é sazonal: seca (abr–set) tem alvo menor que águas (out–mar)
// justamente porque o ganho compensatório recupera na estação chuvosa — por
// isso NÃO se condena um GMD baixo de seca isolado.
export const PHASE_GMD_BANDS = {
  // Cria (0–8m): bezerro ao pé / desmama.
  cria: {
    target: { min: 0.6, max: 0.9 },
    attentionBelow: 0.4,
  },
  // Recria (8–18m, foco 8–12m): fase onde atraso sustentado compromete o ciclo.
  recria: {
    seca: { target: { min: 0.3, max: 0.5 }, attentionBelow: 0.1 },
    aguas: { target: { min: 0.5, max: 0.8 }, attentionBelow: 0.3 },
  },
  // Engorda (>18m): terminação.
  engorda: {
    target: { min: 0.5, max: 0.9 },
    attentionBelow: 0.4,
  },
} as const;

export type GmdInterval = {
  /** Data (YYYY-MM-DD) da pesagem mais antiga do par. */
  from: string;
  /** Data (YYYY-MM-DD) da pesagem mais recente do par. */
  to: string;
  /** Ganho médio diário no intervalo, kg/dia (pode ser negativo). */
  gmd: number;
  /** Dias entre as duas pesagens. */
  days: number;
  /**
   * true quando a janela é curta (< GMD_MIN_RELIABLE_DAYS) e o GMD é dominado
   * por ruído. Também cobre o caso de GMD negativo em janela curta, tratado
   * como possível ruído (NÃO como erro / perda real de peso).
   */
  lowConfidence: boolean;
};

export type LifecyclePhase = "cria" | "recria" | "engorda" | "indefinida";

export type LifecycleFlag =
  | "risco_atraso"
  | "no_alvo"
  | "em_observacao"
  | "base_insuficiente";

export type LifecycleAssessment = {
  flag: LifecycleFlag;
  reason: string;
  phase: LifecyclePhase;
  avgGmd: number | null;
  latestGmd: number | null;
};

function parseUtcDate(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1);
}

function round3(n: number): number {
  return Number(n.toFixed(3));
}

function fmtGmd(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** Brasil Central: águas (chuvas) out–mar, seca abr–set. */
function seasonForMs(ms: number): "seca" | "aguas" {
  const month = new Date(ms).getUTCMonth() + 1; // 1–12
  return month >= 4 && month <= 9 ? "seca" : "aguas";
}

/** Estação predominante do intervalo, pelo ponto médio. */
function seasonForInterval(t: GmdInterval): "seca" | "aguas" {
  const mid = (parseUtcDate(t.from) + parseUtcDate(t.to)) / 2;
  return seasonForMs(mid);
}

/**
 * (1) Série de GMD por intervalo consecutivo de pesagens.
 * Ordena por data crescente, calcula GMD par a par e marca lowConfidence
 * para janelas curtas (< 21 dias). GMD negativo em janela curta é ruído, não
 * erro — fica marcado como lowConfidence e é excluído das leituras de risco.
 * Perda real de peso em janela longa (>= 21d) NÃO é descartada: é sinal.
 */
export function computeGmdTrajectory(
  weighings: { weight: number; date: string }[]
): GmdInterval[] {
  const clean = (weighings ?? [])
    .filter((w) => w && Number.isFinite(Number(w.weight)) && !!w.date)
    .map((w) => ({ weight: Number(w.weight), date: String(w.date).slice(0, 10) }))
    .sort((a, b) => parseUtcDate(a.date) - parseUtcDate(b.date));

  const out: GmdInterval[] = [];
  for (let i = 1; i < clean.length; i++) {
    const prev = clean[i - 1];
    const cur = clean[i];
    const days = Math.round((parseUtcDate(cur.date) - parseUtcDate(prev.date)) / DAY_MS);
    if (days <= 0) continue; // mesma data / fora de ordem — não dá pra medir
    const gmd = round3((cur.weight - prev.weight) / days);
    // Janela curta => baixa confiança (ruído de trato). Isso já abrange o caso
    // de GMD negativo em janela curta, tratado como ruído e não como erro.
    const lowConfidence = days < GMD_MIN_RELIABLE_DAYS;
    out.push({ from: prev.date, to: cur.date, gmd, days, lowConfidence });
  }
  return out;
}

/**
 * (2a) GMD médio da trajetória, ponderado por dias (= ganho total / dias
 * totais), excluindo intervalos lowConfidence quando possível. Se todos forem
 * lowConfidence, usa a série inteira para ainda devolver uma leitura.
 */
export function avgGmd(trajectory: GmdInterval[]): number | null {
  const reliable = trajectory.filter((t) => !t.lowConfidence);
  const use = reliable.length ? reliable : trajectory;
  if (!use.length) return null;
  const totalDays = use.reduce((s, t) => s + t.days, 0);
  if (totalDays <= 0) return null;
  const totalGain = use.reduce((s, t) => s + t.gmd * t.days, 0);
  return round3(totalGain / totalDays);
}

/**
 * (2b) GMD do intervalo mais recente, excluindo lowConfidence quando possível.
 */
export function latestGmd(trajectory: GmdInterval[]): number | null {
  if (!trajectory.length) return null;
  const reliable = trajectory.filter((t) => !t.lowConfidence);
  const src = reliable.length ? reliable : trajectory;
  return src[src.length - 1].gmd; // trajetória é cronológica: último = mais recente
}

/**
 * (5) Deriva a fase do ciclo pela conta contábil (fonte primária) com fallback
 * por idade. Contas de matriz/reprodutor (1.2.01.*) e sem conta caem no
 * fallback por idade.
 */
export function derivePhase(
  contaContabil: string | null | undefined,
  ageMonths: number | null | undefined
): LifecyclePhase {
  const conta = (contaContabil ?? "").trim();
  if (conta === "1.1.06.03") return "cria";
  if (conta === "1.1.06.02") return "recria";
  if (conta === "1.1.06.01") return "engorda";
  // Fallback por idade.
  if (ageMonths == null) return "indefinida";
  if (ageMonths < 8) return "cria";
  if (ageMonths < 18) return "recria";
  return "engorda";
}

export function phaseLabel(phase: LifecyclePhase): string {
  if (phase === "cria") return "cria (0–8m)";
  if (phase === "recria") return "recria (8–18m)";
  if (phase === "engorda") return "engorda (>18m)";
  return "fase não determinada";
}

/** Limiar de atenção da recria para o intervalo (sazonal). */
function recriaAttentionForInterval(t: GmdInterval): number {
  return PHASE_GMD_BANDS.recria[seasonForInterval(t)].attentionBelow;
}

/** Piso da faixa alvo da fase (recria usa a estação do intervalo mais recente). */
function phaseTargetMin(
  phase: LifecyclePhase,
  trajectory: GmdInterval[]
): number | null {
  if (phase === "cria") return PHASE_GMD_BANDS.cria.target.min;
  if (phase === "engorda") return PHASE_GMD_BANDS.engorda.target.min;
  if (phase === "recria") {
    const reliable = trajectory.filter((t) => !t.lowConfidence);
    const ref = reliable.length
      ? reliable[reliable.length - 1]
      : trajectory[trajectory.length - 1];
    return ref ? PHASE_GMD_BANDS.recria[seasonForInterval(ref)].target.min : null;
  }
  return null; // indefinida
}

/**
 * (4) Avalia risco de atraso no ciclo a partir da trajetória de GMD, idade e
 * conta contábil.
 *
 * O flag "risco_atraso" é ESPECÍFICO DA RECRIA (8–18m, foco 8–12m) e exige
 * trajetória sustentada de baixo ganho:
 *   - >= 2 intervalos CONFIÁVEIS (>= 21 dias) e CONSECUTIVOS
 *   - cada um abaixo do limiar de atenção sazonal da recria
 *   - somando >= 60 dias
 * Isso protege contra condenar o animal por uma seca ruim isolada (ganho
 * compensatório). Com < 2 intervalos confiáveis => "base_insuficiente".
 * Fora da recria (e sem trajetória de atraso) comparamos a média com a faixa
 * alvo: "no_alvo" ou "em_observacao" (acompanhar, sem gatilho de risco).
 */
export function assessLifecycleRisk(input: {
  trajectory: GmdInterval[];
  ageMonths: number | null | undefined;
  contaContabil: string | null | undefined;
}): LifecycleAssessment {
  const { trajectory, ageMonths, contaContabil } = input;
  const phase = derivePhase(contaContabil, ageMonths);
  const reliable = trajectory.filter((t) => !t.lowConfidence);
  const avg = avgGmd(trajectory);
  const latest = latestGmd(trajectory);

  // Sem 2 intervalos confiáveis não há trajetória para ler.
  if (reliable.length < 2) {
    return {
      flag: "base_insuficiente",
      phase,
      avgGmd: avg,
      latestGmd: latest,
      reason: `Apenas ${reliable.length} intervalo(s) confiável(is) entre pesagens (>= ${GMD_MIN_RELIABLE_DAYS} dias). Registre mais pesagens para leitura de trajetória.`,
    };
  }

  // risco_atraso: só na recria e só com atraso sustentado.
  if (phase === "recria") {
    let runLen = 0;
    let runDays = 0;
    let best = { len: 0, days: 0 };
    for (const t of trajectory) {
      const below = !t.lowConfidence && t.gmd < recriaAttentionForInterval(t);
      if (below) {
        runLen += 1;
        runDays += t.days;
        if (runLen > best.len || (runLen === best.len && runDays > best.days)) {
          best = { len: runLen, days: runDays };
        }
      } else {
        runLen = 0;
        runDays = 0;
      }
    }
    if (best.len >= 2 && best.days >= GMD_RISK_MIN_WINDOW_DAYS) {
      return {
        flag: "risco_atraso",
        phase,
        avgGmd: avg,
        latestGmd: latest,
        reason: `GMD abaixo da faixa de recria em ${best.len} pesagens consecutivas (${best.days} dias). Sinal de risco de atraso no ciclo — investigue a causa (verminose, suplementação mineral, qualidade do pasto, disputa de cocho) antes de qualquer decisão de manejo.`,
      };
    }
  }

  // Sem trajetória de atraso: compara média com a faixa alvo da fase.
  const targetMin = phaseTargetMin(phase, trajectory);
  if (targetMin != null && avg != null && avg >= targetMin) {
    return {
      flag: "no_alvo",
      phase,
      avgGmd: avg,
      latestGmd: latest,
      reason: `GMD médio de ${fmtGmd(avg)} kg/dia dentro ou acima da faixa de referência da fase (${phaseLabel(phase)}).`,
    };
  }
  return {
    flag: "em_observacao",
    phase,
    avgGmd: avg,
    latestGmd: latest,
    reason: `GMD médio de ${avg == null ? "—" : fmtGmd(avg)} kg/dia abaixo da faixa de referência da fase (${phaseLabel(phase)}), sem trajetória sustentada de atraso. Acompanhar próximas pesagens antes de qualquer decisão.`,
  };
}