/**
 * Sprint B — Persona Banco — Dossiê do Produtor.
 *
 * Vista detalhada de UM produtor: producer_score v3 + breakdown por fazenda
 * (farm_scores) + amostra de animais com ear tag mascarado.
 *
 * Segurança: requer relacionamento active + granted_by_producer=true.
 * Dados granulares (CPF, contrato, ear tag completo) ficam escondidos.
 */

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import PersonaShell from "@/app/components/personas/PersonaShell";
import { BANK_VIEW_ENABLED } from "@/lib/feature-flags";
import { scoreClassification, maskEarTag } from "@/lib/personas";
import { requirePersona, BANCO_ROUTES } from "@/lib/persona-resolver";
import { ArrowLeft, Download, MapPin, Calendar, Award } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ clientId: string }> };

export default async function DossieProdutor({ params }: Params) {
  if (!BANK_VIEW_ENABLED) redirect("/em-breve");

  const { clientId } = await params;
  const ctx = await requirePersona(BANCO_ROUTES);
  const bankData = { id: ctx.clientId, name: ctx.clientName, role: ctx.realRole };
  const db = createSupabaseServiceClient();

  // Verifica relacionamento ativo + acesso liberado
  const { data: rel } = await db
    .from("bank_producer_relationships")
    .select("status, granted_by_producer, granted_at, relationship_type, notes")
    .eq("bank_client_id", bankData.id)
    .eq("producer_client_id", clientId)
    .single();

  if (!rel || rel.status !== "active" || !rel.granted_by_producer) {
    redirect("/banco");
  }

  const { data: producer } = await db
    .from("clients")
    .select("id, name, email")
    .eq("id", clientId)
    .single();
  if (!producer) notFound();

  const [
    { data: ps },
    { data: farms },
    { data: properties },
    { count: totalAnimaisCount },
  ] = await Promise.all([
    db.from("producer_scores").select("*").eq("client_id", clientId).single(),
    db.from("farm_scores").select("*").eq("client_id", clientId),
    db.from("properties").select("id, name, city, state, area_ha").eq("client_id", clientId),
    db.from("animals").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "Ativo"),
  ]);

  const propMap = new Map((properties ?? []).map((p) => [p.id, p]));

  // Amostra: top 10 animais por score
  const { data: topAnimals } = await db
    .from("animal_scores")
    .select("animal_id, total_score, score_produtivo, score_sanidade, score_rastreabilidade")
    .eq("algorithm_version", "v3")
    .order("total_score", { ascending: false })
    .limit(10);

  const animalIds = (topAnimals ?? []).map((a) => a.animal_id);
  const { data: animalsData } = animalIds.length
    ? await db
        .from("animals")
        .select("id, internal_code, breed, sex, birth_date, current_property_id")
        .in("id", animalIds)
        .eq("client_id", clientId)
    : { data: [] };
  const animalMap = new Map((animalsData ?? []).map((a) => [a.id, a]));

  const psCls = scoreClassification(Number(ps?.score_total ?? 0));

  return (
    <PersonaShell ctx={ctx}>
      <div className="max-w-6xl mx-auto px-8 py-10">
          <Link href="/banco" className="inline-flex items-center gap-1 text-[--text-secondary] text-sm hover:text-[--text-primary] mb-6">
            <ArrowLeft size={14} />
            Portfólio
          </Link>

          <header className="mb-10 flex items-start justify-between gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[--text-muted]">
                Dossiê · {rel.relationship_type === "loan_active" ? "Crédito ativo" : "Análise de crédito"}
              </div>
              <h1 className="text-3xl font-semibold text-[--text-primary] mt-2">
                {producer.name}
              </h1>
              <p className="text-[--text-secondary] mt-3">
                Acesso liberado pelo produtor em{" "}
                {rel.granted_at
                  ? new Date(rel.granted_at).toLocaleDateString("pt-BR")
                  : "data não registrada"}
                .
              </p>
            </div>
            <a
              href={`/api/export/dossie-banco-pdf?clientId=${clientId}`}
              target="_blank"
              rel="noopener"
              className="ag-button-secondary inline-flex items-center gap-2 shrink-0"
            >
              <Download size={14} />
              Exportar PDF
            </a>
          </header>

          {/* Score agregado destaque */}
          <section className="ag-card-strong p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">
                  Producer Score · v3 Embrapa Doc 237
                </div>
                <div className="flex items-end gap-3 mt-3">
                  <div className="text-6xl font-bold leading-none" style={{ color: psCls.color }}>
                    {Number(ps?.score_total ?? 0).toFixed(0)}
                  </div>
                  <div className="pb-1">
                    <div className="text-lg font-semibold" style={{ color: psCls.color }}>
                      {psCls.label}
                    </div>
                    <div className="text-xs text-[--text-muted]">/ 100 pts</div>
                  </div>
                </div>
                <p className="text-sm text-[--text-secondary] mt-3 max-w-xs">{psCls.description}</p>
              </div>
              <div className="space-y-2 col-span-2">
                <ScoreBreakdown label="Ativos · qualidade do rebanho" value={Number(ps?.score_ativos ?? 0)} />
                <ScoreBreakdown
                  label="Relacionamento institucional"
                  value={Number(ps?.score_relacionamento ?? 0)}
                  placeholder={!ps?.score_relacionamento}
                />
                <ScoreBreakdown
                  label="Financeiro"
                  value={Number(ps?.score_financeiro ?? 0)}
                  placeholder={!ps?.score_financeiro}
                />
                <ScoreBreakdown
                  label="Institucional · CAR + IBAMA + sanitário"
                  value={Number(ps?.score_institucional ?? 0)}
                  placeholder={!ps?.score_institucional}
                />
              </div>
            </div>
          </section>

          {/* KPIs do produtor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Kpi label="Fazendas ativas" value={(farms?.length ?? 0).toString()} />
            <Kpi label="Animais ativos" value={(totalAnimaisCount ?? 0).toLocaleString("pt-BR")} />
            <Kpi label="Algoritmo" value="Embrapa v3" sub="Doc 237 · Costa et al. 2018" />
          </div>

          {/* Breakdown por fazenda */}
          <section className="ag-card mb-8">
            <div className="px-6 py-4 border-b border-white/8">
              <h2 className="text-lg font-semibold text-[--text-primary]">Fazendas no portfólio</h2>
            </div>
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Fazenda</th>
                  <th>Localização</th>
                  <th className="text-right">Área (ha)</th>
                  <th className="text-right">Animais</th>
                  <th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {(farms ?? []).map((f) => {
                  const prop = propMap.get(f.property_id);
                  const cls = scoreClassification(Number(f.score_total));
                  return (
                    <tr key={f.id}>
                      <td className="font-medium">{prop?.name ?? "—"}</td>
                      <td className="text-[--text-secondary]">
                        {prop?.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {prop.city}/{prop.state}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-right">{prop?.area_ha?.toLocaleString("pt-BR") ?? "—"}</td>
                      <td className="text-right">{f.animals_count_active ?? 0}</td>
                      <td className="text-right font-semibold" style={{ color: cls.color }}>
                        {Number(f.score_total).toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
                {(!farms || farms.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-[--text-secondary]">
                      Nenhuma fazenda registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Amostra de animais — ear tag mascarado */}
          <section className="ag-card">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary]">
                  Amostra de animais
                </h2>
                <p className="text-xs text-[--text-muted] mt-0.5">
                  Top 10 por score · identificadores mascarados conforme LGPD
                </p>
              </div>
              <Award size={20} className="text-[--text-muted]" />
            </div>
            <table className="ag-table">
              <thead>
                <tr>
                  <th>ID (mascarado)</th>
                  <th>Raça</th>
                  <th>Sexo</th>
                  <th>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> Nasc.
                    </span>
                  </th>
                  <th className="text-right">Score</th>
                  <th className="text-right">Produtivo</th>
                  <th className="text-right">Sanidade</th>
                  <th className="text-right">Rastreio</th>
                </tr>
              </thead>
              <tbody>
                {(topAnimals ?? []).map((s) => {
                  const a = animalMap.get(s.animal_id);
                  if (!a) return null;
                  return (
                    <tr key={s.animal_id}>
                      <td className="font-mono text-sm">{maskEarTag(a.internal_code ?? "")}</td>
                      <td>{a.breed ?? "—"}</td>
                      <td>{a.sex ?? "—"}</td>
                      <td>{a.birth_date ? new Date(a.birth_date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="text-right font-semibold">{Number(s.total_score).toFixed(0)}</td>
                      <td className="text-right text-[--text-secondary]">
                        {s.score_produtivo ? Number(s.score_produtivo).toFixed(0) : "—"}
                      </td>
                      <td className="text-right text-[--text-secondary]">
                        {s.score_sanidade ? Number(s.score_sanidade).toFixed(0) : "—"}
                      </td>
                      <td className="text-right text-[--text-secondary]">
                        {s.score_rastreabilidade ? Number(s.score_rastreabilidade).toFixed(0) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {(!topAnimals || topAnimals.length === 0) && (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-[--text-secondary]">
                      Sem scores v3 calculados ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-[--text-muted] mt-8 text-center max-w-2xl mx-auto">
            Dados liberados via consentimento expresso do produtor (LGPD Art. 7º, V).
            Identificadores individuais mascarados. Para análise complementar, solicite documentos
            ao produtor diretamente.
          </p>
      </div>
    </PersonaShell>
  );
}

function ScoreBreakdown({
  label,
  value,
  placeholder = false,
}: {
  label: string;
  value: number;
  placeholder?: boolean;
}) {
  if (placeholder) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[--text-secondary]">{label}</span>
            <span className="text-xs text-[--text-muted] italic">não calculado</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full mt-1.5" />
        </div>
      </div>
    );
  }
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-[--text-secondary]">{label}</span>
        <span className="text-sm text-[--text-primary] font-medium">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-[--primary] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ag-card p-5">
      <div className="text-[11px] uppercase tracking-wider text-[--text-muted]">{label}</div>
      <div className="text-2xl font-bold text-[--text-primary] mt-2">{value}</div>
      {sub && <div className="text-xs text-[--text-muted] mt-1">{sub}</div>}
    </div>
  );
}
