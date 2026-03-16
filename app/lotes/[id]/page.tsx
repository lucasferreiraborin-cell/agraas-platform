import { supabase } from "@/lib/supabase";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type LotRow = {
  id: string;
  name: string;
  description: string | null;
  phase: string | null;
  status: string | null;
  created_at: string | null;
};

type AssignmentRow = {
  id: string;
  animal_id: string;
  lot_id: string;
  entry_date: string | null;
  exit_date: string | null;
  notes: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type WeightRow = {
  animal_id: string;
  weight: number;
  weighing_date: string | null;
};

export default async function LoteDetalhePage({ params }: PageProps) {
  const { id } = await params;

  const [
    { data: lotData, error: lotError },
    { data: assignmentsData, error: assignmentsError },
    { data: animalsData, error: animalsError },
    { data: weightsData, error: weightsError },
  ] = await Promise.all([
    supabase
      .from("lots")
      .select("id, name, description, phase, status, created_at")
      .eq("id", id)
      .single(),

    supabase
      .from("animal_lot_assignments")
      .select("id, animal_id, lot_id, entry_date, exit_date, notes")
      .eq("lot_id", id)
      .order("entry_date", { ascending: false }),

    supabase
      .from("animals")
      .select("id, internal_code"),

    supabase
      .from("weights")
      .select("animal_id, weight, weighing_date")
      .order("weighing_date", { ascending: false }),
  ]);

  if (lotError || !lotData) {
    return (
      <main className="space-y-8">
        <Link
          href="/lotes"
          className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
        >
          ← Voltar para Lotes
        </Link>

        <div className="ag-card-strong p-8">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
            Lote não encontrado
          </h1>
        </div>
      </main>
    );
  }

  if (assignmentsError) console.error("Erro ao buscar vínculos do lote:", assignmentsError);
  if (animalsError) console.error("Erro ao buscar animais:", animalsError);
  if (weightsError) console.error("Erro ao buscar pesos:", weightsError);

  const lot = lotData as LotRow;
  const assignments = (assignmentsData ?? []) as AssignmentRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const weights = (weightsData ?? []) as WeightRow[];

  const animalMap = new Map<string, string>();
  animals.forEach((animal) => animalMap.set(animal.id, animal.internal_code ?? animal.id));

  const latestWeightByAnimal = new Map<string, WeightRow>();
  for (const row of weights) {
    if (!latestWeightByAnimal.has(row.animal_id)) {
      latestWeightByAnimal.set(row.animal_id, row);
    }
  }

  const activeAnimals = assignments.filter((item) => !item.exit_date);
  const inactiveAnimals = assignments.filter((item) => !!item.exit_date);

  const activeWeights = activeAnimals
    .map((item) => latestWeightByAnimal.get(item.animal_id))
    .filter(Boolean) as WeightRow[];

  const averageWeight =
    activeWeights.length > 0
      ? activeWeights.reduce((acc, item) => acc + Number(item.weight ?? 0), 0) / activeWeights.length
      : 0;

  const lastWeighingDate =
    activeWeights.length > 0
      ? activeWeights
          .map((item) => item.weighing_date)
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
      : null;

  return (
    <main className="space-y-8">
      <Link
        href="/lotes"
        className="text-sm font-medium text-[var(--primary-hover)] hover:underline"
      >
        ← Voltar para Lotes
      </Link>

      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Lote operacional</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              {lot.name}
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              {lot.description ?? "Sem descrição cadastrada para este lote."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/lotes/${lot.id}/adicionar`} className="ag-button-primary">
                Adicionar animal
              </Link>

              <Link href="/pesagens" className="ag-button-secondary">
                Registrar pesagem
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Fase"
                value={lot.phase ?? "-"}
                subtitle="etapa operacional do lote"
              />
              <MetricCard
                label="Status"
                value={formatStatus(lot.status)}
                subtitle="situação atual do grupo"
              />
              <MetricCard
                label="Animais ativos"
                value={activeAnimals.length}
                subtitle="vínculos sem data de saída"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Peso médio"
                value={averageWeight > 0 ? `${averageWeight.toFixed(1)} kg` : "-"}
                subtitle="média dos últimos pesos do lote"
              />
              <MetricCard
                label="Última pesagem"
                value={formatDate(lastWeighingDate)}
                subtitle="pesagem mais recente no lote"
              />
              <MetricCard
                label="Entradas"
                value={assignments.length}
                subtitle="registros totais de alocação"
              />
              <MetricCard
                label="Saídas"
                value={inactiveAnimals.length}
                subtitle="animais já retirados do lote"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ag-section-title">Animais no lote</h2>
            <p className="ag-section-subtitle">
              Relação dos animais vinculados a este grupo operacional.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {assignments.length} vínculos
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          {assignments.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum animal vinculado a este lote.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Status</th>
                  <th>Último peso</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {assignments.map((item) => {
                  const weight = latestWeightByAnimal.get(item.animal_id);
                  return (
                    <tr key={item.id}>
                      <td>{animalMap.get(item.animal_id) ?? item.animal_id}</td>
                      <td>{formatDate(item.entry_date)}</td>
                      <td>{formatDate(item.exit_date)}</td>
                      <td>{item.exit_date ? "Inativo" : "Ativo"}</td>
                      <td>{weight ? `${weight.weight} kg` : "-"}</td>
                      <td>{item.notes ?? "-"}</td>
                    </tr>
                  );
                })}
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

function formatStatus(value: string | null) {
  if (!value) return "-";

  const map: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    closed: "Fechado",
  };

  return map[value.toLowerCase()] ?? value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}