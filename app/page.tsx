import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ScoreRow = {
  animal_id: string;
  internal_code: string | null;
  total_score: number | null;
  current_property_name: string | null;
  active_certifications: string[] | null;
};

type EventRow = {
  animal_id: string;
  event_type: string;
  event_timestamp: string | null;
  notes: string | null;
};

export default async function PainelPage() {
  const hoje = new Date().toISOString().slice(0, 10);

  const [
    animalsResult,
    applicationsResult,
    certificationsResult,
    lotsResult,
    slaughterResult,
    scoresResult,
    eventsResult,
  ] = await Promise.all([
    supabase.from("animals").select("*", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .gte("withdrawal_end_date", hoje),
    supabase
      .from("animal_certifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("batch_lots")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("slaughter_records").select("*", {
      count: "exact",
      head: true,
    }),
    supabase
      .from("agraas_master_passport")
      .select(
        "animal_id, internal_code, total_score, current_property_name, active_certifications"
      )
      .order("total_score", { ascending: false })
      .limit(5),
    supabase
      .from("animal_events")
      .select("animal_id, event_type, event_timestamp, notes")
      .order("event_timestamp", { ascending: false })
      .limit(6),
  ]);

  const totalAnimals = animalsResult.count ?? 0;
  const totalApplications = applicationsResult.count ?? 0;
  const totalCertifications = certificationsResult.count ?? 0;
  const totalLots = lotsResult.count ?? 0;
  const totalSlaughters = slaughterResult.count ?? 0;

  const kpis = [
    {
      title: "Animais ativos",
      value: totalAnimals,
      icon: "🐂",
      tone: "green",
      detail: "Base rastreável consolidada",
    },
    {
      title: "Em carência",
      value: totalApplications,
      icon: "💉",
      tone: "amber",
      detail: "Aplicações com janela ativa",
    },
    {
      title: "Certificados",
      value: totalCertifications,
      icon: "✅",
      tone: "blue",
      detail: "Status sanitário e compliance",
    },
    {
      title: "Lotes ativos",
      value: totalLots,
      icon: "📦",
      tone: "purple",
      detail: "Agrupamentos operacionais vigentes",
    },
    {
      title: "Abates registrados",
      value: totalSlaughters,
      icon: "📋",
      tone: "dark",
      detail: "Histórico auditável disponível",
    },
  ];

  const topScores: ScoreRow[] = (scoresResult.data as ScoreRow[] | null) ?? [];
  const recentEvents: EventRow[] = (eventsResult.data as EventRow[] | null) ?? [];

  const quickActions = [
    { label: "Novo animal", href: "/animais/novo", icon: "🐂" },
    { label: "Nova aplicação", href: "/aplicacoes", icon: "💉" },
    { label: "Nova pesagem", href: "/pesagens", icon: "⚖️" },
    { label: "Registrar venda", href: "/vendas", icon: "💰" },
    { label: "Registrar abate", href: "/abates", icon: "🧾" },
    { label: "Ver histórico", href: "/historico", icon: "🕘" },
  ];

  const animalModules = [
    {
      title: "Bovinos de corte",
      icon: "🐂",
      description:
        "Score, rastreabilidade, movimentações e histórico completo por animal.",
    },
    {
      title: "Bovinos leiteiros",
      icon: "🐄",
      description:
        "Base preparada para performance zootécnica, controle e certificação.",
    },
    {
      title: "Suínos",
      icon: "🐖",
      description:
        "Estrutura adaptável para lotes, eventos sanitários e desempenho.",
    },
    {
      title: "Ovinos",
      icon: "🐑",
      description:
        "Camada visual premium com identidade por categoria e eventos.",
    },
    {
      title: "Avicultura",
      icon: "🐔",
      description:
        "Expansão futura para agrupamentos operacionais e inteligência produtiva.",
    },
    {
      title: "Equinos",
      icon: "🐎",
      description:
        "Registro refinado com foco em linhagem, status e eventos relevantes.",
    },
  ];

  const chartSeries = buildSeries([
    totalAnimals,
    totalApplications,
    totalCertifications,
    totalLots,
    totalSlaughters,
  ]);

  const maxScore =
    topScores.length > 0
      ? Math.max(...topScores.map((item) => Number(item.total_score ?? 0)), 1)
      : 1;

  const averageTopScore =
    topScores.length > 0
      ? Math.round(
          topScores.reduce(
            (acc, item) => acc + Number(item.total_score ?? 0),
            0
          ) / topScores.length
        )
      : 0;

  const coverageIndex =
    totalAnimals > 0
      ? Math.min(
          100,
          Math.round(((totalCertifications + totalLots) / totalAnimals) * 100)
        )
      : 0;

  const traceabilityIndex =
    totalAnimals > 0
      ? Math.min(
          100,
          Math.round(
            ((totalLots + totalCertifications + totalSlaughters) /
              (totalAnimals * 1.5)) *
              100
          )
        )
      : 0;

  const operationalPressure =
    totalAnimals > 0
      ? Math.min(100, Math.round((totalApplications / totalAnimals) * 100))
      : 0;

  const heroHighlights = [
    {
      label: "Cobertura operacional",
      value: totalAnimals,
      description: "animais em leitura centralizada",
    },
    {
      label: "Índice de cobertura",
      value: `${coverageIndex}%`,
      description: "integração entre lotes e certificações",
    },
    {
      label: "Pressão sanitária",
      value: `${operationalPressure}%`,
      description: "aplicações com janela ativa",
    },
  ];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.20)_0%,rgba(122,168,76,0.00)_70%)]" />

            <div className="ag-badge ag-badge-green">Painel executivo</div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)] lg:text-6xl">
              Inteligência operacional e rastreabilidade auditável para a cadeia pecuária.
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              A Agraas transforma eventos operacionais, status sanitário,
              certificações e cadeia produtiva em um ativo digital confiável,
              elegante e pronto para decisão.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">
                Explorar animais
              </Link>
              <Link href="/operacoes" className="ag-button-secondary">
                Abrir operações
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {heroHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
                >
                  <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Radar da plataforma
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Top scores da base
                </h2>
              </div>

              <Link href="/scores" className="ag-button-secondary">
                Ver todos
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MetricPill
                label="Score médio"
                value={averageTopScore}
                suffix="pts"
              />
              <MetricPill
                label="Melhor score"
                value={topScores[0]?.total_score ?? 0}
                suffix="pts"
              />
              <MetricPill
                label="Cobertura"
                value={coverageIndex}
                suffix="%"
              />
            </div>

            <div className="mt-8 space-y-4">
              {topScores.length === 0 ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
                  Nenhum score encontrado.
                </div>
              ) : (
                topScores.map((animal, index) => {
                  const scoreValue = Number(animal.total_score ?? 0);
                  const scorePercent = Math.max(
                    6,
                    Math.round((scoreValue / maxScore) * 100)
                  );

                  return (
                    <Link
                      key={animal.animal_id}
                      href={`/animais/${animal.animal_id}`}
                      className="block rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)] transition hover:border-[rgba(93,156,68,0.25)] hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            Top {index + 1}
                          </p>
                          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                            {animal.internal_code ?? animal.animal_id}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {animal.current_property_name ??
                              "Propriedade não informada"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Score
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--primary-hover)]">
                            {animal.total_score ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#7aa84c_0%,#5d9c44_100%)]"
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {Array.isArray(animal.active_certifications) &&
                        animal.active_certifications.length > 0 ? (
                          animal.active_certifications.map((item) => (
                            <span key={item} className="ag-badge ag-badge-green">
                              {formatLabel(item)}
                            </span>
                          ))
                        ) : (
                          <span className="ag-badge ag-badge-dark">
                            Base ativa
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="ag-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className={getToneBadgeClass(kpi.tone)}>
                <span className="text-lg leading-none">{kpi.icon}</span>
              </div>
              <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Live
              </span>
            </div>

            <p className="mt-5 ag-kpi-label">{kpi.title}</p>
            <p className="mt-3 ag-kpi-value">{kpi.value}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {kpi.detail}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Leitura visual da operação</h2>
              <p className="ag-section-subtitle">
                Um gráfico para destacar o peso relativo dos indicadores
                principais do painel e facilitar a leitura executiva.
              </p>
            </div>

            <span className="ag-badge ag-badge-green">Resumo visual</span>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="flex h-60 items-end gap-3">
                  {chartSeries.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-1 flex-col items-center gap-3"
                    >
                      <div className="flex w-full items-end justify-center rounded-2xl bg-[rgba(93,156,68,0.08)] px-2">
                        <div
                          className="w-full rounded-t-2xl bg-[linear-gradient(180deg,#8dbc5f_0%,#5d9c44_100%)]"
                          style={{ height: `${item.height}px` }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {item.value}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <StatPanel
                  title="Base monitorada"
                  value={totalAnimals}
                  subtitle="estrutura ativa na plataforma"
                />
                <StatPanel
                  title="Certificação"
                  value={totalCertifications}
                  subtitle="ativos com status regular"
                />
                <StatPanel
                  title="Lotes"
                  value={totalLots}
                  subtitle="unidades operacionais em acompanhamento"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Radar executivo</h2>
              <p className="ag-section-subtitle">
                Sinais rápidos para orientar a leitura dos sócios sobre saúde
                operacional, rastreabilidade e qualidade da base.
              </p>
            </div>

            <span className="ag-badge ag-badge-dark">Board view</span>
          </div>

          <div className="mt-8 grid gap-4">
            <ExecutiveSignal
              label="Cobertura de rastreabilidade"
              value={traceabilityIndex}
              color="green"
              description="grau de consolidação entre base, lotes, certificações e histórico"
            />
            <ExecutiveSignal
              label="Pressão sanitária"
              value={operationalPressure}
              color="amber"
              description="quanto da base exige leitura sanitária ativa no momento"
            />
            <ExecutiveSignal
              label="Maturidade operacional"
              value={coverageIndex}
              color="blue"
              description="nível de integração entre ativos principais da plataforma"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Camadas do rebanho</h2>
              <p className="ag-section-subtitle">
                Leitura por categoria para reforçar a escalabilidade visual da plataforma.
              </p>
            </div>

            <Link href="/animais" className="ag-button-secondary">
              Abrir base
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {animalModules.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-[var(--shadow-soft)]">
                  {item.icon}
                </div>
                <p className="mt-4 text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Destaques para apresentação</h2>
              <p className="ag-section-subtitle">
                Argumentos visuais e estratégicos para mostrar aos sócios o potencial
                de produto da Agraas.
              </p>
            </div>

            <span className="ag-badge ag-badge-green">Pitch ready</span>
          </div>

          <div className="mt-8 grid gap-4">
            <HighlightCard
              title="Camada premium de software"
              description="A plataforma já tem cara de produto real, com navegação, linguagem visual e leitura executiva consistentes."
            />
            <HighlightCard
              title="Base preparada para expansão"
              description="A estrutura atual já permite crescer para analytics avançado, filtros inteligentes, dashboards por fazenda e visão por animal."
            />
            <HighlightCard
              title="Pronto para demo controlada"
              description="Com deploy seguro em ambiente online, seus sócios podem acompanhar a evolução em tempo real sem risco à operação."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Operações prioritárias</h2>
              <p className="ag-section-subtitle">
                Os fluxos principais da plataforma, organizados para acelerar a operação.
              </p>
            </div>

            <Link href="/operacoes" className="ag-button-secondary">
              Hub completo
            </Link>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-[var(--shadow-soft)]">
                    {action.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {action.label}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      ação rápida
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Últimos eventos</h2>
              <p className="ag-section-subtitle">
                Leitura rápida da trilha operacional registrada.
              </p>
            </div>

            <Link href="/historico" className="ag-button-secondary">
              Ver histórico
            </Link>
          </div>

          <div className="mt-8 space-y-4">
            {recentEvents.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Nenhum evento encontrado.
              </div>
            ) : (
              recentEvents.map((event, index) => (
                <div
                  key={`${event.animal_id}-${event.event_timestamp}-${index}`}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="ag-badge ag-badge-green">
                      {getEventIcon(event.event_type)}{" "}
                      {formatEventType(event.event_type)}
                    </span>

                    <span className="text-sm text-[var(--text-muted)]">
                      {event.event_timestamp
                        ? new Date(event.event_timestamp).toLocaleString("pt-BR")
                        : "-"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">
                    Animal: {event.animal_id}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {event.notes ?? "Sem observações detalhadas registradas."}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricPill({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}

function StatPanel({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function ExecutiveSignal({
  label,
  value,
  color,
  description,
}: {
  label: string;
  value: number;
  color: "green" | "amber" | "blue";
  description: string;
}) {
  const colorMap: Record<"green" | "amber" | "blue", string> = {
    green:
      "bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)] text-[var(--text-primary)]",
    amber:
      "bg-[linear-gradient(90deg,#e6c26d_0%,#d9a343_100%)] text-[var(--text-primary)]",
    blue:
      "bg-[linear-gradient(90deg,#8ab7f2_0%,#4a90e2_100%)] text-white",
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {value}%
          </p>
        </div>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${colorMap[color]}`}
          style={{ width: `${Math.max(4, Math.min(value, 100))}%` }}
        />
      </div>
    </div>
  );
}

function HighlightCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function buildSeries(values: number[]) {
  const labels = ["Animais", "Carência", "Cert.", "Lotes", "Abates"];
  const max = Math.max(...values, 1);

  return values.map((value, index) => ({
    label: labels[index],
    value,
    height: Math.max(24, Math.round((value / max) * 180)),
  }));
}

function getToneBadgeClass(tone: string) {
  const map: Record<string, string> = {
    green:
      "flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(93,156,68,0.12)]",
    amber:
      "flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(217,163,67,0.14)]",
    blue:
      "flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(74,144,226,0.14)]",
    purple:
      "flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(122,102,204,0.14)]",
    dark:
      "flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(31,41,55,0.10)]",
  };

  return map[tone] ?? map.green;
}

function getEventIcon(value: string) {
  const map: Record<string, string> = {
    birth: "🐣",
    rfid_assigned: "🏷️",
    health_application: "💉",
    weight_recorded: "⚖️",
    sale: "💰",
    ownership_transfer: "🔁",
    lot_entry: "📦",
    slaughter: "📋",
  };

  return map[value] ?? "•";
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    birth: "Nascimento",
    rfid_assigned: "Identificação vinculada",
    health_application: "Aplicação registrada",
    weight_recorded: "Pesagem registrada",
    sale: "Venda registrada",
    ownership_transfer: "Transferência de propriedade",
    lot_entry: "Entrada em lote",
    slaughter: "Abate registrado",
  };

  return map[value] ?? formatLabel(value);
}