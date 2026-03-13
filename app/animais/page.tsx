import { supabase } from "@/lib/supabase";
import Link from "next/link";

type AnimalRow = {
  id: string;
  internal_code: string | null;
  sex: string | null;
  breed: string | null;
  status: string | null;
};

type ScoreRow = {
  animal_id: string;
  total_score: number | null;
};

export default async function AnimaisPage() {
  const [{ data: animais, error }, { data: scores }] = await Promise.all([
    supabase
      .from("animals")
      .select("id, internal_code, sex, breed, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("agraas_master_passport")
      .select("animal_id, total_score"),
  ]);

  const rows: AnimalRow[] = animais ?? [];
  const scoreMap = new Map<string, number | null>();

  (scores as ScoreRow[] | null)?.forEach((item) => {
    scoreMap.set(item.animal_id, item.total_score ?? null);
  });

  const scoredAnimals = rows.filter((animal) => {
    const score = scoreMap.get(animal.id);
    return typeof score === "number";
  });

  const averageScore =
    scoredAnimals.length > 0
      ? Math.round(
          scoredAnimals.reduce((acc, animal) => {
            return acc + Number(scoreMap.get(animal.id) ?? 0);
          }, 0) / scoredAnimals.length
        )
      : 0;

  const activeCount = rows.filter(
    (animal) => (animal.status ?? "").toLowerCase() === "active"
  ).length;

  const femaleCount = rows.filter(
    (animal) => (animal.sex ?? "").toLowerCase() === "female"
  ).length;

  const maleCount = rows.filter(
    (animal) => (animal.sex ?? "").toLowerCase() === "male"
  ).length;

  const breedsCount = new Set(
    rows.map((animal) => animal.breed).filter(Boolean)
  ).size;

  const topScore =
    scoredAnimals.length > 0
      ? Math.max(...scoredAnimals.map((animal) => Number(scoreMap.get(animal.id) ?? 0)))
      : 0;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(93,156,68,0.18)_0%,rgba(93,156,68,0)_72%)]" />

            <div className="ag-badge ag-badge-green">Base animal</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Passaportes vivos da operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Consulte os animais registrados, acompanhe a qualidade da base e
              navegue para passaportes com score, cadeia produtiva e histórico
              auditável em uma interface pronta para apresentação.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/animais/novo" className="ag-button-primary">
                Novo animal
              </Link>

              <Link href="/scores" className="ag-button-secondary">
                Ver ranking
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Animais registrados"
                value={rows.length}
                subtitle="base consolidada"
              />
              <HeroMetric
                label="Score médio"
                value={averageScore}
                subtitle="qualidade média do rebanho"
              />
              <HeroMetric
                label="Raças mapeadas"
                value={breedsCount}
                subtitle="diversidade da operação"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Radar da base
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Leitura executiva do rebanho
                </h2>
              </div>

              <span className="ag-badge ag-badge-dark">Live view</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <SnapshotCard label="Ativos" value={String(activeCount)} />
              <SnapshotCard label="Machos" value={String(maleCount)} />
              <SnapshotCard label="Fêmeas" value={String(femaleCount)} />
              <SnapshotCard label="Top score" value={String(topScore)} />
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-sm text-[var(--text-muted)]">
                Visão da plataforma
              </p>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                Esta página mostra a base animal com leitura rápida de status,
                score e rastreabilidade, servindo como porta de entrada para o
                passaporte individual de cada ativo da operação.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          label="Base total"
          value={rows.length}
          icon="🐂"
          subtitle="animais cadastrados"
        />
        <KpiCard
          label="Score médio"
          value={averageScore}
          icon="📈"
          subtitle="qualidade média da base"
        />
        <KpiCard
          label="Ativos"
          value={activeCount}
          icon="✅"
          subtitle="status operacional vigente"
        />
        <KpiCard
          label="Raças"
          value={breedsCount}
          icon="🧬"
          subtitle="categorias identificadas"
        />
      </section>

      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ag-section-title">Animais registrados</h2>
            <p className="ag-section-subtitle">
              Visão operacional da base pecuária com leitura premium de score,
              status e navegação para o passaporte individual.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">{rows.length} registros</div>
        </div>

        <div className="mt-8">
          {error ? (
            <p className="text-sm text-[var(--danger)]">
              Erro ao carregar animais.
            </p>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum animal encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Sexo</th>
                    <th>Raça</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((animal) => {
                    const score = scoreMap.get(animal.id);
                    const scoreValue = typeof score === "number" ? score : null;
                    const scorePercent =
                      scoreValue !== null
                        ? Math.max(6, Math.min(100, Math.round(scoreValue)))
                        : 0;

                    return (
                      <tr key={animal.id}>
                        <td>
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl shadow-[var(--shadow-soft)]">
                              {getAnimalAvatar(animal.sex)}
                            </div>

                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">
                                {animal.internal_code ?? animal.id}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                ID: {animal.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {formatSex(animal.sex)}
                          </span>
                        </td>

                        <td>
                          <span className="text-sm text-[var(--text-secondary)]">
                            {animal.breed ?? "-"}
                          </span>
                        </td>

                        <td>
                          <span className={getStatusBadgeClass(animal.status)}>
                            {formatStatus(animal.status)}
                          </span>
                        </td>

                        <td>
                          {scoreValue !== null ? (
                            <div className="min-w-[180px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-[var(--primary-hover)]">
                                  {scoreValue}
                                </span>
                                <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                  score
                                </span>
                              </div>

                              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(93,156,68,0.10)]">
                                <div
                                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f_0%,#5d9c44_100%)]"
                                  style={{ width: `${scorePercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--text-muted)]">
                              -
                            </span>
                          )}
                        </td>

                        <td>
                          <Link
                            href={`/animais/${animal.id}`}
                            className="inline-flex items-center rounded-2xl border border-[rgba(93,156,68,0.24)] px-4 py-2 text-sm font-medium text-[var(--primary-hover)] transition hover:bg-[var(--primary-soft)]"
                          >
                            Ver passaporte
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
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

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
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

function getAnimalAvatar(sex: string | null) {
  const value = (sex ?? "").toLowerCase();

  if (value === "male" || value === "macho") return "🐂";
  if (value === "female" || value === "fêmea" || value === "femea") return "🐄";
  return "🐾";
}

function formatSex(value: string | null) {
  const map: Record<string, string> = {
    male: "Macho",
    female: "Fêmea",
    macho: "Macho",
    femea: "Fêmea",
    "fêmea": "Fêmea",
  };

  if (!value) return "-";
  return map[value.toLowerCase()] ?? value;
}

function formatStatus(value: string | null) {
  if (!value) return "-";

  const map: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente",
    blocked: "Bloqueado",
    archived: "Arquivado",
  };

  return map[value.toLowerCase()] ?? value;
}

function getStatusBadgeClass(value: string | null) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "active") {
    return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
  }

  if (normalized === "inactive" || normalized === "archived") {
    return "inline-flex rounded-full bg-[rgba(31,41,55,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]";
  }

  if (normalized === "pending") {
    return "inline-flex rounded-full bg-[rgba(217,163,67,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--warning)]";
  }

  if (normalized === "blocked") {
    return "inline-flex rounded-full bg-[rgba(214,69,69,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)]";
  }

  return "inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-hover)]";
}