/**
 * /admin/saude — Dashboard operacional Agraas.
 *
 * Lucas (e qualquer admin) vê de uma página só:
 * - Status do último run de cada cron (cotacao, market_refresh, generate_insights, digest_daily)
 * - Últimos sinais de mercado coletados
 * - Insights gerados hoje por persona
 * - Cotação @ atual + idade
 * - Alertas internos (sinais não coletados há > 12h)
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { requirePersona, ADMIN_ONLY } from "@/lib/persona-resolver";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { getCotacaoArroba, formatCotacaoAge } from "@/lib/cotacao";
import { CheckCircle, AlertTriangle, XCircle, Activity, RefreshCw, Brain, TrendingUp } from "lucide-react";
import RefreshButton from "@/app/admin/saude/RefreshButton";

export const dynamic = "force-dynamic";

const JOBS = [
  { name: "self_heal", label: "Auto-cura horária", schedule: "a cada 1h", icon: RefreshCw },
  { name: "market_refresh", label: "Coleta de mercado", schedule: "cada 6h", icon: TrendingUp },
  { name: "generate_insights", label: "Geração de insights IA", schedule: "10h UTC diário", icon: Brain },
  { name: "daily_briefing", label: "Briefing diário 2.0", schedule: "10:57 UTC seg-sex", icon: Activity },
];

const REQUIRED_VARS = [
  { key: "ANTHROPIC_API_KEY",         purpose: "IA Claude para insights por persona",       required: true,  cron_only: false },
  { key: "RESEND_API_KEY",            purpose: "E-mails (digest sócios, alertas)",          required: true,  cron_only: false },
  { key: "NEXT_PUBLIC_SUPABASE_URL",  purpose: "Conexão Supabase",                          required: true,  cron_only: false },
  { key: "SUPABASE_SERVICE_ROLE_KEY", purpose: "Acesso server-side ao banco",               required: true,  cron_only: false },
  { key: "STRIPE_SECRET_KEY",         purpose: "Pagamentos planos",                         required: false, cron_only: false },
  { key: "CRON_SECRET",               purpose: "Disparo manual de crons (opcional)",        required: false, cron_only: true  },
  { key: "DIGEST_TRIGGER_TOKEN",      purpose: "Disparo manual digest sócios (opcional)",   required: false, cron_only: true  },
];

export default async function AdminSaudePage() {
  const ctx = await requirePersona(ADMIN_ONLY);
  const db = createSupabaseServiceClient();
  const cotacao = await getCotacaoArroba();

  // Últimos runs por job (mais que 4 pra cobrir todos os jobs)
  const { data: lastRuns } = await db
    .from("platform_jobs_log")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(40);

  const lastByJob = new Map<string, { status: string; ran_at: string; details: Record<string, unknown> }>();
  for (const r of lastRuns ?? []) {
    if (!lastByJob.has(r.job_name)) lastByJob.set(r.job_name, r);
  }

  // Auto-cura: detalhes do último self_heal
  const lastSelfHeal = lastByJob.get("self_heal");
  const selfHealActions = (lastSelfHeal?.details as { actions?: Array<{ step: string; status: string; detail?: string }> })?.actions ?? [];

  // Configuração (env vars) — server-side direto
  const envStatus = REQUIRED_VARS.map((v) => ({
    ...v,
    configured: Boolean(process.env[v.key]),
  }));
  const missingRequired = envStatus.filter((s) => s.required && !s.configured).length;

  // Últimos sinais de mercado
  const { data: signals } = await db
    .from("market_signals")
    .select("source, kind, title, summary, raw_value, raw_unit, priority, published_at, collected_at")
    .order("collected_at", { ascending: false })
    .limit(15);

  // Insights de hoje
  const today = new Date().toISOString().split("T")[0];
  const { data: insightsToday } = await db
    .from("daily_insights")
    .select("persona, client_id, bullets, generated_at")
    .eq("insight_date", today)
    .order("generated_at", { ascending: false });

  // Contagem por persona
  const insightsByPersona = new Map<string, number>();
  for (const i of insightsToday ?? []) {
    insightsByPersona.set(i.persona, (insightsByPersona.get(i.persona) ?? 0) + 1);
  }

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-7xl mx-auto px-8 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
              Admin · Saúde operacional
            </div>
            <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
              Plataforma Agraas
            </h1>
            <p className="text-[--text-secondary] mt-3 max-w-2xl">
              Estado real-time dos jobs, fontes de mercado e geração de insights.
            </p>
          </div>
          <RefreshButton />
        </header>

        {/* Cotação destaque */}
        <section className={`ag-card-strong p-5 mb-6 ${cotacao.isStale ? "border-amber-500/40" : ""}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">
                Cotação @ Boi gordo (CEPEA/B3)
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold text-[--text-primary]">
                  R$ {cotacao.value.toFixed(2)}
                </span>
                <span className="text-sm text-[--text-secondary]">
                  atualizada {formatCotacaoAge(cotacao.updatedAt)}
                </span>
              </div>
            </div>
            <div>
              {cotacao.isFallback ? (
                <Badge tone="danger" label="Usando FALLBACK · banco vazio" />
              ) : cotacao.isStale ? (
                <Badge tone="warning" label="STALE · cron ou fonte fora" />
              ) : (
                <Badge tone="ok" label="Atualizada" />
              )}
            </div>
          </div>
        </section>

        {/* Jobs */}
        <section className="ag-card mb-6">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-lg font-semibold text-[--text-primary]">Crons</h2>
            <p className="text-xs text-[--text-muted] mt-0.5">Última execução de cada job agendado</p>
          </div>
          <table className="ag-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Agendamento</th>
                <th>Última execução</th>
                <th>Status</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {JOBS.map((j) => {
                const Icon = j.icon;
                const last = lastByJob.get(j.name);
                return (
                  <tr key={j.name}>
                    <td className="font-medium flex items-center gap-2">
                      <Icon size={14} className="text-[--text-secondary]" />
                      {j.label}
                    </td>
                    <td className="text-[--text-secondary] text-sm font-mono">{j.schedule}</td>
                    <td className="text-sm">
                      {last
                        ? new Date(last.ran_at).toLocaleString("pt-BR")
                        : <span className="text-[--text-muted] italic">nunca</span>}
                    </td>
                    <td>
                      {!last ? (
                        <Badge tone="warning" label="Não rodou" />
                      ) : last.status === "ok" ? (
                        <Badge tone="ok" label="OK" />
                      ) : last.status === "partial" ? (
                        <Badge tone="warning" label="Parcial" />
                      ) : (
                        <Badge tone="danger" label="Falhou" />
                      )}
                    </td>
                    <td className="text-xs text-[--text-muted] max-w-xs truncate">
                      {last?.details ? JSON.stringify(last.details).slice(0, 80) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Configuração da plataforma · env vars */}
        <section className="ag-card mb-6">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Configuração da plataforma</h2>
              <p className="text-xs text-[--text-muted] mt-0.5">
                Variáveis de ambiente que mantêm crons e IA funcionando
              </p>
            </div>
            {missingRequired === 0 ? (
              <Badge tone="ok" label="Tudo configurado" />
            ) : (
              <Badge tone="warning" label={`${missingRequired} obrigatória(s) faltando`} />
            )}
          </div>
          <table className="ag-table">
            <thead>
              <tr>
                <th>Variável</th>
                <th>Propósito</th>
                <th>Tipo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {envStatus.map((v) => (
                <tr key={v.key}>
                  <td className="font-mono text-xs">{v.key}</td>
                  <td className="text-[--text-secondary] text-sm">{v.purpose}</td>
                  <td className="text-xs">
                    {v.required ? (
                      <span className="text-red-300">Obrigatória</span>
                    ) : (
                      <span className="text-[--text-muted]">Opcional</span>
                    )}
                  </td>
                  <td>
                    {v.configured ? (
                      <Badge tone="ok" label="Configurada" />
                    ) : v.required ? (
                      <Badge tone="danger" label="Faltando" />
                    ) : (
                      <Badge tone="warning" label="Ausente" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Última auto-cura */}
        {lastSelfHeal && (
          <section className="ag-card mb-6">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary]">Última auto-cura</h2>
                <p className="text-xs text-[--text-muted] mt-0.5">
                  {new Date(lastSelfHeal.ran_at).toLocaleString("pt-BR")}
                </p>
              </div>
              {lastSelfHeal.status === "ok" ? (
                <Badge tone="ok" label="Tudo OK" />
              ) : lastSelfHeal.status === "partial" ? (
                <Badge tone="warning" label="Parcial" />
              ) : (
                <Badge tone="danger" label="Falhou" />
              )}
            </div>
            <div className="p-6 space-y-2">
              {selfHealActions.length === 0 ? (
                <p className="text-sm text-[--text-secondary]">Sem detalhes</p>
              ) : (
                selfHealActions.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {a.status === "ok" ? (
                      <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                    ) : a.status === "skipped" ? (
                      <CheckCircle size={14} className="text-[--text-muted] mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[--text-primary]">{a.step}</div>
                      {a.detail && <div className="text-xs text-[--text-muted]">{a.detail}</div>}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[--text-muted]">{a.status}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Insights por persona */}
        <section className="ag-card mb-6">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-lg font-semibold text-[--text-primary]">Insights gerados hoje</h2>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4">
            {["produtor", "frigorifico", "banco"].map((p) => (
              <div key={p} className="ag-card p-4">
                <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">{p}</div>
                <div className="text-2xl font-bold text-[--text-primary] mt-1">
                  {insightsByPersona.get(p) ?? 0}
                </div>
                <div className="text-xs text-[--text-secondary] mt-1">clientes com insight</div>
              </div>
            ))}
          </div>
        </section>

        {/* Sinais de mercado */}
        <section className="ag-card">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[--text-primary]">Sinais de mercado · últimos 15</h2>
              <p className="text-xs text-[--text-muted] mt-0.5">CEPEA + Embrapa + MAPA + Notícias Agrícolas</p>
            </div>
          </div>
          {!signals || signals.length === 0 ? (
            <div className="p-8 text-center text-[--text-secondary]">
              Nenhum sinal coletado ainda. Clique em <strong>Atualizar mercado agora</strong> acima.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Fonte</th>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th className="text-right">Valor</th>
                  <th>Prio</th>
                  <th>Coletado</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s, i) => (
                  <tr key={i}>
                    <td className="text-sm font-mono">{s.source}</td>
                    <td className="text-[--text-secondary] text-sm">{s.kind}</td>
                    <td className="font-medium max-w-md truncate">{s.title}</td>
                    <td className="text-right text-sm">
                      {s.raw_value != null ? `${Number(s.raw_value).toFixed(2)} ${s.raw_unit ?? ""}` : "—"}
                    </td>
                    <td className="text-center text-sm">{s.priority}</td>
                    <td className="text-xs text-[--text-muted]">
                      {new Date(s.collected_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </PersonaShell>
  );
}

function Badge({ tone, label }: { tone: "ok" | "warning" | "danger"; label: string }) {
  const cls = tone === "ok"
    ? "bg-green-500/15 border-green-500/40 text-green-300"
    : tone === "warning"
    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
    : "bg-red-500/15 border-red-500/40 text-red-300";
  const Icon = tone === "ok" ? CheckCircle : tone === "warning" ? AlertTriangle : XCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cls}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
