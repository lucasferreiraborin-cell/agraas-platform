import { supabase } from "@/lib/supabase";
import Link from "next/link";

type BatchRow = {
  id: string;
  batch_number: string;
  quantity: number;
  expiration_date: string | null;
  product_id: string;
};

type ProductRow = {
  id: string;
  name: string;
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

export default async function AlertasPage() {
  const [
    { data: batchesData, error: batchesError },
    { data: productsData, error: productsError },
    { data: animalsData, error: animalsError },
    { data: weightsData, error: weightsError },
  ] = await Promise.all([
    supabase.from("stock_batches").select("id, batch_number, quantity, expiration_date, product_id"),
    supabase.from("products").select("id, name"),
    supabase.from("animals").select("id, internal_code"),
    supabase.from("weights").select("animal_id, weight, weighing_date").order("weighing_date", { ascending: false }),
  ]);

  if (batchesError) console.error("Erro ao buscar lotes sanitários:", batchesError);
  if (productsError) console.error("Erro ao buscar produtos:", productsError);
  if (animalsError) console.error("Erro ao buscar animais:", animalsError);
  if (weightsError) console.error("Erro ao buscar pesagens:", weightsError);

  const batches = (batchesData ?? []) as BatchRow[];
  const products = (productsData ?? []) as ProductRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const weights = (weightsData ?? []) as WeightRow[];

  const productMap = new Map<string, string>();
  products.forEach((item) => productMap.set(item.id, item.name));

  const latestWeightByAnimal = new Map<string, WeightRow>();
  for (const row of weights) {
    if (!latestWeightByAnimal.has(row.animal_id)) {
      latestWeightByAnimal.set(row.animal_id, row);
    }
  }

  const lowStock = batches.filter((item) => Number(item.quantity) <= 5);

  const today = new Date();
  const expiringSoon = batches.filter((item) => {
    if (!item.expiration_date) return false;
    const diffDays =
      (new Date(item.expiration_date).getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });

  const noRecentWeighing = animals.filter((animal) => {
    const last = latestWeightByAnimal.get(animal.id);
    if (!last?.weighing_date) return true;

    const diffDays =
      (today.getTime() - new Date(last.weighing_date).getTime()) /
      (1000 * 60 * 60 * 24);

    return diffDays > 90;
  });

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Alertas operacionais</div>

            <h1 className="ag-page-title max-w-4xl">
              Monitoramento preventivo da operação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.05rem] leading-8 text-[var(--text-secondary)]">
              Identifique riscos de estoque, vencimento e ausência de pesagens
              recentes para agir antes que o problema aconteça.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estoque/dashboard" className="ag-button-primary">
                Dashboard sanitário
              </Link>
              <Link href="/produtivo" className="ag-button-secondary">
                Dashboard produtivo
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Estoque crítico"
                value={lowStock.length}
                subtitle="lotes com saldo baixo"
              />
              <MetricCard
                label="Vencendo em 30 dias"
                value={expiringSoon.length}
                subtitle="produtos próximos do vencimento"
              />
              <MetricCard
                label="Sem pesagem recente"
                value={noRecentWeighing.length}
                subtitle="animais há mais de 90 dias sem pesagem"
              />
              <MetricCard
                label="Status"
                value="monitorando"
                subtitle="alertas operacionais ativos"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="ag-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="ag-section-title">Estoque crítico</h2>
              <p className="ag-section-subtitle">
                Lotes sanitários com quantidade baixa.
              </p>
            </div>

            <Link href="/estoque" className="ag-button-secondary">
              Ver estoque
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {lowStock.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum lote com estoque crítico.
              </p>
            ) : (
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id}>
                      <td>{productMap.get(item.product_id) ?? "-"}</td>
                      <td>{item.batch_number}</td>
                      <td>{item.quantity}</td>
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
              <h2 className="ag-section-title">Animais sem pesagem recente</h2>
              <p className="ag-section-subtitle">
                Base para acompanhamento produtivo preventivo.
              </p>
            </div>

            <Link href="/pesagens" className="ag-button-secondary">
              Registrar pesagem
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {noRecentWeighing.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Todos os animais possuem pesagens recentes.
              </p>
            ) : (
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Última pesagem</th>
                  </tr>
                </thead>
                <tbody>
                  {noRecentWeighing.map((animal) => {
                    const last = latestWeightByAnimal.get(animal.id);
                    return (
                      <tr key={animal.id}>
                        <td>{animal.internal_code ?? animal.id}</td>
                        <td>{last?.weighing_date ? new Date(last.weighing_date).toLocaleDateString("pt-BR") : "Nunca"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
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