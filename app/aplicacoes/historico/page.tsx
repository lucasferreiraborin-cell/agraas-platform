import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ApplicationRow = {
  id: string;
  animal_id: string;
  product_id: string | null;
  batch_id: string | null;
  dose: number | null;
  application_date: string | null;
  created_at: string | null;
};

type ProductRow = {
  id: string;
  name: string;
};

type BatchRow = {
  id: string;
  batch_number: string;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type DisplayRow = {
  id: string;
  animal_code: string;
  product_name: string;
  batch_number: string;
  dose: number | null;
  application_date: string | null;
};

export default async function AplicacoesHistoricoPage() {
  const [
    { data: applicationsData, error: applicationsError },
    { data: productsData, error: productsError },
    { data: batchesData, error: batchesError },
    { data: animalsData, error: animalsError },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("id, animal_id, product_id, batch_id, dose, application_date, created_at")
      .order("application_date", { ascending: false }),

    supabase.from("products").select("id, name"),

    supabase.from("stock_batches").select("id, batch_number"),

    supabase.from("animals").select("id, internal_code"),
  ]);

  if (applicationsError) {
    console.error("Erro ao buscar aplicações:", applicationsError);
  }

  if (productsError) {
    console.error("Erro ao buscar produtos:", productsError);
  }

  if (batchesError) {
    console.error("Erro ao buscar lotes:", batchesError);
  }

  if (animalsError) {
    console.error("Erro ao buscar animais:", animalsError);
  }

  const applications = (applicationsData ?? []) as ApplicationRow[];
  const products = (productsData ?? []) as ProductRow[];
  const batches = (batchesData ?? []) as BatchRow[];
  const animals = (animalsData ?? []) as AnimalRow[];

  const productMap = new Map<string, string>();
  for (const product of products) {
    productMap.set(product.id, product.name);
  }

  const batchMap = new Map<string, string>();
  for (const batch of batches) {
    batchMap.set(batch.id, batch.batch_number);
  }

  const animalMap = new Map<string, string>();
  for (const animal of animals) {
    animalMap.set(animal.id, animal.internal_code ?? animal.id);
  }

  const rows: DisplayRow[] = applications.map((application) => ({
    id: application.id,
    animal_code: animalMap.get(application.animal_id) ?? application.animal_id,
    product_name: application.product_id
      ? productMap.get(application.product_id) ?? "Produto"
      : "Produto",
    batch_number: application.batch_id
      ? batchMap.get(application.batch_id) ?? "-"
      : "-",
    dose: application.dose ?? null,
    application_date:
      application.application_date ?? application.created_at ?? null,
  }));

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.18)_0%,rgba(122,168,76,0)_70%)]" />

            <div className="ag-badge ag-badge-green">Histórico sanitário</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Aplicações registradas na operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Visão consolidada de todas as aplicações sanitárias registradas,
              com rastreabilidade por animal, produto, lote e dose aplicada.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/aplicacoes" className="ag-button-primary">
                Nova aplicação
              </Link>

              <Link href="/estoque/historico" className="ag-button-secondary">
                Ver movimentações de estoque
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Aplicações"
                value={rows.length}
                subtitle="registros sanitários consolidados"
              />
              <MetricCard
                label="Animais impactados"
                value={new Set(rows.map((row) => row.animal_code)).size}
                subtitle="ativos com aplicação registrada"
              />
              <MetricCard
                label="Produtos usados"
                value={new Set(rows.map((row) => row.product_name)).size}
                subtitle="insumos sanitários movimentados"
              />
              <MetricCard
                label="Lotes usados"
                value={new Set(rows.map((row) => row.batch_number)).size}
                subtitle="lotes consumidos na operação"
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
              Histórico operacional das aplicações sanitárias realizadas na base.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {rows.length} registros
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhuma aplicação encontrada.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>Dose</th>
                  <th>Data</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.animal_code}</td>
                    <td>{row.product_name}</td>
                    <td>{row.batch_number}</td>
                    <td>{row.dose ?? "-"}</td>
                    <td>{formatDate(row.application_date)}</td>
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