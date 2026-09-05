/**
 * Feature Flags da Agraas.
 *
 * Filosofia: cada flag esconde funcionalidade INTEIRAMENTE quando false
 * (filtros, badges, queries, links). Reativar é só setar env var e
 * reverter o flip — código fica preservado, sem dead code.
 *
 * Usar em Server Components diretamente; em Client Components, prefixar
 * com NEXT_PUBLIC_ e ler via process.env (sem hooks — flags são estáticas
 * por deploy).
 */

/**
 * T1.1 (17/06/2026) — Halal desabilitado por default.
 *
 * Motivo: pitch deck institucional atual (jun/2026) NÃO menciona Halal.
 * Foco declarado: EUDR + PNIB + Score Embrapa. Halal aparecendo em
 * filtros/badges gera incoerência com a narrativa.
 *
 * Reativar quando: tese explicitamente incluir mercados MENA/Halal real
 * (não FSJBE) e Lucas autorizar volta ao roadmap público.
 */
export function isHalalEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HALAL_ENABLED === "true";
}

/**
 * Helper para uso em filtros de listing/query.
 * Se Halal desabilitado, filtros que selecionam apenas halal não devem
 * sequer aparecer na UI.
 */
export const HALAL_ENABLED = isHalalEnabled();

/**
 * Sprint B (17/06/2026) — Persona Frigorífico/Comprador.
 *
 * Reabilitada pra suportar conversas com JBS (Mourão Filho / CFO Alexandre).
 * Quando false: links na sidebar, links na landing, e rota /comprador
 * redirecionam para /em-breve. Quando true (default agora): tudo ativo.
 */
export function isBuyerViewEnabled(): boolean {
  // default TRUE — desligar explicitamente via NEXT_PUBLIC_BUYER_VIEW_ENABLED="false"
  return process.env.NEXT_PUBLIC_BUYER_VIEW_ENABLED !== "false";
}
export const BUYER_VIEW_ENABLED = isBuyerViewEnabled();

/**
 * Sprint B (17/06/2026) — Persona Banco / Instituição Financeira.
 *
 * Nova frente: Bradesco, Sicredi, BB. Dossiê de fazenda baseado em
 * farm_scores + producer_scores v3 como "segundo compliance" pra
 * análise de crédito rural. Mascara dados sensíveis (ear tags, CPFs).
 *
 * Quando false: rota /banco redireciona pra /em-breve.
 */
export function isBankViewEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BANK_VIEW_ENABLED !== "false";
}
export const BANK_VIEW_ENABLED = isBankViewEnabled();

/**
 * B0b (05/09/2026) — destino de escrita do módulo fiscal.
 *
 * Contexto: a migration 139 declarou `fiscal_invoices` canônica e `fiscal_notes`
 * deprecada, mas o ETL foi one-shot e NENHUM código passou a escrever na
 * canônica. Resultado: a tabela canônica está congelada desde 24/06/2026 e toda
 * nota nova vive só na deprecada.
 *
 * Modos:
 *   'legacy'    — só fiscal_notes/fiscal_note_items (comportamento pré-B0b)
 *   'dual'      — escreve nas duas (default durante a transição)
 *   'canonical' — só fiscal_invoices/fiscal_invoice_items (estado final)
 *
 * INVARIANTE DE SEGURANÇA: em 'dual', uma falha na escrita canônica é
 * registrada em log e NUNCA propaga. O upload de nota é o fluxo que o piloto
 * usa — ele não pode quebrar por causa da migração de schema. Só em 'canonical'
 * a falha propaga, porque aí não existe outro destino.
 *
 * Desligar para 'legacy' reverte a transição sem deploy.
 */
export type FiscalWriteMode = "legacy" | "dual" | "canonical";

export function getFiscalWriteMode(): FiscalWriteMode {
  const raw = (process.env.FISCAL_WRITE_MODE ?? "dual").trim().toLowerCase();
  return raw === "legacy" || raw === "canonical" ? raw : "dual";
}
export const FISCAL_WRITE_MODE = getFiscalWriteMode();

/** Escreve na tabela deprecada? Verdadeiro em 'legacy' e 'dual'. */
export const FISCAL_WRITES_LEGACY = FISCAL_WRITE_MODE !== "canonical";
/** Escreve na tabela canônica? Verdadeiro em 'dual' e 'canonical'. */
export const FISCAL_WRITES_CANONICAL = FISCAL_WRITE_MODE !== "legacy";
