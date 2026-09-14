/**
 * Autorização de rotas de cron.
 *
 * AUTH-01 (raio-x 14/09/2026): cinco rotas com service key aceitavam o header
 * `x-vercel-cron: 1` como autenticação. O header é forjável — a sonda em
 * produção com `curl -H 'x-vercel-cron: 1'` executou o refresh de mercado e
 * reescreveu a cotação. A Vercel envia `Authorization: Bearer <CRON_SECRET>`
 * nos crons quando a variável CRON_SECRET existe no projeto; é isso que vale.
 *
 * Fail-closed: sem CRON_SECRET (nem token extra), a rota fica fechada e o
 * motivo vai ao log — em vez de ficar aberta "porque é idempotente".
 */

type ReqMinimo = { headers: { get(nome: string): string | null } };

export function cronAutorizado(req: ReqMinimo, tokensExtras: Array<string | undefined> = []): boolean {
  const auth = (req.headers.get("authorization") ?? "").trim();
  const tokens = [process.env.CRON_SECRET, ...tokensExtras].filter((t): t is string => Boolean(t && t.length >= 16));
  if (tokens.length === 0) {
    console.error("[cron-auth] CRON_SECRET não configurado (mín. 16 caracteres) — rota de cron fechada até configurar na Vercel");
    return false;
  }
  return tokens.some(t => auth === `Bearer ${t}`);
}
