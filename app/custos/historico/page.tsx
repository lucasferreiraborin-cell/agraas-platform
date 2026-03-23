import { supabase } from "@/lib/supabase";
import Link from "next/link";

type CostRow = {
  id: string;
  animal_id: string | null;
  lot_id: string | null;
  category: string;
  amount: number;
  cost_date: string | null;
  notes: string | null;
};

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type LotRow = {
  id: string;
  name: string;
};

type DisplayRow = {
  id: string;
  animal_code: string;
  lot_name: string;
  category: string;
  amount: number;
  cost_date: string | null;
  notes: string;
};

export default async function CustosHistoricoPage() {
  const [
    { data: costsData, error: costsError },
    { data: animalsData, error: animalsError },
    { data: lotsData, error: lotsError },
  ] = await Promise.all([
    supabase
      .from("cost_records")
      .select("id, animal_id, lot_id, category, amount, cost_date, notes")
      .order("cost_date", { ascending: false }),

    supabase.from("animals").select("id, internal_code"),
    supabase.from("lots").select("id, name"),
  ]);

  if (costsError) {
    console.error("Erro ao buscar custos:", costsError);
  }

  if (animalsError) {
    console.error("Erro ao buscar animais:", animalsError);
  }

  if (lotsError) {
    console.error("Erro ao buscar lotes:", lotsError);
  }

  const costs = (costsData ?? []) as CostRow[];
  const animals = (animalsData ?? []) as AnimalRow[];
  const lots = (lotsData ?? []) as LotRow[];

  const animalMap = new Map<string, string>();
  animals.forEach((item) => animalMap.set(item.id, item.internal_code ?? item.id));

  const lotMap = new Map<string, string>();
  lots.forEach((item) => lotMap.set(item.id, item.name));

  const rows: DisplayRow[] = costs.map((item) => ({
    id: item.id,
    animal_code: item.animal_id ? animalMap.get(item.animal_id) ?? item.animal_id : "-",
    lot_name: item.lot_id ? lotMap.get(item.lot_id) ?? item.lot_id : "-",
    category: item.category,
    amount: item.amount,
    cost_date: item.cost_date,
    notes: item.notes ?? "-",
  }));

  const totalAmount = rows.reduce((acc, item) => acc + Number(item.amount ?? 0), 0);

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative p-8 lg:p-10">
            <div className="ag-badge ag-badge-green">Histórico econômico</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Custos registrados
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Consolidação dos custos da operação por categoria, animal e lote,
              formando a base econômica da plataforma.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/custos" className="ag-button-primary">
                Novo custo
              </Link>

              <Link href="/relatorios" className="ag-button-secondary">
                Ir para relatórios
              </Link>
            </div>
          </div>

          <div className="ag-hero-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Custos"
                value={rows.length}
                subtitle="lançamentos registrados"
              />
              <MetricCard
                label="Valor total"
                value={formatCurrency(totalAmount)}
                subtitle="somatório da base"
              />
              <MetricCard
                label="Categorias"
                value={new Set(rows.map((row) => row.category)).size}
                subtitle="tipos de custo mapeados"
              />
              <MetricCard
                label="Lotes impactados"
                value={new Set(rows.map((row) => row.lot_name)).size - (rows.some((r)=>r.lot_name==="-" ) ? 1 : 0)}
                subtitle="grupos com custos associados"
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
              Histórico econômico por animal, lote e categoria.
            </p>
          </div>

          <div className="ag-badge ag-badge-dark">
            {rows.length} registros
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
              Nenhum custo encontrado.
            </div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Animal</th>
                  <th>Lote</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.category}</td>
                    <td>{row.animal_code}</td>
                    <td>{row.lot_name}</td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{formatDate(row.cost_date)}</td>
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}