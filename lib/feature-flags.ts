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
