import { supabase } from "@/lib/supabase";
import Link from "next/link";

type MovementRow = {
  id: string;
  animal_id: string;
  movement_type: string;
  origin_ref: string | null;
  destination_ref: string | null;
  movement_date: string | null;
  notes: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type DisplayRow = {
  id: string;
  animal_code: string;
  movement_type: string;
  origin_ref: string;
  destination_ref: string;
  movement_date: string | null;
  notes: string;
};

export default async function MovimentacoesHistoricoPage() {
  const [
    { data: movementsData, error: movementsError },
    { data: animalsData, error: animalsError },
  ] = await Promise.all([
    supabase
      .from("animal_movements")
      .select("id, animal_id, movement_type, origin_ref, destination_ref, movement_date, notes")
      .order("movement_date", { ascending: false }),

    supabase
      .from("animals")
      .select("id, internal_code"),
  ]);

  if (movementsError) {
    console.error("Erro ao buscar movimentações:", movementsError);
  }

  if (animalsError) {
    console.error("Erro ao buscar animais:", animalsError);
  }

  const movements = (movementsData ?? []) as MovementRow[];
  const animals = (animalsData ?? []) as AnimalRow[];

  const animalMap = new Map<string, string>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal.internal_code ?? animal.id);
  }

  const rows: DisplayRow[] = movements.map((movement) => ({
    id: movement.id,
    animal_code: animalMap.get(movement.animal_id) ?? movement.animal_id,
    movement_type: formatMovementType(movement.movement_type),
    origin_ref: movement.origin_ref ?? "-",
    destination_ref: movement.destination_ref ?? "-",
    movement_date: movement.movement_date ?? null,
    notes: movement.notes ?? "-",
  }));

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Histórico operacional</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Movimentações dos animais
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Visão consolidada das movimentações operacionais registradas para
              manter a rastreabilidade de cada animal na fazenda.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/movimentacoes" className="ag-button-primary">
                Nova movimentação
              </Link>

              <Link href="/animais" className="ag-button-secondary">
                Ver animais
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Movimentações"
                value={rows.length}
                subtitle="registros operacionais consolidados"
              />
              <MetricCard
                label="Animais impactados"
                value={new Set(rows.map((row) => row.animal_code)).size}
                subtitle="ativos com evento de movimentação"
              />
              <MetricCard
                label="Origens"
                value={new Set(rows.map((row) => row.origin_ref)).size}
                subtitle="pontos de origem mapeados"
              />
              <MetricCard
                label="Destinos"
                value={new Set(rows.map((row) => row.destination_ref)).size}
                subtitle="pontos de destino mapeados"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="ag-section-header">
          <div>
            <h2 className="ag-section-title">Tabela consolidada</h2>
            <p className="ag-section-subtitle">
              Histórico das movimentações registradas para os animais da base.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {rows.length} registros
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhuma movimentação encontrada.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Data</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.animal_code}</td>
                    <td>{row.movement_type}</td>
                    <td>{row.origin_ref}</td>
                    <td>{row.destination_ref}</td>
                    <td>{formatDate(row.movement_date)}</td>
                    <td>{row.notes}</td>
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