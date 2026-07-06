/**
 * Controladoria — Painel.
 *
 * Pivot 19/06/2026: wedge primário Agraas é Contábil + Fiscal + Estoque.
 * Esta tela é o índice do módulo: KPIs operacionais + 4 atalhos para as
 * subpáginas.
 *
 * Server Component. Schema (migration 128) está sendo criado em paralelo —
 * todas as queries usam try/catch defensivo para não derrubar a página
 * caso uma tabela ainda não exista em prod.
 */

import Link from "next/link";
import {
  Receipt,
  AlertTriangle,
  CalendarClock,
  Landmark,
  BookOpen,
  TrendingUp,
  Boxes,
  ArrowUpRight,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { funruralValue, funruralRateLabel } from "@/lib/funrural";

export const dynamic = "force-dynamic";

type FiscalInvoiceRow = {
  id: string;
  status: string | null;
  direction: string | null;
  emission_date: string | null;
  total_amount: number | null;
};

async function safeCount(
  fn: () => PromiseLike<{ count: number | null }>,
): Promise<number | null> {
  try {
    const { count } = await fn();
    return count ?? 0;
  } catch {
    return null;
  }
}

async function safeSelect<T>(
  fn: () => PromiseLike<{ data: T[] | null }>,
): Promise<T[] | null> {
  try {
    const { data } = await fn();
    return data ?? [];
  } catch {
    return null;
  }
}

export default async function ControladoriaPage() {
  const supabase = await createSupabaseServerClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isoCutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().split("T")[0];

  // KPI 1: NF-e processadas últimos 30 dias
  const invoices30d = await safeSelect<FiscalInvoiceRow>(() =>
    supabase
      .from("fiscal_invoices")
      .select("id, status, direction, emission_date, total_amount")
      .gte("emission_date", isoCutoff),
  );

  // KPI 2: FUNRURAL devido mês corrente — agrega total_amount de saídas
  // (direction = 'outbound') no mês corrente. Alíquota parametrizada por
  // cliente (funrural_rate / tax_regime), conforme LC 224/2025.
  const outbound = await safeSelect<FiscalInvoiceRow>(() =>
    supabase
      .from("fiscal_invoices")
      .select("id, status, direction, emission_date, total_amount")
      .gte("emission_date", monthStartIso)
      .eq("direction", "outbound"),
  );

  // Cliente logado — alíquota FUNRURAL parametrizada (funrural_rate/tax_regime).
  // Resolve client via auth.uid() → clients.auth_user_id (padrão da RLS).
  // Cliente antigo sem os campos cai no fallback PF do helper.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: funruralClient } = user
    ? await supabase
        .from("clients")
        .select("funrural_rate, tax_regime")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  // KPI 3: Alertas pendentes (notas com status pending_review)
  const pendingReviewCount = await safeCount(() =>
    supabase
      .from("fiscal_invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  );

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const totalNotas30d = invoices30d?.length ?? null;
  const receitaMes =
    outbound?.reduce((s, n) => s + Number(n.total_amount ?? 0), 0) ?? null;
  const funruralDevido =
    receitaMes !== null ? funruralValue(receitaMes, funruralClient) : null;
  const funruralLabel = funruralRateLabel(funruralClient);

  const today = new Date();
  const proximaObrigacao = nextObligation(today);

  // ── Atalhos ──────────────────────────────────────────────────────────────
  const atalhos = [
    {
      href: "/controladoria/notas",
      label: "Notas fiscais",
      desc: "Importe NF-e (XML, PDF, ditado ou CSV) e revise extrações de IA.",
      icon: Receipt,
      hint: pendingReviewCount && pendingReviewCount > 0
        ? `${pendingReviewCount} pendente${pendingReviewCount > 1 ? "s" : ""} de revisão`
        : "Tudo revisado",
      hintTone: pendingReviewCount && pendingReviewCount > 0 ? "warning" : "ok",
    },
    {
      href: "/controladoria/contas",
      label: "Plano de contas",
      desc: "Lançamentos contábeis e plano de contas adaptado ao produtor rural.",
      icon: BookOpen,
      hint: "Plano de contas ativo",
      hintTone: "ok",
    },
    {
      href: "/controladoria/cash-flow",
      label: "Cash flow",
      desc: "Projeção de fluxo de caixa por safra e ciclo produtivo.",
      icon: TrendingUp,
      hint: "Projeção ativa",
      hintTone: "ok",
    },
    {
      href: "/controladoria/estoque",
      label: "Estoque",
      desc: "Controle de insumos com baixa automática via NF-e validada.",
      icon: Boxes,
      hint: "Controle ativo",
      hintTone: "ok",
    },
  ] as const;

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Controladoria"
        title="Painel da controladoria"
        description="Operação contábil, fiscal e de estoque do produtor rural em uma só camada. Importe NF-e, acompanhe obrigações fiscais e mantenha o cash flow projetado."
        actions={
          <>
            <Link href="/controladoria/notas" className="ag-button-primary">
              Subir NF-e
            </Link>
            <Link href="/controladoria/contas" className="ag-button-secondary">
              Plano de contas
            </Link>
          </>
        }
      />

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="NF-e últimos 30 dias"
          value={totalNotas30d === null ? "—" : totalNotas30d.toLocaleString("pt-BR")}
          sub={
            totalNotas30d === null
              ? "Aguardando integração fiscal"
              : "Importadas e classificadas"
          }
          icon={Receipt}
        />
        <KpiCard
          label="FUNRURAL devido (mês)"
          value={
            funruralDevido === null
              ? "—"
              : `R$ ${funruralDevido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
          }
          sub={
            funruralDevido === null
              ? "Sem receitas registradas"
              : `Estimativa · ${funruralLabel} sobre receita bruta`
          }
          icon={Landmark}
        />
        <KpiCard
          label="Alertas pendentes"
          value={
            pendingReviewCount === null
              ? "—"
              : pendingReviewCount.toLocaleString("pt-BR")
          }
          sub={
            pendingReviewCount === null
              ? "Aguardando integração fiscal"
              : pendingReviewCount > 0
              ? "NF-e aguardando revisão humana"
              : "Nenhuma pendência"
          }
          icon={AlertTriangle}
          tone={
            pendingReviewCount && pendingReviewCount > 0 ? "warning" : "default"
          }
        />
        <KpiCard
          label="Próxima obrigação"
          value={proximaObrigacao.label}
          sub={proximaObrigacao.due}
          icon={CalendarClock}
        />
      </section>

      {/* ── Atalhos ──────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="ag-section-title">Áreas do módulo</h2>
          <p className="text-sm text-[var(--text-muted)]">
            4 áreas · 1 wedge
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {atalhos.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                    <Icon size={18} className="text-[var(--primary)]" />
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="text-[var(--text-muted)] transition group-hover:text-[var(--primary)]"
                  />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[var(--text-primary)]">
                  {a.label}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                  {a.desc}
                </p>
                <p
                  className={`mt-4 text-xs ${
                    a.hintTone === "warning"
                      ? "text-amber-700"
                      : a.hintTone === "ok"
                      ? "text-[var(--primary-hover)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {a.hint}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * Próxima obrigação fiscal real do produtor rural brasileiro.
 * Lista deliberadamente curta — vamos expandir quando a tela
 * /controladoria/obrigacoes existir.
 */
function nextObligation(now: Date): { label: string; due: string } {
  const m = now.getMonth();
  const d = now.getDate();
  const year = now.getFullYear();

  // FUNRURAL — vencimento dia 20 do mês seguinte ao fato gerador
  // DIRPF — última semana de abril
  // DCTFWeb — dia 15 do mês seguinte (se folha de pagamento)
  const obligations: { label: string; date: Date }[] = [
    { label: "FUNRURAL", date: new Date(year, m, 20) },
    { label: "DCTFWeb", date: new Date(year, m, 15) },
    { label: "DIRPF", date: new Date(year, 3, 30) },
  ];

  // Se a do mês corrente já passou, joga pro mês seguinte
  const adjusted = obligations.map((o) => {
    if (o.label === "DIRPF") return o;
    if (o.date.getDate() < d) {
      return { ...o, date: new Date(year, m + 1, o.date.getDate()) };
    }
    return o;
  });

  adjusted.sort((a, b) => a.date.getTime() - b.date.getTime());
  const next = adjusted[0];
  return {
    label: next.label,
    due: `Vence em ${next.date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })}`,
  };
}
