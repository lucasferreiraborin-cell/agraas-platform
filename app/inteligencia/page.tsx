import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  calculateAgeInMonths,
  calculateAgraasScore,
  calculateDailyGain,
  getProductiveRiskLabel,
  getRiskBadgeClass,
} from "@/lib/agraas-analytics";

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

type PassportRow = {
  animal_id: string;
  score_json: {
    total_score?: number | null;
    sanitary_score?: number | null;
    operational_score?: number | null;
    continuity_score?: number | null;
  } | null;
};

type InsightRow = {
  animal_id: string;
  internal_code: string;
  agraas_id: string;
  breed: string;
  status: string;
  current_weight: number | null;
  previous_weight: number | null;
  current_date: string | null;
  previous_date: string | null;
  delta: number | null;
  gmd: number | null;
  age_months: number | null;
  score: number;
  risk_label: string;
};

export default async function InteligenciaPage() {
  const [
    { data: animalsData },
    { data: weightsData },
    { data: applicationsData },
    { data: eventsData },
    { data: passportsData },
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

    supabase
      .from("agraas_master_passport_cache")
      .select("animal_id, score_json"),
  ]);

  const animals = (animalsData ?? []) as AnimalRow[];
  const weights = (weightsData ?? []) as WeightRow[];
  const applications = (applicationsData ?? []) as ApplicationRow[];
  const events = (eventsData ?? []) as EventRow[];
  const passports = (passportsData ?? []) as PassportRow[];

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

  const passportMap = new Map<string, PassportRow["score_json"]>();
  for (const row of passports) {
    passportMap.set(row.animal_id, row.score_json ?? null);
  }

  const insights: InsightRow[] = animals.map((animal) => {
    const animalWeights = weightsByAnimal.get(animal.id) ?? [];
    const current = animalWeights[0];
    const previous = animalWeights[1];

    const currentWeight = current ? Number(current.weight) : null;
    const previousWeight = previous ? Number(previous.weight) : null;

    const delta =
      currentWeight !== null && previousWeight !== null
        ? Number((currentWeight - previousWeight).toFixed(1))
        : null;

    const ageMonths = calculateAgeInMonths(animal.birth_date);

    const scoreJson = passportMap.get(animal.id);

    const sanitaryScore =
      scoreJson?.sanitary_score ??
      Math.min(100, 50 + (applicationsCountByAnimal.get(animal.id) ?? 0) * 8);

    const operationalScore =
      scoreJson?.operational_score ??
      Math.min(100, 45 + (eventsCountByAnimal.get(animal.id) ?? 0) * 4);

    const continuityScore =
      scoreJson?.continuity_score ??
      Math.min(
        100,
        40 +
          Math.min(30, animalWeights.length * 8) +
          (animal.birth_date ? 15 : 0) +
          (animal.agraas_id ? 15 : 0)
      );

    const score =
      scoreJson?.total_score ??
      calculateAgraasScore({
        lastWeight: currentWeight,
        ageMonths,
        sanitaryScore,
        operationalScore,
        continuityScore,
      });

    const gmd = calculateDailyGain(
      currentWeight,
      previousWeight,
      current?.weighing_date,
      previous?.weighing_date
    );

    const riskLabel = getProductiveRiskLabel(delta, gmd);

    return {
      animal_id: animal.id,
      internal_code: animal.internal_code ?? animal.id,
      agraas_id:
        animal.agraas_id ?? `AGR-${animal.id.slice(0, 8).toUpperCase()}`,
      breed: animal.breed ?? "-",
      status: animal.status ?? "-",
      current_weight: currentWeight,
      previous_weight: previousWeight,
      current_date: current?.weighing_date ?? null,
      previous_date: previous?.weighing_date ?? null,
      delta,
      gmd,
      age_months: ageMonths,
      score: Number(score),
      risk_label: riskLabel,
    };
  });

  const topEvolution = [...insights]
    .filter((item) => item.delta !== null)
    .sort((a, b) => Number(b.delta) - Number(a.delta))
    .slice(0, 5);

  const topGmd = [...insights]
    .filter((item) => item.gmd !== null)
    .sort((a, b) => Number(b.gmd) - Number(a.gmd))
    .slice(0, 5);

  const risks = [...insights]
    .filter(
      (item) => item.risk_label === "Risco" || item.risk_label === "Atenção"
    )
    .sort((a, b) => (a.gmd ?? 0) - (b.gmd ?? 0))
    .slice(0, 6);

  const bestScore = [...insights].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Inteligência Agraas</div>

            <h1 className="ag-page-title max-w-4xl">
              Camada de inteligência da operação pecuária
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              A Agraas transforma dados operacionais do rebanho em sinais executivos:
              evolução, risco, consistência e qualidade da base.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="ag-button-primary">
                Dashboard executivo
              </Link>
              <Link href="/produtivo" className="ag-button-secondary">
                Dashboard produtivo
              </Link>
              <Link href="/scores" className="ag-button-secondary">
                Ranking de scores
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Animais com GMD"
                value={topGmd.length}
                subtitle="base já com leitura de ganho diário"
              />
              <MetricCard
                label="Riscos detectados"
                value={risks.length}
                subtitle="animais com atenção ou risco"
              />
              <MetricCard
                label="Top evolução"
                value={topEvolution.length}
                subtitle="ganho de peso destacado"
              />
              <MetricCard
                label="Base com score"
                value={bestScore.length}
                subtitle="animais com score consolidado"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <InsightCard
          title="Melhor evolução"
          subtitle="Animais com maior variação positiva entre as duas últimas pesagens."
          items={topEvolution}
          metric="delta"
        />
        <InsightCard
          title="Maior ganho diário"
          subtitle="GMD estimado com base nas duas últimas pesagens registradas."
          items={topGmd}
          metric="gmd"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="ag-card p-8">
          <div>
            <h2 className="ag-section-title">Riscos produtivos</h2>
            <p className="ag-section-subtitle">
              Animais com sinais de atenção ou risco na leitura produtiva.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {risks.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Nenhum risco relevante detectado.
              </div>
            ) : (
              risks.map((item) => (
                <Link
                  key={item.animal_id}
                  href={`/animais/${item.animal_id}`}
                  className="block rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {item.internal_code}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {item.agraas_id}
                      </p>
                    </div>
                    <span className={getRiskBadgeClass(item.risk_label)}>
                      {item.risk_label}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniInfo
                      label="Peso atual"
                      value={
                        item.current_weight ? `${item.current_weight} kg` : "-"
                      }
                    />
                    <MiniInfo
                      label="Variação"
                      value={
                        item.delta !== null
                          ? `${item.delta > 0 ? "+" : ""}${item.delta} kg`
                          : "-"
                      }
                    />
                    <MiniInfo
                      label="GMD"
                      value={item.gmd !== null ? `${item.gmd} kg/dia` : "-"}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="ag-card p-8">
          <div>
            <h2 className="ag-section-title">Base mais confiável</h2>
            <p className="ag-section-subtitle">
              Animais com maior score consolidado na leitura atual.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {bestScore.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
                Nenhum animal encontrado.
              </div>
            ) : (
              bestScore.map((item, index) => (
                <Link
                  key={item.animal_id}
                  href={`/animais/${item.animal_id}`}
                  className="block rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 transition hover:border-[rgba(93,156,68,0.24)] hover:bg-[var(--primary-soft)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Posição {index + 1}
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
      </section>
    </main>
  );
}

function InsightCard({
  title,
  subtitle,
  items,
  metric,
}: {
  title: string;
  subtitle: string;
  items: InsightRow[];
  metric: "delta" | "gmd";
}) {
  return (
    <div className="ag-card p-8">
      <div>
        <h2 className="ag-section-title">{title}</h2>
        <p className="ag-section-subtitle">{subtitle}</p>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
            Ainda não há base suficiente.
          </div>
        ) : (
          items.map((item) => (
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
                  {metric === "delta"
                    ? item.delta !== null
                      ? `${item.delta > 0 ? "+" : ""}${item.delta} kg`
                      : "-"
                    : item.gmd !== null
                    ? `${item.gmd} kg/dia`
                    : "-"}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
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
    <div className="ag-kpi-card">
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

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}