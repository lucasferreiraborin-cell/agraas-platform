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
import { funruralValue } from "@/lib/funrural";
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
    .select("id, name, email, funrural_rate, tax_regime")
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
    db.from("properties").select("id, name, city, state, area_hectares").eq("client_id", clientId),
    db.from("animals").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "Ativo"),
  ]);

  const propMap = new Map((properties ?? []).map((p) => [p.id, p]));

  // ── Saúde financeira — só quando acesso liberado (já garantido pelo rel check) ─
  type FinancialData = {
    receita12m: number;
    despesa12m: number;
    funrural12m: number;
    projections: Array<{ month: string; inflow: number; outflow: number }>;
    recentEntries: Array<{ entry_date: string | null; description: string | null; amount: number | null }>;
  };
  let financial: FinancialData | null = null;

  try {
    const cutoff12 = new Date();
    cutoff12.setMonth(cutoff12.getMonth() - 11);
    cutoff12.setDate(1);
    const iso12 = cutoff12.toISOString().split("T")[0];
    const todayIso2 = new Date().toISOString().split("T")[0];

    const [invRes, projRes, entryRes] = await Promise.allSettled([
      db
        .from("fiscal_invoices")
        .select("direction, gross_value, funrural_value, issued_at")
        .eq("client_id", clientId)
        .gte("issued_at", iso12),
      db
        .from("cash_flow_projections")
        .select("projection_date, expected_inflow, expected_outflow")
        .eq("client_id", clientId)
        .gte("projection_date", todayIso2)
        .order("projection_date", { ascending: true })
        .limit(6),
      db
        .from("accounting_entries")
        .select("entry_date, description, amount")
        .eq("client_id", clientId)
        .order("entry_date", { ascending: false })
        .limit(30),
    ]);

    const invoices =
      invRes.status === "fulfilled" ? (invRes.value.data ?? []) : [];
    const projRows =
      projRes.status === "fulfilled" ? (projRes.value.data ?? []) : [];
    const entryRows =
      entryRes.status === "fulfilled" ? (entryRes.value.data ?? []) : [];

    // Semântica real do banco: direction 'saida' = nota emitida pelo produtor
    // (venda → receita bruta); 'entrada' = nota recebida (compra → despesa).
    const receita12m = invoices
      .filter((i) => i.direction === "saida")
      .reduce((s, i) => s + Number(i.gross_value ?? 0), 0);
    const despesa12m = invoices
      .filter((i) => i.direction === "entrada")
      .reduce((s, i) => s + Number(i.gross_value ?? 0), 0);
    // FUNRURAL PROVISIONADO nas notas de saída — usa o valor real da nota quando
    // presente, senão calcula pela alíquota do cliente (LC 224/2025). É valor
    // provisionado/calculado, NÃO comprovante de recolhimento à Receita.
    const funrural12m = invoices
      .filter((i) => i.direction === "saida")
      .reduce(
        (s, i) =>
          s +
          (i.funrural_value != null
            ? Number(i.funrural_value)
            : funruralValue(Number(i.gross_value ?? 0), producer)),
        0,
      );

    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    financial = {
      receita12m,
      despesa12m,
      funrural12m,
      projections: projRows.map((p) => {
        const ym = (p.projection_date ?? "").slice(0, 7);
        const [, m] = ym.split("-");
        const idx = parseInt(m, 10) - 1;
        return {
          month: months[idx] ?? ym,
          inflow: Number(p.expected_inflow ?? 0),
          outflow: Number(p.expected_outflow ?? 0),
        };
      }),
      recentEntries: entryRows as FinancialData["recentEntries"],
    };
  } catch {
    financial = null;
  }

  // Amostra: top 10 animais por score
  // SEGURANCA (132/security-rls C9): primeiro filtramos animais do clientId,
  // depois buscamos scores cujo animal_id esteja nesse subset. Sem isso,
  // animal_scores.select() retornava top-10 GLOBAL (vazamento cross-tenant).
  const { data: producerAnimals } = await db
    .from("animals")
    .select("id, internal_code, breed, sex, birth_date, current_property_id")
    .eq("client_id", clientId);

  const producerAnimalIds = (producerAnimals ?? []).map((a) => a.id);

  const { data: topAnimals } = producerAnimalIds.length
    ? await db
        .from("animal_scores")
        .select("animal_id, total_score, score_produtivo, score_sanidade, score_rastreabilidade")
        .in("algorithm_version", ["v3", "v3.1", "v3.2"])
        .in("animal_id", producerAnimalIds)
        .order("total_score", { ascending: false })
        .limit(10)
    : { data: [] as Array<{ animal_id: string; total_score: number; score_produtivo: number | null; score_sanidade: number | null; score_rastreabilidade: number | null }> };

  const animalIds = (topAnimals ?? []).map((a) => a.animal_id);
  const animalsData = (producerAnimals ?? []).filter((a) => animalIds.includes(a.id));
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
                  label="Financeiro"
                  value={Number(ps?.score_financeiro ?? 0)}
                  placeholder={!ps?.score_financeiro}
                  hint="Fonte: ROI real das vendas + regularidade fiscal (NF-e)"
                />
                <ScoreBreakdown
                  label="Relacionamento comercial"
                  value={Number(ps?.score_relacionamento ?? 0)}
                  placeholder={!ps?.score_relacionamento}
                  hint="Fonte: recorrência de compradores + vendas com NF-e vinculada"
                />
                <ScoreBreakdown
                  label="Institucional · certificações e rastreabilidade"
                  value={Number(ps?.score_institucional ?? 0)}
                  placeholder={!ps?.score_institucional}
                  hint="Fonte: certificações ativas + prontidão LCDPR"
                />
              </div>
            </div>
            <p className="text-xs text-[--text-muted] mt-6 border-t border-[var(--border)] pt-4 leading-relaxed">
              A nota agregada é ancorada na dimensão <strong>Ativos</strong> (qualidade do rebanho),
              calculada pela metodologia Embrapa Doc 237 (Costa et al., 2018). As dimensões de crédito
              — financeiro, relacionamento e institucional — estão <strong>em calibração</strong> a
              partir de dados fiscais e comerciais reais do produtor; metodologia analítica Agraas em
              validação, não derivada da Embrapa.
            </p>
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
                      <td className="text-right">{prop?.area_hectares?.toLocaleString("pt-BR") ?? "—"}</td>
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

          {/* Saúde financeira */}
          {financial && (
            <section className="ag-card mb-8 mt-8">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[--text-primary]">
                    Saúde financeira
                  </h2>
                  <p className="text-xs text-[--text-muted] mt-0.5">
                    Dados fiscais dos últimos 12 meses · mascarados conforme LGPD
                  </p>
                </div>
              </div>

              {/* KPIs financeiros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
                <FinKpi
                  label="Receita bruta 12m"
                  value={fmtBRL(financial.receita12m)}
                />
                <FinKpi
                  label="Despesas 12m"
                  value={fmtBRL(financial.despesa12m)}
                />
                <FinKpi
                  label="FUNRURAL provisionado (12m)"
                  value={fmtBRL(financial.funrural12m)}
                />
                <FinKpi
                  label="Projeções disponíveis"
                  value={
                    financial.projections.length > 0
                      ? `${financial.projections.length} meses`
                      : "—"
                  }
                />
              </div>

              {/* Projeção próximos 6 meses */}
              {financial.projections.length > 0 && (
                <div className="px-6 pb-6 border-t border-[var(--border)] pt-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[--text-muted] mb-3">
                    Projeção próximos {financial.projections.length} meses
                  </p>
                  <div className="overflow-x-auto">
                    <table className="ag-table">
                      <thead>
                        <tr>
                          <th>Mês</th>
                          <th className="text-right">Entrada prev.</th>
                          <th className="text-right">Saída prev.</th>
                          <th className="text-right">Saldo prev.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financial.projections.map((p, i) => {
                          const net = p.inflow - p.outflow;
                          return (
                            <tr key={i}>
                              <td>{p.month}</td>
                              <td className="text-right tabular-nums text-[--text-secondary]">
                                {fmtBRL(p.inflow)}
                              </td>
                              <td className="text-right tabular-nums text-[--text-secondary]">
                                {fmtBRL(p.outflow)}
                              </td>
                              <td
                                className={`text-right tabular-nums font-semibold ${
                                  net >= 0
                                    ? "text-[var(--primary-hover)]"
                                    : "text-red-600"
                                }`}
                              >
                                {net >= 0 ? "" : "-"}
                                {fmtBRL(Math.abs(net))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Lançamentos recentes (mascarados — só categoria + valor) */}
              {financial.recentEntries.length > 0 && (
                <div className="px-6 pb-6 border-t border-[var(--border)] pt-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[--text-muted] mb-3">
                    Últimos 30 lançamentos contábeis · categorias mascaradas
                  </p>
                  <div className="overflow-x-auto">
                    <table className="ag-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Lançamento</th>
                          <th className="text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financial.recentEntries.map((e, i) => (
                          <tr key={i}>
                            <td className="text-sm text-[--text-secondary]">
                              {e.entry_date
                                ? new Date(e.entry_date).toLocaleDateString("pt-BR")
                                : "—"}
                            </td>
                            <td className="text-sm">{e.description ?? "—"}</td>
                            <td className="text-right tabular-nums text-sm text-[--text-secondary]">
                              {e.amount && Number(e.amount) > 0
                                ? fmtBRL(Number(e.amount))
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          <p className="text-xs text-[--text-muted] mt-8 text-center max-w-2xl mx-auto">
            Dados liberados via consentimento expresso do produtor (LGPD Art. 7º, V).
            Identificadores individuais mascarados. Para análise complementar, solicite documentos
            ao produtor diretamente.
          </p>
      </div>
    </PersonaShell>
  );
}

function fmtBRL(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function FinKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <p className="text-xs text-[--text-muted]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[--text-primary]">{value}</p>
    </div>
  );
}

function ScoreBreakdown({
  label,
  value,
  placeholder = false,
  hint,
}: {
  label: string;
  value: number;
  placeholder?: boolean;
  hint?: string;
}) {
  if (placeholder) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[--text-secondary]">{label}</span>
            <span className="text-[10px] uppercase tracking-wider rounded-full border border-[var(--border)] px-2 py-0.5 text-[--text-muted]">
              em calibração
            </span>
          </div>
          {hint && <p className="text-[11px] text-[--text-muted] mt-1">{hint}</p>}
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
