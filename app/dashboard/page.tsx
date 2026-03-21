import { supabase } from "@/lib/supabase";
import Link from "next/link";

type AnimalRow = {
  id: string;
  internal_code: string | null;
  agraas_id: string | null;
  birth_date: string | null;
  breed: string | null;
  status: string | null;
};

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
};

type ApplicationRow = {
  animal_id: string;
};

type EventRow = {
  animal_id: string | null;
};

type DashboardAnimalRow = {
  animal_id: string;
  internal_code: string;
  agraas_id: string;
  breed: string;
  status: string;
  current_weight: number | null;
  previous_weight: number | null;
  delta: number | null;
  age_months: number | null;
  score: number;
};

export default async function DashboardPage() {
  const [
    { data: animalsData, error: animalsError },
    { data: weightsData, error: weightsError },
    { data: applicationsData, error: applicationsError },
    { data: eventsData, error: eventsError },
  ] = await Promise.all([
    supabase
      .from("animals")
      .select("id, internal_code, agraas_id, birth_date, breed, status")
      .order("internal_code", { ascending: true }),

    supabase
      .from("weights")
      .select("id, animal_id, weight, weighing_date")
      .order("weighing_date", { ascending: false }),

    supabase.from("applications").select("animal_id"),

    supabase.from("events").select("animal_id"),
  ]);

  if (animalsError) console.error("Erro ao buscar animais:", animalsError);
  if (weightsError) console.error("Erro ao buscar pesos:", weightsError);
  if (applicationsError) console.error("Erro ao buscar aplicações:", applicationsError);
  if (eventsError) console.error("Erro ao buscar eventos:", eventsError);

  const animals = (animalsData ?? []) as AnimalRow[];
  const weights = (weightsData ?? []) as WeightRow[];
  const applications = (applicationsData ?? []) as ApplicationRow[];
  const events = (eventsData ?? []) as EventRow[];

  const weightsByAnimal = new Map<string, WeightRow[]>();
  for (const row of weights) {
    const list = weightsByAnimal.get(row.animal_id) ?? [];
    list.push(row);
    weightsByAnimal.set(row.animal_id, list);
  }

  const applicationsCountByAnimal = new Map<string, number>();
  for (const row of applications) {
    applicationsCountByAnimal.set(
      row.animal_id,
      (applicationsCountByAnimal.get(row.animal_id) ?? 0) + 1
    );
  }

  const eventsCountByAnimal = new Map<string, number>();
  for (const row of events) {
    if (!row.animal_id) continue;
    eventsCountByAnimal.set(
      row.animal_id,
      (eventsCountByAnimal.get(row.animal_id) ?? 0) + 1
    );
  }

  const dashboardRows: DashboardAnimalRow[] = animals.map((animal) => {
    const animalWeights = weightsByAnimal.get(animal.id) ?? [];
    const currentWeight =
      animalWeights.length > 0 ? Number(animalWeights[0].weight) : null;
    const previousWeight =
      animalWeights.length > 1 ? Number(animalWeights[1].weight) : null;

    const delta =
      currentWeight !== null && previousWeight !== null
        ? currentWeight - previousWeight
        : null;

    const ageMonths = animal.birth_date
      ? calculateAgeInMonths(animal.birth_date)
      : null;

    const sanitaryScore = Math.min(
      100,
      50 + (applicationsCountByAnimal.get(animal.id) ?? 0) * 8
    );

    const operationalScore = Math.min(
      100,
      45 + (eventsCountByAnimal.get(animal.id) ?? 0) * 4
    );

    let continuityScore = 40;
    continuityScore += Math.min(30, animalWeights.length * 8);
    if (animal.birth_date) continuityScore += 15;
    if (animal.agraas_id) continuityScore += 15;
    continuityScore = Math.min(100, continuityScore);

    const score = calculateAgraasScore({
      lastWeight: currentWeight,
      ageMonths,
      sanitaryScore,
      operationalScore,
      continuityScore,
    });

    return {
      animal_id: animal.id,
      internal_code: animal.internal_code ?? animal.id,
      agraas_id:
        animal.agraas_id ?? `AGR-${animal.id.substring(0, 8).toUpperCase()}`,
      breed: animal.breed ?? "-",
      status: animal.status ?? "-",
      current_weight: currentWeight,
      previous_weight: previousWeight,
      delta,
      age_months: ageMonths,
      score,
    };
  });

  const totalAnimals = dashboardRows.length;

  const averageScore =
    totalAnimals > 0
      ? dashboardRows.reduce((acc, item) => acc + item.score, 0) / totalAnimals
      : 0;

  const validWeights = dashboardRows
    .map((item) => item.current_weight)
    .filter((value): value is number => value !== null);

  const averageWeight =
    validWeights.length > 0
      ? validWeights.reduce((acc, value) => acc + value, 0) / validWeights.length
      : 0;

  const positiveDeltaCount = dashboardRows.filter(
    (item) => item.delta !== null && item.delta > 0
  ).length;

  const alertsCount = dashboardRows.filter(
    (item) => item.delta !== null && item.delta < 0
  ).length;

  const agraasIdCount = dashboardRows.filter((item) => Boolean(item.agraas_id)).length;

  const topScoreAnimals = [...dashboardRows]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const topDeltaAnimals = [...dashboardRows]
    .filter((item) => item.delta !== null)
    .sort((a, b) => Number(b.delta) - Number(a.delta))
    .slice(0, 5);

  const platformCards = [
    {
      title: "Identidade digital",
      subtitle:
        "Agraas ID estrutura a base animal e cria uma camada única de referência para o rebanho.",
    },
    {
      title: "Leitura produtiva",
      subtitle:
        "Peso, evolução, idade e score consolidam a visão executiva da operação pecuária.",
    },
    {
      title: "Confiança operacional",
      subtitle:
        "Sanidade, continuidade e eventos estruturam uma base pronta para rastreabilidade e certificação.",
    },
    {
      title: "Infraestrutura de dados",
      subtitle:
        "A Agraas organiza a cadeia pecuária em uma lógica de dados, identidade e inteligência.",
    },
  ];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Dashboard executivo</div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)] lg:text-6xl">
              Inteligência executiva do rebanho
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              Visualize a base animal sob a ótica de identidade digital,
              produtividade, evolução de peso e confiança operacional em uma
              camada única de dados da cadeia pecuária.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais" className="ag-button-primary">
                Abrir animais
              </Link>
              <Link href="/scores" className="ag-button-secondary">
                Ver scores
              </Link>
              <Link href="/produtivo" className="ag-button-secondary">
                Dashboard produtivo
              </Link>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Animais monitorados"
                value={totalAnimals}
                subtitle="ativos estruturados na base"
              />
              <MetricCard
                label="Agraas IDs"
                value={agraasIdCount}
                subtitle="identidades digitais emitidas"
              />
              <MetricCard
                label="Score médio"
                value={averageScore > 0 ? averageScore.toFixed(1) : "-"}
                subtitle="média consolidada da operação"
              />
              <MetricCard
                label="Peso médio"
                value={averageWeight > 0 ? `${averageWeight.toFixed(1)} kg` : "-"}
                subtitle="última pesagem disponível"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {platformCards.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]"
          >
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {item.title}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {item.subtitle}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <KpiCard
          label="Base monitorada"
          value={totalAnimals}
          icon="🐂"
          subtitle="animais presentes no dashboard"
        />
        <KpiCard
          label="Score médio"
          value={averageScore > 0 ? averageScore.toFixed(1) : "-"}
          icon="📈"
          subtitle="nível médio de confiança da base"
        />
        <KpiCard
          label="Peso médio"
          value={averageWeight > 0 ? `${averageWeight.toFixed(1)} kg` : "-"}
          icon="⚖️"
          subtitle="média da última pesagem"
        />
        <KpiCard
          label="Evolução positiva"
          value={positiveDeltaCount}
          icon="📊"
          subtitle="ganho entre últimas pesagens"
        />
        <KpiCard
          label="Alertas produtivos"
          value={alertsCount}
          icon="⚠️"
          subtitle="queda detectada entre leituras"
        />
      </section>

      <section className="ag-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Como ler este dashboard</h2>
            <p className="ag-section-subtitle">
              A Agraas transforma dados operacionais em uma visão executiva simples para gestão e tomada de decisão.
            </p>
          </div>
          <span className="ag-badge ag-badge-green">Data layer</span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FlowCard
            number="1"
            title="Identidade"
            description="Cada animal recebe uma identidade digital única via Agraas ID."
          />
          <FlowCard
            number="2"
            title="Registro"
            description="Pesagens, aplicações e eventos alimentam continuamente a base."
          />
          <FlowCard
            number="3"
            title="Leitura"
            description="A plataforma calcula score, evolução e sinais de consistência operacional."
          />
          <FlowCard
            number="4"
            title="Decisão"
            description="A gestão passa a operar com inteligência sobre o rebanho e a cadeia."
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Top score</h2>
              <p className="ag-section-subtitle">
                Animais com maior score Agraas na leitura atual.
              </p>
            </div>
            <Link href="/scores" className="ag-button-secondary">
              Ver ranking
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {topScoreAnimals.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Nenhum animal encontrado.
              </div>
            ) : (
              topScoreAnimals.map((item, index) => (
                <Link
                  key={item.animal_id}
                  href={`/animais/${item.animal_id}`}
                  className="block rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Top {index + 1}
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                        {item.internal_code}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {item.agraas_id}
                      </p>
                    </div>

                    <span className="ag-badge ag-badge-green">
                      {item.score} pts
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Top evolução</h2>
              <p className="ag-section-subtitle">
                Animais com maior ganho entre as duas últimas pesagens.
              </p>
            </div>
            <Link href="/produtivo" className="ag-button-secondary">
              Ver produtivo
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {topDeltaAnimals.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Ainda não há pesagens suficientes.
              </div>
            ) : (
              topDeltaAnimals.map((item) => (
                <Link
                  key={item.animal_id}
                  href={`/animais/${item.animal_id}`}
                  className="block rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {item.internal_code}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {item.agraas_id}
                      </p>
                    </div>

                    <span className="ag-badge ag-badge-green">
                      {item.delta !== null
                        ? item.delta >= 0
                          ? `+${item.delta.toFixed(1)} kg`
                          : `${item.delta.toFixed(1)} kg`
                        : "-"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="ag-section-title">Tabela executiva</h2>
            <p className="ag-section-subtitle">
              Visão consolidada da base com identidade, peso, idade e score.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          {dashboardRows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum dado encontrado.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Agraas ID</th>
                  <th>Raça</th>
                  <th>Peso atual</th>
                  <th>Variação</th>
                  <th>Idade</th>
                  <th>Score</th>
                </tr>
              </thead>

              <tbody>
                {dashboardRows
                  .sort((a, b) => b.score - a.score)
                  .map((item) => (
                    <tr key={item.animal_id}>
                      <td>
                        <Link
                          href={`/animais/${item.animal_id}`}
                          className="text-[var(--primary-hover)] hover:underline"
                        >
                          {item.internal_code}
                        </Link>
                      </td>
                      <td>{item.agraas_id}</td>
                      <td>{item.breed}</td>
                      <td>{item.current_weight ? `${item.current_weight} kg` : "-"}</td>
                      <td>
                        {item.delta !== null
                          ? item.delta >= 0
                            ? `+${item.delta.toFixed(1)} kg`
                            : `${item.delta.toFixed(1)} kg`
                          : "-"}
                      </td>
                      <td>{item.age_months !== null ? `${item.age_months} meses` : "-"}</td>
                      <td>{item.score}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
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

function FlowCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold shadow-[var(--shadow-soft)]">
        {number}
      </div>
      <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function calculateAgeInMonths(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function calculateAgraasScore({
  lastWeight,
  ageMonths,
  sanitaryScore,
  operationalScore,
  continuityScore,
}: {
  lastWeight: number | null;
  ageMonths: number | null;
  sanitaryScore: number;
  operationalScore: number;
  continuityScore: number;
}) {
  const productive =
    lastWeight && lastWeight > 0
      ? Math.min(100, 35 + Math.round(lastWeight / 10))
      : 35;

  const ageFactor =
    ageMonths !== null ? Math.min(100, 40 + Math.round(ageMonths / 2)) : 50;

  return Math.min(
    100,
    Math.round(
      productive * 0.30 +
        sanitaryScore * 0.24 +
        operationalScore * 0.18 +
        continuityScore * 0.18 +
        ageFactor * 0.10
    )
  );
}