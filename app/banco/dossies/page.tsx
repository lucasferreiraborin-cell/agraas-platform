/**
 * /banco/dossies — Dossiês exportáveis do portfólio.
 *
 * Lista os produtores com dossiê liberado e um atalho direto para exportar
 * o PDF de cada um (via /api/export/dossie-banco-pdf). Não há tabela de
 * histórico de exportação persistida — a exportação é gerada sob demanda.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { redirect } from "next/navigation";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { BANK_VIEW_ENABLED } from "@/lib/feature-flags";
import { requirePersona, BANCO_ROUTES } from "@/lib/persona-resolver";
import { scoreClassification } from "@/lib/personas";
import { Download, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BancoDossiesPage() {
  if (!BANK_VIEW_ENABLED) redirect("/em-breve");

  const ctx = await requirePersona(BANCO_ROUTES);
  const db = createSupabaseServiceClient();

  const { data: relationships } = await db
    .from("bank_producer_relationships")
    .select("producer_client_id, granted_by_producer, granted_at")
    .eq("bank_client_id", ctx.clientId)
    .eq("status", "active")
    .eq("granted_by_producer", true);

  const producerIds = (relationships ?? []).map((r) => r.producer_client_id);

  const { data: producers } = producerIds.length
    ? await db.from("clients").select("id, name").in("id", producerIds)
    : { data: [] };
  const producerMap = new Map((producers ?? []).map((p) => [p.id, p.name]));

  const { data: producerScores } = producerIds.length
    ? await db.from("producer_scores").select("client_id, score_total").in("client_id", producerIds)
    : { data: [] };
  const psMap = new Map((producerScores ?? []).map((s) => [s.client_id, Number(s.score_total)]));

  const rows = (relationships ?? []).map((r) => ({
    clientId: r.producer_client_id,
    name: producerMap.get(r.producer_client_id) ?? "Produtor",
    score: psMap.get(r.producer_client_id) ?? 0,
    grantedAt: r.granted_at,
  }));

  rows.sort((a, b) => b.score - a.score);

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-7xl mx-auto px-8 py-10">
        <header className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
            Dossiês · Exportação
          </div>
          <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
            Dossiês exportados
          </h1>
          <p className="text-[--text-secondary] mt-3 max-w-2xl">
            Gere o PDF de análise de crédito para qualquer produtor com dossiê liberado.
            O documento é montado no momento da exportação, com o score e a saúde financeira
            mais recentes.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="ag-card p-12 text-center">
            <FileText size={36} className="text-[--text-muted] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[--text-primary]">
              Nenhum dossiê disponível para exportação
            </h2>
            <p className="text-[--text-secondary] mt-2 max-w-md mx-auto">
              Quando um produtor liberar o acesso ao dossiê, ele aparecerá aqui com um atalho
              direto para exportação em PDF.
            </p>
          </div>
        ) : (
          <section className="ag-card">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Produtor</th>
                  <th>Liberado em</th>
                  <th className="text-right">Score</th>
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
                        {r.grantedAt
                          ? new Date(r.grantedAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="text-right font-semibold" style={{ color: cls.color }}>
                        {r.score > 0 ? r.score.toFixed(0) : "—"}
                      </td>
                      <td className="text-right">
                        <a
                          href={`/api/export/dossie-banco-pdf?clientId=${r.clientId}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-sm hover:underline"
                          style={{ color: "var(--persona-accent)" }}
                        >
                          <Download size={14} />
                          Exportar PDF
                        </a>
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
