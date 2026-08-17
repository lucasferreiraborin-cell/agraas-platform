/**
 * Página de Hedge (nível rebanho) — Financeiro · trava de preço e margem.
 *
 * Agrega arrobas + custo de TODO o rebanho ativo e roda a Inteligência de
 * Hedge (curva de futuros BGI sobre o custo real), amarrada ao financeiro
 * (exposição a mercado + margem em risco). Breakdown por lote com as janelas.
 *
 * Sugestão do Mourão (JBS). Decisão-suporte — não é recomendação de investimento.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCotacaoArroba, formatCotacaoAge } from "@/lib/cotacao";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/EmptyState";
import HedgePanel from "@/app/components/HedgePanel";
import { CandlestickChart, ArrowRight, TrendingUp, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function HedgePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: clientData } = user
    ? await supabase.from("clients").select("id, role").eq("auth_user_id", user.id).single()
    : { data: null };
  if (clientData?.role === "buyer") redirect("/comprador");
  if (clientData?.role === "bank") redirect("/banco");
  const clientId = clientData?.id ?? "00000000-0000-0000-0000-000000000000";

  const cotacao = await getCotacaoArroba();

  const { data: animals } = await supabase
    .from("animals").select("id").eq("client_id", clientId).eq("status", "Ativo");
  const animalIds = (animals ?? []).map((a) => a.id);

  if (animalIds.length === 0) {
    return (
      <main className="space-y-8">
        <PageHeader badge="Financeiro · Hedge" title="Inteligência de Hedge"
          description="Trava de preço e margem do rebanho sobre a curva de futuros do boi gordo." />
        <div className="ag-card p-10">
          <EmptyState icon={CandlestickChart} title="Sem rebanho ativo"
            text="Cadastre animais com peso e custo para calcular a proteção de preço e margem." />
        </div>
      </main>
    );
  }

  const [{ data: weights }, { data: costs }, { data: assigns }, { data: lots }] = await Promise.all([
    supabase.from("weights").select("animal_id, weight, weighing_date")
      .in("animal_id", animalIds).order("weighing_date", { ascending: false }),
    supabase.from("animal_cost_summary").select("animal_id, total_cost").in("animal_id", animalIds),
    supabase.from("animal_lot_assignments").select("animal_id, lot_id").is("exit_date", null).in("animal_id", animalIds),
    supabase.from("lots").select("id, name, objective, target_weight").eq("client_id", clientId),
  ]);

  const latestWeight = new Map<string, number>();
  for (const w of (weights ?? []) as { animal_id: string; weight: number }[]) {
    if (!latestWeight.has(w.animal_id)) latestWeight.set(w.animal_id, Number(w.weight) || 0);
  }
  const costByAnimal = new Map<string, number>(
    ((costs ?? []) as { animal_id: string; total_cost: number | null }[]).map((c) => [c.animal_id, Number(c.total_cost ?? 0)]),
  );

  // Agregado do rebanho
  let pesoTotal = 0, custoTotal = 0, comPeso = 0;
  for (const id of animalIds) {
    const w = latestWeight.get(id) ?? 0;
    if (w > 0) { pesoTotal += w; comPeso++; }
    custoTotal += costByAnimal.get(id) ?? 0;
  }
  const arrobas = pesoTotal / 30;
  const pesoMedio = comPeso > 0 ? pesoTotal / comPeso : 0;
  const valorMercado = arrobas * cotacao.value;
  const custoPorArroba = arrobas > 0 ? custoTotal / arrobas : 0;
  const margemMercado = valorMercado - custoTotal;

  // Breakdown por lote
  const lotMap = new Map(
    ((lots ?? []) as { id: string; name: string | null; objective: string | null; target_weight: number | null }[])
      .map((l) => [l.id, l]),
  );
  const perLote = new Map<string, { arrobas: number; custo: number }>();
  for (const a of (assigns ?? []) as { animal_id: string; lot_id: string }[]) {
    const w = latestWeight.get(a.animal_id) ?? 0;
    const c = costByAnimal.get(a.animal_id) ?? 0;
    const cur = perLote.get(a.lot_id) ?? { arrobas: 0, custo: 0 };
    cur.arrobas += w / 30;
    cur.custo += c;
    perLote.set(a.lot_id, cur);
  }
  const loteRows = [...perLote.entries()]
    .map(([lotId, v]) => {
      const l = lotMap.get(lotId);
      const custoArr = v.arrobas > 0 ? v.custo / v.arrobas : 0;
      const margemSpot = cotacao.value - custoArr;
      return {
        lotId,
        name: l?.name ?? "Lote",
        objective: l?.objective ?? null,
        arrobas: v.arrobas,
        custoArr,
        margemSpot,
        janela: margemSpot > 0,
      };
    })
    .filter((r) => r.arrobas > 0 && r.custoArr > 0)
    .sort((a, b) => b.margemSpot - a.margemSpot);

  const mesAtual = new Date().getMonth();

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Financeiro · Hedge"
        title="Inteligência de Hedge"
        description={`Trava de preço e margem do rebanho sobre a curva de futuros do boi gordo (BGI). Cotação @ ${fmtBRL(cotacao.value)} · atualizada ${formatCotacaoAge(cotacao.updatedAt)}.`}
      />

      {/* Amarração com o financeiro — exposição a mercado */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Valor a mercado", value: fmtBRL(valorMercado), sub: `${arrobas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} @ × spot`, tone: "primary" },
          { label: "Custo total do rebanho", value: fmtBRL(custoTotal), sub: `${fmtBRL(custoPorArroba)}/@ de break-even`, tone: "muted" },
          { label: "Margem em risco (não travada)", value: fmtBRL(margemMercado), sub: "exposta à variação do @ até a venda", tone: margemMercado >= 0 ? "good" : "bad" },
        ].map((k) => (
          <div key={k.label} className="ag-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{k.label}</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${
              k.tone === "good" ? "text-[#166534]" : k.tone === "bad" ? "text-[var(--danger)]" :
              k.tone === "primary" ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
            }`}>{k.value}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{k.sub}</p>
          </div>
        ))}
      </section>

      {/* Painel de hedge do rebanho */}
      <HedgePanel
        arrobas={arrobas}
        custoTotal={custoTotal}
        cotacaoSpot={cotacao.value}
        pesoMedioKg={pesoMedio}
        mesAtual={mesAtual}
        escopo="rebanho"
        titulo="Trava de preço e margem do rebanho"
        subtitulo="Curva de futuros do boi gordo (BGI) sobre o custo real de todo o rebanho ativo — quando travar para garantir a margem antes da venda."
      />

      {/* Breakdown por lote */}
      {loteRows.length > 0 && (
        <section className="ag-card overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Oportunidade de hedge por lote</h2>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Cada lote com sua margem no spot — abra o lote para simular a trava no contrato ideal.
            </p>
          </div>
          <table className="ag-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th className="text-right">Arrobas</th>
                <th className="text-right">Custo/@</th>
                <th className="text-right">Margem no spot</th>
                <th>Status</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {loteRows.map((r) => (
                <tr key={r.lotId}>
                  <td className="font-medium">
                    {r.name}
                    {r.objective && <span className="ml-2 text-xs text-[var(--text-muted)]">· {r.objective}</span>}
                  </td>
                  <td className="text-right tabular-nums">{r.arrobas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} @</td>
                  <td className="text-right tabular-nums">{fmtBRL(r.custoArr)}</td>
                  <td className={`text-right font-semibold tabular-nums ${r.margemSpot >= 0 ? "text-[#166534]" : "text-[var(--danger)]"}`}>
                    {fmtBRL(r.margemSpot)}/@
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      r.janela ? "border-[var(--primary)]/25 bg-[var(--primary-soft)] text-[var(--primary)]" : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}>
                      {r.janela ? "Janela aberta" : "Margem apertada"}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link href={`/lotes/${r.lotId}`} className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
                      Simular <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Link para o financeiro */}
      <Link href="/financeiro" className="ag-card flex items-center justify-between gap-4 p-5 transition hover:border-[var(--primary)]/30">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <TrendingUp size={18} className="text-[var(--primary)]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Ver no Financeiro</p>
            <p className="text-xs text-[var(--text-secondary)]">Fluxo de caixa projetado, receita e despesas — o hedge protege a margem dessa projeção.</p>
          </div>
        </div>
        <ArrowRight size={18} className="text-[var(--text-muted)]" />
      </Link>
    </main>
  );
}
