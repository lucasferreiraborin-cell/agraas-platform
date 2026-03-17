import { supabase } from "@/lib/supabase";
import Link from "next/link";

type PassportCacheRow = {
  animal_id: string;
  identity_json: {
    internal_code?: string | null;
    sex?: string | null;
    breed?: string | null;
    status?: string | null;
  } | null;
  score_json: {
    sanitary_score?: number | null;
    operational_score?: number | null;
    continuity_score?: number | null;
    total_score?: number | null;
  } | null;
  health_json: {
    applications?: number | null;
    active_withdrawal?: number | null;
    last_weight?: number | null;
  } | null;
  certifications_json:
    | {
        certification_code?: string | null;
        certification_name?: string | null;
        status?: string | null;
        issued_at?: string | null;
      }[]
    | null;
  ownership_json: {
    current_property_id?: string | null;
    status?: string | null;
  } | null;
  last_generated_at?: string | null;
};

type MarketRow = {
  animal_id: string;
  internal_code: string | null;
  property_name: string | null;
  last_weight: number | null;
  total_score: number | null;
  status: string | null;
  certifications:
    | {
        code: string;
        name: string;
      }[]
    | null;
};

type EventRow = {
  animal_id: string | null;
  type: string | null;
  description: string | null;
  event_date: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id?: string | null;
  birth_date?: string | null;
};

