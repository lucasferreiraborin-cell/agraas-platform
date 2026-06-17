/**
 * Sprint B — Persona Banco — Portfólio.
 *
 * Dashboard de portfólio do banco/cooperativa. Lista produtores que
 * concederam acesso ao dossiê (granted_by_producer=true em
 * bank_producer_relationships). Score agregado, indicadores de risco.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import Link from "next/link";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { BANK_VIEW_ENABLED } from "@/lib/feature-flags";
import { scoreClassification } from "@/lib/personas";
import { requirePersona, BANCO_ROUTES } from "@/lib/persona-resolver";
import { ChevronRight, AlertTriangle, TrendingUp, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BancoPage() {
  if (!BANK_VIEW_ENABLED) redirect("/em-breve");

  const ctx = await requirePersona(BANCO_ROUTES);
  const clientData = { id: ctx.clientId, name: ctx.clientName, role: ctx.realRole };
  const db = createSupabaseServiceClient();

  const { data: relationships } = await db
    .from("bank_producer_relationships")
    .select("producer_client_id, status, relationship_type, granted_by_producer, granted_at")
    .eq("bank_client_id", clientData.id)
    .eq("status", "active");

  const producerIds = (relationships ?? [])
    .filter((r) => r.granted_by_producer)
    .map((r) => r.producer_client_id);

  const aguardandoCount = (relationships ?? []).filter((r) => !r.granted_by_producer).length;

  if (producerIds.length === 0) {
    return (
      <PersonaShell ctx={ctx}>
      <div className="max-w-7xl mx-auto px-8 py-10">
        <header className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
            Portfólio · Análise de crédito rural
          </div>
          <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
            Bem-vindo, {clientData.name}
          </h1>
        </header>
        <div className="ag-card p-12 text-center">
          <Building2 size={36} className="text-[--text-muted] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[--text-primary]">
            Nenhum produtor concedeu acesso ainda
          </h2>
          <p className="text-[--text-secondary] mt-2 max-w-md mx-auto">
            {aguardandoCount > 0
              ? `${aguardandoCount} relacionamento(s) pendentes — aguardando o produtor liberar o dossiê para análise.`
              : "Quando um produtor incluir esta instituição como parceira e liberar o dossiê, ele aparecerá aqui."}
          </p>
          <p className="text-[--text-muted] text-sm mt-6">
            Procedimento: o produtor acessa <code>/painel</code> e ativa o compartilhamento no card "Instituições parceiras".
          </p>
        </div>
        </div>
    </PersonaShell>
    );
  }

  // Buscar dados dos produtores com acesso liberado
  const { data: producers } = await db
    .from("clients")
    .select("id, name, email")
    .in("id", producerIds);

  const { data: producerScores } = await db
    .from("producer_scores")
    .select("*")
    .in("client_id", producerIds);

  const { data: farmScores } = await db
    .from("farm_scores")
    .select("client_id, score_total, animals_count_active")
    .in("client_id", producerIds);

  const producerMap = new Map((producers ?? []).map((p) => [p.id, p]));
  const psMap = new Map((producerScores ?? []).map((s) => [s.client_id, s]));

  const farmsByClient = new Map<string, { score_total: number; animals_count_active: number }[]>();
  for (const fs of farmScores ?? []) {
    if (!farmsByClient.has(fs.client_id)) farmsByClient.set(fs.client_id, []);
    farmsByClient.get(fs.client_id)!.push(fs);
  }

  const rows = producerIds.map((pid) => {
    const p = producerMap.get(pid);
    const ps = psMap.get(pid);
    const farms = farmsByClient.get(pid) ?? [];
    const totalAnimais = farms.reduce((acc, f) => acc + (f.animals_count_active ?? 0), 0);
    return {
      client_id: pid,
      name: p?.name ?? "Produtor",
      score_total: Number(ps?.score_total ?? 0),
      properties: farms.length,
      animals: totalAnimais,
    };
  });

  rows.sort((a, b) => b.score_total - a.score_total);

  const scoreAgregado = rows.length > 0
    ? rows.reduce((acc, r) => acc + r.score_total, 0) / rows.length
    : 0;
  const alertas = rows.filter((r) => r.score_total < 50).length;
  const altoPadrao = rows.filter((r) => r.score_total >= 80).length;

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-7xl mx-auto px-8 py-10">
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
          Portfólio · Análise de crédito rural
        </div>
        <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
          {rows.length} produtor{rows.length > 1 ? "es" : ""} sob análise
        </h1>
        <p className="text-[--text-secondary] mt-3 max-w-2xl">
          Score agregado de portfólio anchorado em Embrapa Doc 237 (Costa et al., 2018).
          Dossiês liberados pelos produtores via consentimento explícito.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Produtores ativos" value={rows.length.toString()} />
        <KpiCard
          label="Score médio do portfólio"
          value={scoreAgregado.toFixed(1)}
          tone={scoreAgregado >= 65 ? "good" : scoreAgregado >= 50 ? "neutral" : "warn"}
        />
        <KpiCard
          label="Em alerta (< 50)"
          value={alertas.toString()}
          tone={alertas > 0 ? "warn" : "good"}
          icon={alertas > 0 ? <AlertTriangle size={14} /> : undefined}
        />
        <KpiCard
          label="Alto padrão (≥ 80)"
          value={altoPadrao.toString()}
          tone="good"
          icon={<TrendingUp size={14} />}
        />
      </div>

      <section className="ag-card">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">
              Portfólio
            </div>
            <h2 className="text-lg font-semibold text-[--text-primary] mt-0.5">
              Produtores e scores agregados
            </h2>
          </div>
        </div>
        <table className="ag-table">
          <thead>
            <tr>
              <th>Produtor</th>
              <th className="text-right">Fazendas</th>
              <th className="text-right">Animais ativos</th>
              <th className="text-right">Score</th>
              <th>Classificação</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cls = scoreClassification(r.score_total);
              return (
                <tr key={r.client_id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-right">{r.properties}</td>
                  <td className="text-right">{r.animals.toLocaleString("pt-BR")}</td>
                  <td className="text-right font-semibold" style={{ color: cls.color }}>
                    {r.score_total.toFixed(0)}
                  </td>
                  <td>
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[11px] font-medium"
                      style={{
                        backgroundColor: `${cls.color}20`,
                        color: cls.color,
                      }}
                    >
                      {cls.label}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/banco/${r.client_id}`}
                      className="inline-flex items-center gap-1 text-[--primary] hover:underline text-sm"
                    >
                      Dossiê
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      </div>
    </PersonaShell>
  );
}

function KpiCard({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "neutral";
  icon?: React.ReactNode;
}) {
  const toneColor =
    tone === "good" ? "#16a34a" : tone === "warn" ? "#dc2626" : "var(--text-primary)";
  return (
    <div className="ag-card p-5">
      <div className="text-[11px] uppercase tracking-wider text-[--text-muted] flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold mt-2" style={{ color: toneColor }}>
        {value}
      </div>
    </div>
  );
}
