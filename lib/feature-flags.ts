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
