/**
 * Datas no fuso do Brasil, sem `new Date("YYYY-MM-DD")`.
 *
 * `new Date("2026-03-01")` é meia-noite UTC; no navegador em BRT vira
 * 28/02 21h — e `.toLocaleDateString()` imprime 28/02/2026. O raio-x de
 * 14/09/2026 (F10, DT-05) contou 72 pontos com esse padrão. Aqui ficam as
 * duas funções que substituem o padrão: formatar uma data ISO como texto
 * e obter "hoje" no fuso de São Paulo.
 */

/** "2026-03-01" (ou "2026-03-01T10:00:00Z") → "01/03/2026". Vazio → "—". */
export function formatarDataIso(iso: string | null | undefined, vazio = "—"): string {
  if (!iso) return vazio;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return vazio;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Partes numéricas de uma data ISO, sem fuso. null se não for ISO. */
export function partesDataIso(iso: string | null | undefined): { ano: number; mes: number; dia: number } | null {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** Hoje em São Paulo como "YYYY-MM-DD" — igual em servidor UTC e no navegador. */
export function hojeBR(agora: Date = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
