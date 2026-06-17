/**
 * /comprador/produtores — catálogo de produtores acessíveis ao frigorífico.
 *
 * Lista os produtores que o frigorífico já tem conexão via lot_buyer_access.
 * Score médio do rebanho, propriedades, animais ativos. Drill-down futuro.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { requirePersona, FRIGORIFICO_ROUTES } from "@/lib/persona-resolver";
import { scoreClassification } from "@/lib/personas";
import { Search, Building2, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FrigorificoProdutoresPage() {
  const ctx = await requirePersona(FRIGORIFICO_ROUTES);
  const db = createSupabaseServiceClient();

  // Quais produtores o frigorífico tem acesso (via lot_buyer_access)
  const { data: access } = await db
    .from("lot_buyer_access")
    .select("lot_id, lots:lot_id(client_id)")
    .eq("buyer_client_id", ctx.clientId);

  const producerIds = [...new Set(
    (access ?? [])
      .map((a: { lots: { client_id: string } | { client_id: string }[] | null }) => {
        const l = Array.isArray(a.lots) ? a.lots[0] : a.lots;
        return l?.client_id;
      })
      .filter(Boolean) as string[],
  )];

  const { data: producers } = producerIds.length
    ? await db.from("clients").select("id, name, email").in("id", producerIds)
    : { data: [] };

  const { data: producerScores } = producerIds.length
    ? await db.from("producer_scores").select("client_id, score_total").in("client_id", producerIds)
    : { data: [] };
  const psMap = new Map((producerScores ?? []).map((s) => [s.client_id, Number(s.score_total)]));

  const { data: properties } = producerIds.length
    ? await db.from("properties").select("client_id, id, state").in("client_id", producerIds)
    : { data: [] };
  const propsByClient = new Map<string, { state: string | null }[]>();
  for (const p of properties ?? []) {
    if (!propsByClient.has(p.client_id)) propsByClient.set(p.client_id, []);
    propsByClient.get(p.client_id)!.push({ state: p.state });
  }

  const { data: animals } = producerIds.length
    ? await db.from("animals").select("client_id", { count: "exact" }).eq("status", "Ativo").in("client_id", producerIds)
    : { data: [] };
  const animalsByClient = new Map<string, number>();
  for (const a of animals ?? []) {
    animalsByClient.set(a.client_id, (animalsByClient.get(a.client_id) ?? 0) + 1);
  }

  const rows = (producers ?? []).map((p) => {
    const props = propsByClient.get(p.id) ?? [];
    const ufs = [...new Set(props.map((pp) => pp.state).filter(Boolean))];
    return {
      id: p.id,
      name: p.name,
      ufs,
      properties: props.length,
      animals: animalsByClient.get(p.id) ?? 0,
      score: psMap.get(p.id) ?? 0,
    };
  });

  rows.sort((a, b) => b.score - a.score);

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
            {rows.length} produtor{rows.length !== 1 ? "es" : ""} associado{rows.length !== 1 ? "s" : ""}
            aos seus lotes ativos. Score Embrapa Doc 237 v3 + indicadores quali+quanti.
          </p>
        </header>

        <div className="mb-6 ag-card px-4 py-2 flex items-center gap-2 max-w-md">
          <Search size={14} className="text-[--text-muted]" />
          <input
            placeholder="Buscar produtor (futuro)"
            disabled
            className="bg-transparent outline-none text-sm flex-1 text-[--text-secondary] placeholder-[--text-muted]"
          />
        </div>

        {rows.length === 0 ? (
          <div className="ag-card p-12 text-center">
            <Building2 size={36} className="text-[--text-muted] mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-[--text-primary]">Nenhum produtor vinculado</h2>
            <p className="text-[--text-secondary] mt-2 max-w-sm mx-auto">
              Quando você for associado a lotes pela equipe Agraas, os produtores aparecerão aqui.
              Veja <strong>Oportunidades</strong> para lotes ofertados no marketplace.
            </p>
          </div>
        ) : (
          <section className="ag-card">
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Produtor</th>
                  <th>UF(s)</th>
                  <th className="text-right">Fazendas</th>
                  <th className="text-right">Animais</th>
                  <th className="text-right">Score</th>
                  <th>Classificação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cls = scoreClassification(r.score);
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.name}</td>
                      <td className="text-[--text-secondary] text-sm font-mono">
                        {r.ufs.join(", ") || "—"}
                      </td>
                      <td className="text-right">{r.properties}</td>
                      <td className="text-right">{r.animals.toLocaleString("pt-BR")}</td>
                      <td className="text-right font-semibold" style={{ color: cls.color }}>
                        {r.score > 0 ? r.score.toFixed(0) : "—"}
                      </td>
                      <td>
                        {r.score > 0 ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{ backgroundColor: `${cls.color}20`, color: cls.color }}
                          >
                            {cls.label}
                          </span>
                        ) : (
                          <span className="text-[--text-muted] text-xs">sem score</span>
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
