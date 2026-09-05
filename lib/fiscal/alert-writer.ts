/**
 * Escrita de alertas fiscais no schema canônico (B0c).
 *
 * Causa-raiz do problema que este módulo resolve: as migrations 028 e 133
 * criam a MESMA tabela `fiscal_alerts` com shapes incompatíveis —
 *
 *   028 (PT):  note_id           | tipo       | descricao | severidade | resolvido
 *   133 (EN):  fiscal_invoice_id | alert_type | message   | severity   | resolved
 *
 * A 133 usa `CREATE TABLE IF NOT EXISTS`, então o resultado dependeu do estado
 * do banco na hora. A tabela viva é a versão EN (os índices da 133 são sobre
 * `resolved`/`severity`/`alert_type`), e o app continuou inserindo colunas PT —
 * daí a rejeição silenciosa e a criação da `fiscal_notes_alerts_legacy` fora do
 * controle de versão.
 *
 * Decisão (05/09/2026): o schema EN é o canônico. Este módulo faz o de-para.
 *
 * RESTRIÇÃO DE INTEGRIDADE: `fiscal_alerts.fiscal_invoice_id` tem FK para
 * `fiscal_invoices`. Um alerta canônico só pode ser gravado se a nota canônica
 * existir — em modo 'legacy' ela não existe, e tentar gravar dá violação de FK.
 * Por isso `writeCanonicalAlerts` exige confirmação de que a nota foi escrita.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// De-para
// ---------------------------------------------------------------------------

/** Severidade do schema legado (PT). */
export type LegacySeverity = "info" | "aviso" | "critico";
/** Severidade do schema canônico (EN) — CHECK da migration 133. */
export type CanonicalSeverity = "info" | "warning" | "critical";

/**
 * De-para versionado em `rules/alertas/severidade-mapa.yaml` (R-ALERTA-SEV-01).
 *
 * Mantido aqui como constante espelho, e não lido do YAML em runtime: esta
 * função roda no caminho quente do upload e não pode depender de I/O de disco.
 * Um teste garante que as duas fontes não divergem — se alguém editar o YAML e
 * esquecer o código, a suíte reprova.
 */
export const SEVERIDADE_MAPA: Record<string, CanonicalSeverity> = {
  critico: "critical", "crítico": "critical", critical: "critical", alto: "critical",
  aviso: "warning", warning: "warning", medio: "warning", "médio": "warning",
  info: "info", baixo: "info",
};

/**
 * Default para severidade não mapeada.
 *
 * Decisão 05/09/2026 (ajuste 1): `warning`, não `info`. Severidade desconhecida
 * é, por definição, algo que o de-para ainda não cobre — rebaixar para `info`
 * esconderia na interface. `warning` mantém visível sem alarmar como `critical`.
 */
export const SEVERIDADE_DEFAULT: CanonicalSeverity = "warning";

/**
 * Contador de severidades desconhecidas, para alimentar o de-para.
 *
 * Em memória e por processo — é telemetria de desenvolvimento, não métrica de
 * produto. Quando um valor aparece aqui, ele deve virar linha no YAML.
 */
const desconhecidas = new Map<string, number>();

/** Severidades não mapeadas vistas até agora, com contagem. */
export function severidadesDesconhecidas(): Record<string, number> {
  return Object.fromEntries(desconhecidas);
}

/** Zera o contador. Usado em teste. */
export function resetSeveridadesDesconhecidas(): void {
  desconhecidas.clear();
}

/**
 * Mapeia severidade legada → canônica.
 *
 * NUNCA devolve valor fora do CHECK da migration 133 — mandar "critico" cru é
 * o que derrubava o insert e fazia o alerta sumir (incidente B0c).
 */
export function mapSeverity(severidade: string | null | undefined): CanonicalSeverity {
  const chave = (severidade ?? "").trim().toLowerCase();
  const mapeada = SEVERIDADE_MAPA[chave];
  if (mapeada) return mapeada;

  const rotulo = chave || "(vazio)";
  desconhecidas.set(rotulo, (desconhecidas.get(rotulo) ?? 0) + 1);
  console.warn(
    `[alert-writer] severidade nao mapeada: "${rotulo}" -> ${SEVERIDADE_DEFAULT}. ` +
    "Acrescentar em rules/alertas/severidade-mapa.yaml (R-ALERTA-SEV-01).",
  );
  return SEVERIDADE_DEFAULT;
}

/**
 * Ação sugerida por tipo de alerta.
 *
 * `suggested_action` existe no schema EN e não tem equivalente no legado — é
 * ganho líquido da migração. Texto sempre no registro de "verificar com",
 * nunca de "você tem direito a": nada aqui é conclusão fiscal.
 */
