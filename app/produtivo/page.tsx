import { supabase } from "@/lib/supabase";
import Link from "next/link";

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type LotRow = {
  id: string;
  name: string;
  phase: string | null;
  status: string | null;
};

type AssignmentRow = {
  animal_id: string;
  lot_id: string;
  exit_date: string | null;
};

type MovementRow = {
  id: string;
  animal_id: string;
  movement_type: string;
  movement_date: string | null;
  origin_ref: string | null;
  destination_ref: string | null;
};

export default async function ProdutivoPage() {
  const [
    { data: weightsData, error: weightsError },
    { data: animalsData, error: animalsError },
    { data: lotsData, error: lotsError },
    { data: assignmentsData, error: assignmentsError },
    { data: movementsData, error: movementsError },
  ] = await Promise.all([
    supabase
      .from("weights")
      .select("id, animal_id, weight, weighing_date")
      .order("weighing_date", { ascending: false }),

    supabase
      .from("animals")
      .select("id, internal_code"),

    supabase
      .from("lots")
      .select("id, name, phase, status"),

    supabase
      .from("animal_lot_assignments")
      .select("animal_id, lot_id, exit_date"),

    supabase
      .from("animal_movements")
      .select("id, animal_id, movement_type, movement_date, origin_ref, destination_ref")
      .order("movement_date", { ascending: false })
      .limit(10),
  ]);

  if (weightsError) console.error("Erro ao buscar pesagens:", weightsError);
  if (animalsError) console.error("Erro ao buscar animais:", animalsError);
  if (lotsError) console.error("Erro ao buscar lotes:", lotsError);
  if (assignmentsError) console.error("Erro ao buscar vínculos de lotes:", assignmentsError);
  if (movementsError) console.error("Erro ao buscar movimentações:", movementsError);

  const weights = (weightsData ?? []) as WeightRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const lots = (lotsData ?? []) as LotRow[];
  const assignments = (assignmentsData ?? []) as AssignmentRow[];
  const movements = (movementsData ?? []) as MovementRow[];

  const animalMap = new Map<string, string>();
  animals.forEach((animal) => animalMap.set(animal.id, animal.internal_code ?? animal.id));

  const latestWeightByAnimal = new Map<string, WeightRow>();
  const previousWeightByAnimal = new Map<string, WeightRow>();

  for (const row of weights) {
    if (!latestWeightByAnimal.has(row.animal_id)) {
      latestWeightByAnimal.set(row.animal_id, row);
    } else if (!previousWeightByAnimal.has(row.animal_id)) {
      previousWeightByAnimal.set(row.animal_id, row);
    }
  }

  const latestWeights = Array.from(latestWeightByAnimal.values());
  const averageWeight =
    latestWeights.length > 0
      ? latestWeights.reduce((acc, item) => acc + Number(item.weight ?? 0), 0) / latestWeights.length
      : 0;

  const animalsWithRecentWeight = latestWeights.filter((item) => {
    if (!item.weighing_date) return false;
    const diffDays =
      (new Date().getTime() - new Date(item.weighing_date).getTime()) /
      (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length;

  const evolutions = latestWeights.map((item) => {
    const prev = previousWeightByAnimal.get(item.animal_id);
    return {
      animal_id: item.animal_id,
      current: Number(item.weight ?? 0),
      previous: Number(prev?.weight ?? 0),
      delta: prev ? Number(item.weight ?? 0) - Number(prev.weight ?? 0) : 0,
    };
  });

  const topAnimals = evolutions
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  const activeAssignments = assignments.filter((item) => !item.exit_date);

  const lotSummary = lots.map((lot) => {
    const animalIds = activeAssignments
      .filter((item) => item.lot_id === lot.id)
      .map((item) => item.animal_id);

    const lotLatestWeights = animalIds
      .map((animalId) => latestWeightByAnimal.get(animalId))
      .filter(Boolean) as WeightRow[];

    const avg =
      lotLatestWeights.length > 0
        ? lotLatestWeights.reduce((acc, item) => acc + Number(item.weight ?? 0), 0) /
          lotLatestWeights.length
        : 0;

    return {
      id: lot.id,
      name: lot.name,
      phase: lot.phase ?? "-",
      status: lot.status ?? "-",
      animal_count: animalIds.length,
      average_weight: avg,
    };
  });

  const topLots = lotSummary
    .sort((a, b) => b.average_weight - a.average_weight)
    .slice(0, 5);

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.20)_0%,rgba(122,168,76,0.00)_70%)]" />

            <div className="ag-badge ag-badge-green">Dashboard produtivo</div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)] lg:text-6xl">
              Desempenho produtivo do rebanho
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              Acompanhe peso médio, evolução recente, performance por lote e
              movimentações operacionais em uma visão executiva da produção.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pesagens" className="ag-button-primary">
                Nova pesagem
              </Link>
              <Link href="/movimentacoes" className="ag-button-secondary">
                Nova movimentação
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Peso médio do rebanho"
                value={`${averageWeight.toFixed(1)} kg`}
                subtitle="média dos últimos pesos registrados"
              />
              <HeroMetric
                label="Pesagens recentes"
                value={animalsWithRecentWeight}
                subtitle="animais pesados nos últimos 30 dias"
              />
              <HeroMetric
                label="Lotes ativos"
                value={lots.filter((lot) => (lot.status ?? "").toLowerCase() === "active").length}
                subtitle="grupos operacionais em andamento"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Destaques da evolução
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                Animais com maior evolução
              </h2>
            </div>

            <div className="mt-8 space-y-4">
              {topAnimals.length === 0 ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
                  Ainda não há pesagens suficientes para calcular evolução.
                </div>
              ) : (
                topAnimals.map((item) => (
                  <div
                    key={item.animal_id}
                    className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-primary)]">
                          {animalMap.get(item.animal_id) ?? item.animal_id}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          Atual: {item.current} kg • Anterior: {item.previous || "-"} kg
                        </p>
                      </div>

                      <span className="ag-badge ag-badge-green">
                        {item.delta >= 0 ? `+${item.delta.toFixed(1)} kg` : `${item.delta.toFixed(1)} kg`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Performance por lote</h2>
              <p className="ag-section-subtitle">
                Peso médio dos lotes com base nas últimas pesagens disponíveis.
              </p>
            </div>

            <Link href="/lotes" className="ag-button-secondary">
              Ver lotes
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {topLots.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum lote com dados suficientes.
              </p>
            ) : (
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Fase</th>
                    <th>Animais</th>
                    <th>Peso médio</th>
                  </tr>
                </thead>

                <tbody>
                  {topLots.map((lot) => (
                    <tr key={lot.id}>
                      <td>{lot.name}</td>
                      <td>{lot.phase}</td>
                      <td>{lot.animal_count}</td>
                      <td>{lot.average_weight.toFixed(1)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Movimentações recentes</h2>
              <p className="ag-section-subtitle">
                Últimos registros operacionais do rebanho.
              </p>
            </div>

            <Link href="/movimentacoes/historico" className="ag-button-secondary">
              Ver histórico
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {movements.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhuma movimentação registrada.
              </p>
            ) : (
              movements.map((movement) => (
                <div
                  key={movement.id}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="ag-badge ag-badge-green">
                      {formatMovementType(movement.movement_type)}
                    </span>

                    <span className="text-sm text-[var(--text-muted)]">
                      {formatDate(movement.movement_date)}
                    </span>
                  </div>

                  <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                    {animalMap.get(movement.animal_id) ?? movement.animal_id}
                  </p>

                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Origem: {movement.origin_ref ?? "-"} • Destino:{" "}
                    {movement.destination_ref ?? "-"}
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatMovementType(value: string) {
  const map: Record<string, string> = {
    lot_entry: "Entrada em lote",
    ownership_transfer: "Transferência",
    sale: "Venda",
    slaughter: "Abate",
    birth: "Nascimento",
  };

  return map[value] ?? value;
}