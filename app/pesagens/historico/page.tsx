import { supabase } from "@/lib/supabase";
import Link from "next/link";

type WeightRow = {
  id: string;
  animal_id: string;
  weight: number;
  weighing_date: string | null;
  notes: string | null;
  created_at: string | null;
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
      .select("id, animal_id, weight, weighing_date, notes, created_at")
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
    weight: Number(item.weight ?? 0),
    weighing_date: item.weighing_date ?? item.created_at ?? null,
    notes: item.notes ?? "-",
  }));

  const totalWeights = rows.length;
  const animalsWeighed = new Set(rows.map((row) => row.animal_code)).size;
  const averageWeight =
    rows.length > 0
      ? rows.reduce((acc, row) => acc + Number(row.weight ?? 0), 0) / rows.length
      : 0;

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.18)_0%,rgba(122,168,76,0)_70%)]" />

            <div className="ag-badge ag-badge-green">Histórico produtivo</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Pesagens registradas
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Histórico consolidado das pesagens do rebanho para leitura
              produtiva e acompanhamento da evolução animal.
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

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Pesagens"
                value={totalWeights}
                subtitle="registros produtivos"
              />
              <MetricCard
                label="Animais"
                value={animalsWeighed}
                subtitle="com pelo menos uma pesagem"
              />
              <MetricCard
                label="Peso médio"
                value={averageWeight > 0 ? `${averageWeight.toFixed(1)} kg` : "-"}
                subtitle="média dos registros"
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
              Relação completa das pesagens registradas no sistema.
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
                  <th>Peso</th>
                  <th>Data</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.animal_code}</td>
                    <td>{`${row.weight} kg`}</td>
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