export default async function PainelPage() {
  const [
    { data: passportsData, error: passportsError },
    { count: applicationsCount },
    { count: certificationsCount },
    { count: propertiesCount },
    { data: marketData },
    { data: eventsData },
    { data: animalsData },
  ] = await Promise.all([
    supabase.from("agraas_master_passport_cache").select("*"),

    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .gte("application_date", "2000-01-01"),

    supabase
      .from("animal_certifications")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("properties")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("agraas_market_animals")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(6),

    supabase
      .from("farm_events")
      .select("animal_id, type, description, event_date")
      .order("event_date", { ascending: false })
      .limit(8),

    supabase
      .from("animals")
      .select("id, internal_code, agraas_id, birth_date"),
  ]);

  const passports = (passportsData as PassportCacheRow[] | null) ?? [];
  const marketRows = (marketData as MarketRow[] | null) ?? [];
  const recentEvents = (eventsData as EventRow[] | null) ?? [];
  const animals = (animalsData as AnimalRow[] | null) ?? [];

  const animalMap = new Map<string, string>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal.internal_code ?? animal.id);
  }

  const totalAnimals = passports.length;
  const totalApplications = applicationsCount ?? 0;
  const totalCertifications = certificationsCount ?? 0;
  const totalProperties = propertiesCount ?? 0;

  const animalsWithAgraasId = animals.filter((animal) => Boolean(animal.agraas_id)).length;
  const animalsWithBirthDate = animals.filter((animal) => Boolean(animal.birth_date)).length;

  const totalScoreAverage =
    totalAnimals > 0
      ? Math.round(
          passports.reduce(
            (acc, item) => acc + Number(item.score_json?.total_score ?? 0),
            0
          ) / totalAnimals
        )
      : 0;

  const sanitaryAverage =
    totalAnimals > 0
      ? Math.round(
          passports.reduce(
            (acc, item) => acc + Number(item.score_json?.sanitary_score ?? 0),
            0
          ) / totalAnimals
        )
      : 0;

  const operationalAverage =
    totalAnimals > 0
      ? Math.round(
          passports.reduce(
            (acc, item) => acc + Number(item.score_json?.operational_score ?? 0),
            0
          ) / totalAnimals
        )
      : 0;

  const continuityAverage =
    totalAnimals > 0
      ? Math.round(
          passports.reduce(
            (acc, item) => acc + Number(item.score_json?.continuity_score ?? 0),
            0
          ) / totalAnimals
        )
      : 0;

  const totalCertifiedAnimals = passports.filter(
    (item) =>
      Array.isArray(item.certifications_json) &&
      item.certifications_json.length > 0
  ).length;

  const animalsWithWithdrawal = passports.filter(
    (item) => Number(item.health_json?.active_withdrawal ?? 0) > 0
  ).length;

  const activeAnimals = passports.filter((item) => {
    const status = (
      item.ownership_json?.status ??
      item.identity_json?.status ??
      ""
    ).toLowerCase();
    return status === "active";
  }).length;

  const topAnimals = passports
    .map((item) => ({
      animal_id: item.animal_id,
      internal_code: item.identity_json?.internal_code ?? item.animal_id,
      total_score: Number(item.score_json?.total_score ?? 0),
      sanitary_score: Number(item.score_json?.sanitary_score ?? 0),
      operational_score: Number(item.score_json?.operational_score ?? 0),
      continuity_score: Number(item.score_json?.continuity_score ?? 0),
      status:
        item.ownership_json?.status ??
        item.identity_json?.status ??
        "-",
      certifications_count: Array.isArray(item.certifications_json)
        ? item.certifications_json.length
        : 0,
      last_weight: item.health_json?.last_weight ?? null,
    }))
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 5);

  const heroHighlights = [
    {
      label: "Animais monitorados",
      value: totalAnimals,
      description: "ativos no passaporte vivo da Agraas",
    },
    {
      label: "Score médio",
      value: `${totalScoreAverage}`,
      description: "qualidade consolidada do rebanho",
    },
    {
      label: "Agraas IDs",
      value: animalsWithAgraasId,
      description: "identidades digitais já emitidas",
    },
  ];

  const boardSignals = [
    {
      label: "Cobertura de rastreabilidade",
      value: totalAnimals > 0 ? Math.round((activeAnimals / totalAnimals) * 100) : 0,
      description: "participação de animais ativos na base monitorada",
      tone: "green" as const,
    },
    {
      label: "Cobertura de identidade",
      value: animals.length > 0 ? Math.round((animalsWithAgraasId / animals.length) * 100) : 0,
      description: "animais com Agraas ID emitido",
      tone: "blue" as const,
    },
    {
      label: "Cobertura de nascimento",
      value: animals.length > 0 ? Math.round((animalsWithBirthDate / animals.length) * 100) : 0,
      description: "animais com data de nascimento estruturada",
      tone: "amber" as const,
    },
  ];

  const chartSeries = buildSeries([
    totalAnimals,
    totalApplications,
    totalCertifications,
    totalProperties,
    totalCertifiedAnimals,
  ]);

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.20)_0%,rgba(122,168,76,0.00)_70%)]" />

            <div className="ag-badge ag-badge-green">Painel executivo</div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)] lg:text-6xl">
              A Agraas já opera como ERP pecuário e evolui para infraestrutura de dados da cadeia.
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              Identidade digital do animal, score, certificações, histórico auditável e
              leitura produtiva em uma camada única de software pronta para operação,
              board, rastreabilidade e expansão da cadeia pecuária.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">
                Explorar animais
              </Link>
              <Link href="/produtivo" className="ag-button-secondary">
                Dashboard produtivo
              </Link>
              <Link href="/eventos" className="ag-button-secondary">
                Timeline da cadeia
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
                  Top ativos do rebanho
                </h2>
              </div>

              <Link href="/scores" className="ag-button-secondary">
                Ver ranking
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MetricPill label="Médio total" value={totalScoreAverage} suffix="pts" />
              <MetricPill label="Sanitário" value={sanitaryAverage} suffix="pts" />
              <MetricPill label="Operacional" value={operationalAverage} suffix="pts" />
            </div>

            <div className="mt-8 space-y-4">
              {passportsError ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-[var(--danger)] shadow-[var(--shadow-soft)]">
                  Erro ao carregar a base executiva.
                </div>
              ) : topAnimals.length === 0 ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
                  Nenhum animal encontrado.
                </div>
              ) : (
                topAnimals.map((animal, index) => {
                  const scorePercent = Math.max(
                    6,
                    Math.round(Math.min(100, animal.total_score))
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
                            {animal.internal_code}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {formatStatus(animal.status)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Score
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--primary-hover)]">
                            {animal.total_score}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="ag-badge ag-badge-green">
                          Certificações: {animal.certifications_count}
                        </span>
                        <span className="ag-badge ag-badge-dark">
                          Peso: {animal.last_weight ?? "-"} kg
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-6">
        <KpiCard
          label="Animais ativos"
          value={activeAnimals}
          icon="🐂"
          subtitle="base animal com status operacional ativo"
        />
        <KpiCard
          label="Agraas IDs"
          value={animalsWithAgraasId}
          icon="🪪"
          subtitle="identidade digital emitida"
        />
        <KpiCard
          label="Aplicações"
          value={totalApplications}
          icon="💉"
          subtitle="registros sanitários realizados"
        />
        <KpiCard
          label="Certificações"
          value={totalCertifications}
          icon="✅"
          subtitle="chancelas registradas no ambiente"
        />
        <KpiCard
          label="Propriedades"
          value={totalProperties}
          icon="📍"
          subtitle="unidades operacionais mapeadas"
        />
        <KpiCard
          label="Score médio"
          value={totalScoreAverage}
          icon="📈"
          subtitle="confiança média consolidada da base"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Leitura visual da operação</h2>
              <p className="ag-section-subtitle">
                Resumo executivo dos blocos principais da plataforma para leitura rápida de board.
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
                  title="Score sanitário médio"
                  value={sanitaryAverage}
                  subtitle="média da confiança sanitária da base"
                />
                <StatPanel
                  title="Score operacional médio"
                  value={operationalAverage}
                  subtitle="qualidade operacional consolidada"
                />
                <StatPanel
                  title="Score continuidade"
                  value={continuityAverage}
                  subtitle="consistência e integridade histórica"
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
                Sinais rápidos para orientar leitura de confiança, risco e maturidade da base.
              </p>
            </div>

            <span className="ag-badge ag-badge-dark">Board view</span>
          </div>

          <div className="mt-8 grid gap-4">
            {boardSignals.map((signal) => (
              <ExecutiveSignal
                key={signal.label}
                label={signal.label}
                value={signal.value}
                color={signal.tone}
                description={signal.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Infraestrutura da cadeia</h2>
              <p className="ag-section-subtitle">
                A Agraas conecta operação, identidade animal, score, histórico e rastreabilidade.
              </p>
            </div>

            <span className="ag-badge ag-badge-dark">Core thesis</span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <FrameworkCard
              title="ERP Pecuário"
              subtitle="cadastro, pesagens, aplicações, custos, movimentações e lotes"
            />
            <FrameworkCard
              title="Identidade Animal"
              subtitle="Agraas ID como camada de identidade digital do rebanho"
            />
            <FrameworkCard
              title="Passaporte Digital"
              subtitle="timeline, sanitário, peso, cadeia produtiva e score consolidado"
            />
            <FrameworkCard
              title="Inteligência da Cadeia"
              subtitle="base para certificação, rastreabilidade e leitura de mercado"
            />
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Últimos eventos</h2>
              <p className="ag-section-subtitle">
                Leitura rápida da trilha operacional registrada na base.
              </p>
            </div>

            <Link href="/eventos" className="ag-button-secondary">
              Ver timeline
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
                  key={`${event.animal_id}-${event.event_date}-${index}`}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="ag-badge ag-badge-green">
                      {getEventIcon(event.type ?? "")}{" "}
                      {formatEventType(event.type ?? "")}
                    </span>

                    <span className="text-sm text-[var(--text-muted)]">
                      {event.event_date
                        ? new Date(event.event_date).toLocaleString("pt-BR")
                        : "-"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">
                    Animal:{" "}
                    {event.animal_id
                      ? animalMap.get(event.animal_id) ?? event.animal_id
                      : "-"}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {event.description ?? "Sem observações detalhadas registradas."}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Market intelligence</h2>
              <p className="ag-section-subtitle">
                Visão dos ativos mais fortes no market com leitura comercial imediata.
              </p>
            </div>

            <Link href="/market" className="ag-button-secondary">
              Abrir market
            </Link>
          </div>

          <div className="mt-8 grid gap-4">
            {marketRows.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Nenhum ativo disponível no market.
              </div>
            ) : (
              marketRows.slice(0, 4).map((animal) => (
                <Link
                  key={animal.animal_id}
                  href={`/animais/${animal.animal_id}`}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                        {animal.internal_code ?? animal.animal_id}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {animal.property_name ?? "Propriedade não informada"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        Score
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--primary-hover)]">
                        {animal.total_score ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="ag-badge ag-badge-green">
                      Peso: {animal.last_weight ?? "-"} kg
                    </span>
                    <span className="ag-badge ag-badge-dark">
                      {formatStatus(animal.status)}
                    </span>
                    <span className="ag-badge ag-badge-dark">
                      Certificações: {Array.isArray(animal.certifications) ? animal.certifications.length : 0}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Atalhos para demo</h2>
              <p className="ag-section-subtitle">
                Fluxo recomendado para apresentação da plataforma aos sócios.
              </p>
            </div>

            <span className="ag-badge ag-badge-green">Demo flow</span>
          </div>

          <div className="mt-8 grid gap-4">
            <DemoStep
              number="1"
              title="Animais"
              description="mostre a base animal com Agraas ID e o posicionamento de identidade digital."
              href="/animais"
            />
            <DemoStep
              number="2"
              title="Passaporte"
              description="abra um animal e mostre score, timeline, sanitário, pesagens e cadeia produtiva."
              href="/animais"
            />
            <DemoStep
              number="3"
              title="Dashboard produtivo"
              description="mostre ranking por score, evolução de peso e inteligência produtiva."
              href="/produtivo"
            />
            <DemoStep
              number="4"
              title="Timeline da cadeia"
              description="mostre os últimos eventos e a lógica de rastreabilidade operacional."
              href="/eventos"
            />
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

function KpiCard({
  label,
  value,
  icon,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: string;
  subtitle: string;
}) {
  return (
    <div className="ag-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl shadow-[var(--shadow-soft)]">
          {icon}
        </div>
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Live
        </span>
      </div>

      <p className="mt-5 ag-kpi-label">{label}</p>
      <p className="mt-3 ag-kpi-value">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function FrameworkCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function DemoStep({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold shadow-[var(--shadow-soft)]">
          {number}
        </div>
        <div>
          <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function buildSeries(values: number[]) {
  const labels = ["Animais", "Aplic.", "Certif.", "Fazendas", "Chancelados"];
  const max = Math.max(...values, 1);

  return values.map((value, index) => ({
    label: labels[index],
    value,
    height: Math.max(24, Math.round((value / max) * 180)),
  }));
}

function formatStatus(value: string | null) {
  if (!value) return "-";

  const map: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente",
    blocked: "Bloqueado",
    archived: "Arquivado",
    sold: "Vendido",
    slaughtered: "Abatido",
    ACTIVE: "Ativo",
  };

  return map[value] ?? map[value.toLowerCase()] ?? value;
}

function formatEventType(value: string) {
  const map: Record<string, string> = {
    BIRTH: "Nascimento",
    RFID_LINKED: "RFID vinculado",
    WEIGHT_RECORDED: "Pesagem registrada",
    HEALTH_APPLICATION: "Aplicação sanitária",
    LOT_ENTRY: "Entrada em lote",
    OWNERSHIP_TRANSFER: "Transferência",
    SALE: "Venda",
    SLAUGHTER: "Abate",
    CERTIFICATION: "Certificação",
    birth: "Nascimento",
    rfid_assigned: "Identificação vinculada",
    health_application: "Aplicação registrada",
    weight_recorded: "Pesagem registrada",
    sale: "Venda registrada",
    ownership_transfer: "Transferência de propriedade",
    lot_entry: "Entrada em lote",
    slaughter: "Abate registrado",
    weighing: "Pesagem",
    application: "Aplicação sanitária",
  };

  return map[value] ?? value.replaceAll("_", " ");
}

function getEventIcon(value: string) {
  const map: Record<string, string> = {
    BIRTH: "🐣",
    RFID_LINKED: "🏷️",
    WEIGHT_RECORDED: "⚖️",
    HEALTH_APPLICATION: "💉",
    LOT_ENTRY: "📦",
    OWNERSHIP_TRANSFER: "🔁",
    SALE: "💰",
    SLAUGHTER: "📋",
    CERTIFICATION: "✅",
    birth: "🐣",
    rfid_assigned: "🏷️",
    health_application: "💉",
    weight_recorded: "⚖️",
    sale: "💰",
    ownership_transfer: "🔁",
    lot_entry: "📦",
    slaughter: "📋",
    weighing: "⚖️",
    application: "💉",
  };

  return map[value] ?? "•";
}