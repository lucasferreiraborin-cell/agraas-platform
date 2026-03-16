import { supabase } from "@/lib/supabase";
import Link from "next/link";

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
  notes: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type DisplayRow = {
  id: string;
  animal_code: string;
  weight: number;
  weighing_date: string | null;
  notes: string;
};

export default async function PesagensHistoricoPage() {
  const [
    { data: weightsData, error: weightsError },
    { data: animalsData, error: animalsError },
  ] = await Promise.all([
    supabase
      .from("weights")
      .select("id, animal_id, weight, weighing_date, notes")
      .order("weighing_date", { ascending: false }),

    supabase
      .from("animals")
      .select("id, internal_code"),
  ]);

  if (weightsError) {
    console.error("Erro ao buscar pesagens:", weightsError);
  }

  if (animalsError) {
    console.error("Erro ao buscar animais:", animalsError);
  }

  const weights = (weightsData ?? []) as WeightRow[];
  const animals = (animalsData ?? []) as AnimalRow[];

  const animalMap = new Map<string, string>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal.internal_code ?? animal.id);
  }

  const rows: DisplayRow[] = weights.map((item) => ({
    id: item.id,
    animal_code: animalMap.get(item.animal_id) ?? item.animal_id,
    weight: item.weight,
    weighing_date: item.weighing_date,
    notes: item.notes ?? "-",
  }));

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Histórico produtivo</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Pesagens registradas
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Acompanhe o histórico de peso do rebanho com rastreabilidade por
              animal e leitura estruturada da evolução produtiva.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pesagens" className="ag-button-primary">
                Nova pesagem
              </Link>

              <Link href="/animais" className="ag-button-secondary">
                Ver animais
              </Link>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Pesagens"
                value={rows.length}
                subtitle="registros produtivos consolidados"
              />
              <MetricCard
                label="Animais pesados"
                value={new Set(rows.map((row) => row.animal_code)).size}
                subtitle="ativos com pesagem registrada"
              />
              <MetricCard
                label="Maior peso"
                value={rows.length > 0 ? Math.max(...rows.map((row) => row.weight)) : 0}
                subtitle="maior peso registrado"
              />
              <MetricCard
                label="Módulo"
                value="produtivo"
                subtitle="base para performance do rebanho"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ag-section-title">Tabela consolidada</h2>
            <p className="ag-section-subtitle">
              Histórico de pesagens registradas para os animais da base.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {rows.length} registros
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhuma pesagem encontrada.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Peso (kg)</th>
                  <th>Data</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.animal_code}</td>
                    <td>{row.weight}</td>
                    <td>{formatDate(row.weighing_date)}</td>
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}