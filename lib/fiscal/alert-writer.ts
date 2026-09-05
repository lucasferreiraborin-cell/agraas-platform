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
 * Mapeia severidade legada → canônica.
 *
 * O CHECK da 133 só aceita info/warning/critical. Qualquer valor fora disso
 * derrubaria o insert, então o default é `info` — o menos alarmante. Um alerta
 * classificado a menos é preferível a um insert rejeitado que some com o alerta.
 */
export function mapSeverity(severidade: string | null | undefined): CanonicalSeverity {
  switch ((severidade ?? "").trim().toLowerCase()) {
    case "critico":
    case "crítico":
    case "critical": return "critical";
    case "aviso":
    case "warning":  return "warning";
    default:         return "info";
  }
}

/**
 * Ação sugerida por tipo de alerta.
 *
 * `suggested_action` existe no schema EN e não tem equivalente no legado — é
 * ganho líquido da migração. Texto sempre no registro de "verificar com",
 * nunca de "você tem direito a": nada aqui é conclusão fiscal.
 */
const ACAO_SUGERIDA: Record<string, string> = {
  ncm_incorreto:      "Conferir o NCM com o fornecedor — NCM errado invalida o enquadramento no Convênio ICMS 100/97.",
  cfop_divergente:    "Conferir o CFOP com o contador — define se a operação é entrada ou saída e qual benefício se aplica.",
  item_incompleto:    "Item sem descrição: revisar o XML na origem antes de usar a nota para apuração de custo.",
  valor_divergente:   "Soma dos itens difere do total da nota. Conferir antes de lançar no livro-caixa.",
  pdf_revisao_manual: "Extração incompleta do PDF. Preencher os campos manualmente ou obter o XML com o fornecedor.",
  ia_fiscal:          "Indício levantado por análise automática. Confirmar com o contador antes de qualquer ação.",
};

export function acaoSugerida(alertType: string): string | null {
  return ACAO_SUGERIDA[alertType] ?? null;
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

/** Converte um alerta legado para o shape canônico. */
export function toCanonicalAlert(a: LegacyAlert): CanonicalAlert {
  return {
    client_id:         a.client_id,
    fiscal_invoice_id: a.note_id, // mesma chave nas duas tabelas (ETL da 139)
    alert_type:        a.tipo,
    message:           a.descricao,
    severity:          mapSeverity(a.severidade),
    suggested_action:  acaoSugerida(a.tipo),
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
