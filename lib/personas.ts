/**
 * Tipos compartilhados entre as 3 personas da Agraas.
 *
 * Decisão arquitetural Lucas (17/06/2026): mesma base de dados, 3 vistas
 * distintas — Produtor (operação), Frigorífico (qualidade + EUDR + GTA),
 * Banco (score de fazenda + producer score como segundo compliance).
 *
 * Mascaramento: visão de banco e frigorífico recebem ear tags abreviados,
 * sem CPF, sem CNPJ exposto a granel. Compliance é agregada — quem precisa
 * do dado bruto solicita formalmente via fluxo do produtor.
 */

export type Persona = "produtor" | "frigorifico" | "banco";

/** Snapshot agregado de fazenda para visão Banco — vem de farm_scores v3 */
export type FarmScoreSnapshot = {
  property_id: string;
  property_name: string;
  city?: string | null;
  state?: string | null;
  score_total: number;
  score_rebanho: number;
  score_produtividade?: number | null;
  score_reprodutivo?: number | null;
  score_sanitario?: number | null;
  score_compliance?: number | null;
  animals_count_active: number;
  algorithm_version: "v3";
  updated_at: string;
};

/** Snapshot de produtor (agregação de fazendas) — para visão Banco/Crédito */
export type ProducerScoreSnapshot = {
  client_id: string;
  client_name: string;
  score_total: number;
  score_ativos: number;
  score_relacionamento?: number | null;
  score_financeiro?: number | null;
  score_institucional?: number | null;
  properties_count_active: number;
  algorithm_version: "v3";
  updated_at: string;
};

/** Card de lote ofertado para visão Frigorífico */
export type LoteOfertadoCard = {
  lot_id: string;
  lot_name: string;
  pais_destino: string | null;
  porto_embarque: string | null;
  data_embarque: string | null;
  status: string;
  animals_count: number;
  score_medio_lote: number;
  /** Animais do lote com GTA vigente (cert contendo "GTA") */
  gta_count?: number;
  /** Animais do lote com NF-e emitida (sales.fiscal_invoice_id preenchido) */
  nfe_emitida?: number;
  compliance: {
    eudr_ready: boolean;        // CAR + origem rastreada
    gta_vigente: boolean;       // GTA não expirado
    sif_disponivel: boolean;
    halal_disponivel: boolean;
    sanitario_ok: boolean;      // sem carência ativa
  };
  origem: {
    propriedade_nome: string;
    municipio: string | null;
    uf: string | null;
  };
};

/** Mascaramento de identificador animal — exibe primeiros 4 chars + asteriscos */
export function maskEarTag(internalCode: string): string {
  if (!internalCode || internalCode.length <= 4) return internalCode;
  const prefix = internalCode.slice(0, 4);
  const suffix = "*".repeat(internalCode.length - 4);
  return `${prefix}${suffix}`;
}

/** Mascaramento de CPF/CNPJ — exibe primeiros 3 dígitos + asteriscos + últimos 2 */
export function maskDocument(doc: string | null | undefined): string {
  if (!doc) return "—";
  const digits = doc.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
}

/** Classificação faixa de score v3 (alinhada com Embrapa Doc 237) */
export function scoreClassification(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 80) {
    return {
      label: "Excelente",
      color: "#16a34a",
      description: "Operação de alto padrão · alta confiabilidade pra crédito",
    };
  }
  if (score >= 65) {
    return {
      label: "Bom",
      color: "#65a30d",
      description: "Operação consistente · perfil de risco padrão",
    };
  }
  if (score >= 50) {
    return {
      label: "Regular",
      color: "#ca8a04",
      description: "Operação em desenvolvimento · análise complementar",
    };
  }
  if (score >= 35) {
    return {
      label: "Atenção",
      color: "#ea580c",
      description: "Gaps relevantes · recomenda mentoria antes de crédito",
    };
  }
  return {
    label: "Crítico",
    color: "#dc2626",
    description: "Operação imatura ou em risco · não recomendado",
  };
}
