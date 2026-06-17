/**
 * /banco/produtores — catálogo de produtores acessíveis ao banco.
 *
 * Filtros e busca para o analista de crédito navegar no portfolio
 * de produtores. Score, faixa, UF, status do relacionamento.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import Link from "next/link";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { BANK_VIEW_ENABLED } from "@/lib/feature-flags";
import { requirePersona, BANCO_ROUTES } from "@/lib/persona-resolver";
import { scoreClassification } from "@/lib/personas";
import { Search, ChevronRight, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BancoProdutoresPage() {
  if (!BANK_VIEW_ENABLED) redirect("/em-breve");

  const ctx = await requirePersona(BANCO_ROUTES);
  const db = createSupabaseServiceClient();

  const { data: relationships } = await db
    .from("bank_producer_relationships")
    .select("producer_client_id, status, relationship_type, granted_by_producer, granted_at, created_at")
    .eq("bank_client_id", ctx.clientId)
    .order("created_at", { ascending: false });

  const allProducerIds = (relationships ?? []).map((r) => r.producer_client_id);

  const { data: producers } = allProducerIds.length
    ? await db.from("clients").select("id, name, email").in("id", allProducerIds)
    : { data: [] };
  const producerMap = new Map((producers ?? []).map((p) => [p.id, p]));

  const { data: producerScores } = allProducerIds.length
    ? await db.from("producer_scores").select("client_id, score_total").in("client_id", allProducerIds)
    : { data: [] };
  const psMap = new Map((producerScores ?? []).map((s) => [s.client_id, Number(s.score_total)]));

  const rows = (relationships ?? []).map((r) => {
    const p = producerMap.get(r.producer_client_id);
    return {
      relationshipId: r.producer_client_id,
      clientId: r.producer_client_id,
      name: p?.name ?? "Produtor",
      score: psMap.get(r.producer_client_id) ?? 0,
      relationshipType: r.relationship_type,
      granted: r.granted_by_producer,
      grantedAt: r.granted_at,
    };
  });

  const liberados = rows.filter((r) => r.granted).length;
  const pendentes = rows.filter((r) => !r.granted).length;

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-7xl mx-auto px-8 py-10">
        <header className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
            Produtores · Catálogo
          </div>
          <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
            Produtores no relacionamento
          </h1>
          <p className="text-[--text-secondary] mt-3 max-w-2xl">
            {rows.length} produtor{rows.length !== 1 ? "es" : ""} · {liberados} com dossiê
            liberado · {pendentes} pendente{pendentes !== 1 ? "s" : ""} de consentimento
          </p>
        </header>

        <div className="mb-6 flex items-center gap-3">
          <div className="ag-card px-4 py-2 flex items-center gap-2 flex-1 max-w-md">
            <Search size={14} className="text-[--text-muted]" />
            <input
              placeholder="Buscar por nome (futuro)"
              disabled
              className="bg-transparent outline-none text-sm flex-1 text-[--text-secondary] placeholder-[--text-muted]"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="ag-card p-12 text-center">
            <Building2 size={36} className="text-[--text-muted] mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-[--text-primary]">Nenhum relacionamento ainda</h2>
            <p className="text-[--text-secondary] mt-2 max-w-sm mx-auto">
              Quando a Agraas cadastrar produtores associados ao seu portfólio, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <section className="ag-card">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Produtor</th>
                  <th>Relacionamento</th>
                  <th>Status</th>
                  <th className="text-right">Score</th>
                  <th>Classificação</th>
                  <th className="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cls = scoreClassification(r.score);
                  return (
                    <tr key={r.clientId}>
                      <td className="font-medium">{r.name}</td>
                      <td className="text-[--text-secondary] text-sm">
                        {relationshipLabel(r.relationshipType)}
                      </td>
                      <td>
                        {r.granted ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-green-500/15 text-green-300 border border-green-500/30">
                            Liberado
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Aguardando consentimento
                          </span>
                        )}
                      </td>
                      <td className="text-right font-semibold" style={{ color: r.granted ? cls.color : "var(--text-muted)" }}>
                        {r.granted ? r.score.toFixed(0) : "—"}
                      </td>
                      <td>
                        {r.granted ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{ backgroundColor: `${cls.color}20`, color: cls.color }}
                          >
                            {cls.label}
                          </span>
                        ) : (
                          <span className="text-[--text-muted] text-xs">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        {r.granted ? (
                          <Link href={`/banco/${r.clientId}`} className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--persona-accent)" }}>
                            Dossiê
                            <ChevronRight size={14} />
                          </Link>
                        ) : (
                          <span className="text-[--text-muted] text-xs">acesso bloqueado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </PersonaShell>
  );
}

function relationshipLabel(type: string): string {
  switch (type) {
    case "credit_analysis": return "Análise de crédito";
    case "portfolio_monitoring": return "Monitoramento de portfólio";
    case "loan_active": return "Crédito ativo";
    default: return type;
  }
}
