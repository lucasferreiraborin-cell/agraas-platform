import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function RelatoriosPage() {
  const [
    { count: animalsCount },
    { count: applicationsCount },
    { count: weightsCount },
    { count: lotsCount },
    { count: costsCount },
    { count: movementsCount },
  ] = await Promise.all([
    supabase.from("animals").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("weights").select("*", { count: "exact", head: true }),
    supabase.from("lots").select("*", { count: "exact", head: true }),
    supabase.from("cost_records").select("*", { count: "exact", head: true }),
    supabase.from("animal_movements").select("*", { count: "exact", head: true }),
  ]);

  const reports = [
    {
      title: "Relatório sanitário",
      description: "Aplicações, estoque e histórico sanitário da operação.",
      href: "/aplicacoes/historico",
      cta: "Abrir histórico sanitário",
    },
    {
      title: "Relatório produtivo",
      description: "Pesagens, desempenho e acompanhamento da evolução do rebanho.",
      href: "/pesagens/historico",
      cta: "Abrir histórico de pesagens",
    },
    {
      title: "Relatório de lotes",
      description: "Estrutura de grupos operacionais e vínculos de animais.",
      href: "/lotes",
      cta: "Abrir lotes",
    },
    {
      title: "Relatório econômico",
      description: "Custos por categoria, animal e lote.",
      href: "/custos/historico",
      cta: "Abrir histórico de custos",
    },
    {
      title: "Relatório operacional",
      description: "Movimentações e eventos recentes da fazenda.",
      href: "/movimentacoes/historico",
      cta: "Abrir histórico de movimentações",
    },
    {
      title: "Relatório de alertas",
      description: "Pontos críticos de estoque, vencimento e pesagem.",
      href: "/alertas",
      cta: "Abrir alertas",
    },
  ];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Relatórios Agraas</div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)] lg:text-6xl">
              Central de leitura gerencial da operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              Consolide a visão sanitária, produtiva, econômica e operacional da
              fazenda em uma central única de análise e acompanhamento.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/produtivo" className="ag-button-primary">
                Dashboard produtivo
              </Link>
              <Link href="/estoque/dashboard" className="ag-button-secondary">
                Dashboard sanitário
              </Link>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard label="Animais" value={animalsCount ?? 0} subtitle="base pecuária registrada" />
              <MetricCard label="Aplicações" value={applicationsCount ?? 0} subtitle="histórico sanitário" />
              <MetricCard label="Pesagens" value={weightsCount ?? 0} subtitle="base produtiva" />
              <MetricCard label="Custos" value={costsCount ?? 0} subtitle="base econômica" />
              <MetricCard label="Lotes" value={lotsCount ?? 0} subtitle="grupos operacionais" />
              <MetricCard label="Movimentos" value={movementsCount ?? 0} subtitle="trilha operacional" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <div key={report.title} className="ag-card p-8">
            <h2 className="ag-section-title">{report.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {report.description}
            </p>

            <div className="mt-6">
              <Link href={report.href} className="ag-button-secondary">
                {report.cta}
              </Link>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}