const ACAO_SUGERIDA: Record<string, string> = {
  "nfe.ncm_incorreto":      "Conferir o NCM com o fornecedor — NCM errado invalida o enquadramento no Convênio ICMS 100/97. Confirmar com o contador.",
  "nfe.cfop_divergente":    "Conferir o CFOP com o contador — define se a operação é entrada ou saída e qual benefício se aplica.",
  "nfe.item_incompleto":    "Item sem descrição: revisar o XML na origem antes de usar a nota para apuração de custo.",
  "nfe.valor_divergente":   "Soma dos itens difere do total da nota. Conferir com o contador antes de lançar no livro-caixa.",
  "nfe.pdf_revisao_manual": "Extração incompleta do PDF. Conferir os campos e preencher manualmente, ou obter o XML com o fornecedor.",
  "nfe.ia_fiscal":          "Indício levantado por análise automática. Confirmar com o contador antes de qualquer ação.",
};

export function acaoSugerida(alertType: string): string | null {
  return ACAO_SUGERIDA[normalizarAlertType(alertType)] ?? null;
}

/**
 * De-para dos tipos herdados para a taxonomia namespaced
 * (`rules/alertas/taxonomia.yaml`, R-ALERTA-TAX-01).
 *
 * Os nomes antigos já foram emitidos em produção; renomear sem de-para quebraria
 * o histórico do cliente. Tipo desconhecido passa intacto — inventar um
 * namespace errado seria pior que deixar sem.
 */
export const TAXONOMIA_HERDADA: Record<string, string> = {
  ncm_incorreto:      "nfe.ncm_incorreto",
  cfop_divergente:    "nfe.cfop_divergente",
  item_incompleto:    "nfe.item_incompleto",
  valor_divergente:   "nfe.valor_divergente",
  pdf_revisao_manual: "nfe.pdf_revisao_manual",
  ia_fiscal:          "nfe.ia_fiscal",
};

export function normalizarAlertType(tipo: string): string {
  const t = (tipo ?? "").trim();
  return TAXONOMIA_HERDADA[t] ?? t;
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

/** Alerta no shape legado, como o app produz hoje. */
export type LegacyAlert = {
  note_id: string;
  client_id: string;
  tipo: string;
  descricao: string;
  severidade: string;
  /** Id da regra em rules/ que originou o alerta. Ver nota sobre a migration 161. */
  rule_id?: string | null;
  /** Data de verificação da fonte da regra. Ver nota sobre a migration 161. */
  verificado_em?: string | null;
};

/** Alerta no shape canônico da migration 133. */
export type CanonicalAlert = {
  client_id: string;
  fiscal_invoice_id: string;
  alert_type: string;
  message: string;
  severity: CanonicalSeverity;
  suggested_action: string | null;
  resolved: boolean;
};

/**
 * PENDENCIA DE SCHEMA (ajuste 3 do handoff de 05/09/2026).
 *
 * O schema EN da migration 133 NAO tem coluna para rule_id nem para a data de
 * verificacao da fonte, e nao tem campo jsonb de metadata onde acomoda-los.
 * Conforme instrucao, a coluna e PROPOSTA na migration 161 — nao criada por
 * fora. Ate ela ser aplicada, rule_id e verificado_em viajam no fim da
 * `message`, de forma legivel e sem inventar coluna.
 */
export const RULE_TAG_SEP = " · ";

/** Converte um alerta legado para o shape canônico. */
export function toCanonicalAlert(a: LegacyAlert): CanonicalAlert {
  const tipo = normalizarAlertType(a.tipo);
  const tags: string[] = [];
  if (a.rule_id) tags.push(a.rule_id);
  if (a.verificado_em) tags.push(`verificado em ${a.verificado_em}`);

  return {
    client_id:         a.client_id,
    fiscal_invoice_id: a.note_id, // mesma chave nas duas tabelas (ETL da 139)
    alert_type:        tipo,
    message:           tags.length > 0 ? `${a.descricao}${RULE_TAG_SEP}${tags.join(RULE_TAG_SEP)}` : a.descricao,
    severity:          mapSeverity(a.severidade),
    suggested_action:  acaoSugerida(tipo),
    resolved:          false,
  };
}

export type AlertWriteResult = { ok: boolean; written: number; error?: string };

/**
 * Grava alertas na tabela canônica.
 *
 * `invoiceExists` precisa ser true — sem a nota na canônica, a FK
 * `fiscal_invoice_id` derruba o insert. O chamador sabe disso porque acabou de
 * escrever (ou não) a nota.
 *
 * NUNCA lança: mesma disciplina do `invoice-writer`. Alerta é informação
 * secundária; perder um alerta é ruim, derrubar o upload por causa dele é pior.
 */
export async function writeCanonicalAlerts(
  db: SupabaseClient,
  alerts: LegacyAlert[],
  invoiceExists: boolean,
): Promise<AlertWriteResult> {
  if (alerts.length === 0) return { ok: true, written: 0 };
  if (!invoiceExists) {
    return {
      ok: false,
      written: 0,
      error: "nota ausente na canonica — FK fiscal_invoice_id impediria o insert",
    };
  }

  try {
    const rows = alerts.map(toCanonicalAlert);
    const { error } = await db.from("fiscal_alerts").insert(rows);
    return error
      ? { ok: false, written: 0, error: error.message }
      : { ok: true, written: rows.length };
  } catch (err) {
    return { ok: false, written: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
