import { createSupabaseServerClient } from "@/lib/supabase-server";
import dynamic from "next/dynamic";

const WeightDist = dynamic(() => import("@/app/components/charts/WeightDist"), { ssr: false });

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="ag-section-title">{title}</h2>
      {sub && <p className="ag-section-subtitle">{sub}</p>}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[80px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-6 py-8 text-sm text-[var(--text-muted)]">
      {label}
    </div>
  );
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function ProducaoPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: stockData },
    { data: weightData },
    { data: salesData },
    { data: calvesData },
    { data: mortalityData },
  ] = await Promise.all([
    supabase.from("production_stock_snapshot").select("*").order("category"),
    supabase.from("production_weight_distribution").select("*").order("range_order"),
    supabase.from("production_sales_history").select("*").order("sale_date"),
    supabase.from("production_calf_entries").select("*").order("year").order("month"),
    supabase.from("production_mortality").select("*").order("age_order"),
  ]);

  const stock = stockData ?? [];
  const weights = weightData ?? [];
  const sales = salesData ?? [];
  const calves = calvesData ?? [];
  const mortality = mortalityData ?? [];

  const totalDeaths = mortality.reduce((s, r) => s + (r.deaths ?? 0), 0);
  const totalAnimals = stock.reduce((s, r) => s + (r.balance ?? 0), 0) || 1;
  const weightMax = Math.max(...weights.map(w => w.count ?? 0), 1);

  // Group sales by date+sex for display
  type SaleGroup = { date: string; male: { count: number; weight: number } | null; female: { count: number; weight: number } | null };
  const saleMap = new Map<string, SaleGroup>();
  for (const s of sales) {
    const key = s.sale_date;
    if (!saleMap.has(key)) saleMap.set(key, { date: key, male: null, female: null });
    const g = saleMap.get(key)!;
    if (s.sex === "M") g.male = { count: s.head_count, weight: s.avg_weight_kg };
    else g.female = { count: s.head_count, weight: s.avg_weight_kg };
  }
  const saleGroups = Array.from(saleMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden p-8 lg:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0.00)_70%)]" />
        <div className="ag-badge ag-badge-green mb-4">Módulo Produção</div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] lg:text-4xl">
          Produção
        </h1>
        <p className="mt-3 max-w-xl text-[1rem] leading-7 text-[var(--text-secondary)]">
          Estoque animal, distribuição por peso, vendas históricas, entradas de bezerros e mortalidade.
        </p>
      </section>

      {/* Estoque */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Estoque de Animais" sub="Movimentação do período" />
        {stock.length === 0 ? <EmptyState label="Nenhum dado de estoque registrado ainda" /> : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Estoque inicial</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Mortes</th>
                  <th>Saldo atual</th>
                </tr>
              </thead>
              <tbody>
                {stock.map(row => (
                  <tr key={row.id}>
                    <td className="font-medium text-[var(--text-primary)]">{row.category}</td>
                    <td>{(row.initial ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="text-green-600">{(row.entries ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="text-amber-600">{(row.exits ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="text-red-500">{(row.deaths ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="font-semibold text-[var(--text-primary)]">{(row.balance ?? 0).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Distribuição por faixa de peso */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Distribuição por Faixa de Peso" sub="Quantidade de animais por intervalo de peso vivo" />
        {weights.length === 0 ? <EmptyState label="Nenhum dado de pesagem registrado ainda" /> : (
          <WeightDist rows={weights} />
        )}
      </section>

      {/* Vendas históricas */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Vendas Históricas" sub="Cabeças e peso médio por lote" />
        {saleGroups.length === 0 ? <EmptyState label="Nenhuma venda registrada ainda" /> : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Machos (cab.)</th>
                  <th>Peso médio M</th>
                  <th>Fêmeas (cab.)</th>
                  <th>Peso médio F</th>
                  <th>Total cabeças</th>
                </tr>
              </thead>
              <tbody>
                {saleGroups.map(g => {
                  const d = new Date(g.date);
                  const label = `${MONTH_NAMES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
                  const totalHeads = (g.male?.count ?? 0) + (g.female?.count ?? 0);
                  return (
                    <tr key={g.date}>
                      <td className="font-medium text-[var(--text-primary)]">{label}</td>
                      <td>{g.male ? g.male.count.toLocaleString("pt-BR") : "—"}</td>
                      <td>{g.male ? `${g.male.weight} kg` : "—"}</td>
                      <td>{g.female ? g.female.count.toLocaleString("pt-BR") : "—"}</td>
                      <td>{g.female ? `${g.female.weight} kg` : "—"}</td>
                      <td className="font-semibold text-[var(--text-primary)]">{totalHeads.toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Entradas de bezerros */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Entradas Mensais de Bezerros" sub="Nascimentos e peso médio por sexo" />
        {calves.length === 0 ? <EmptyState label="Nenhuma entrada de bezerros registrada ainda" /> : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Nascimentos</th>
                  <th>Compras</th>
                  <th>Total entradas</th>
                  <th>Peso médio M (kg)</th>
                  <th>Peso médio F (kg)</th>
                </tr>
              </thead>
              <tbody>
                {calves.map(row => (
                  <tr key={row.id}>
                    <td className="font-medium text-[var(--text-primary)]">
                      {MONTH_NAMES[(row.month ?? 1) - 1]}/{String(row.year).slice(2)}
                    </td>
                    <td>{(row.births ?? 0).toLocaleString("pt-BR")}</td>
                    <td>{(row.purchases ?? 0).toLocaleString("pt-BR")}</td>
                    <td className="font-semibold text-[var(--text-primary)]">
                      {((row.births ?? 0) + (row.purchases ?? 0)).toLocaleString("pt-BR")}
                    </td>
                    <td>{row.avg_weight_male ?? "—"}</td>
                    <td>{row.avg_weight_female ?? "—"}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[var(--border)] font-semibold">
                  <td className="text-[var(--text-primary)]">Total</td>
                  <td>{calves.reduce((s, r) => s + (r.births ?? 0), 0).toLocaleString("pt-BR")}</td>
                  <td>{calves.reduce((s, r) => s + (r.purchases ?? 0), 0).toLocaleString("pt-BR")}</td>
                  <td className="text-[var(--text-primary)]">
                    {calves.reduce((s, r) => s + (r.births ?? 0) + (r.purchases ?? 0), 0).toLocaleString("pt-BR")}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mortalidade */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Mortalidade por Faixa Etária" sub="Óbitos e participação percentual no total" />
        {mortality.length === 0 ? <EmptyState label="Nenhum óbito registrado ainda" /> : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th>Faixa etária</th>
                  <th>Mortes</th>
                  <th>% do total de mortes</th>
                </tr>
              </thead>
              <tbody>
                {mortality.map(row => (
                  <tr key={row.id}>
                    <td className="font-medium text-[var(--text-primary)]">{row.age_range}</td>
                    <td>{row.deaths}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                          <div
                            className="h-full rounded-full bg-red-400"
                            style={{ width: `${((row.deaths ?? 0) / totalDeaths) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {(((row.deaths ?? 0) / totalDeaths) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[var(--border)] font-semibold">
                  <td className="text-[var(--text-primary)]">Total</td>
                  <td>{totalDeaths}</td>
                  <td className="text-xs text-[var(--text-muted)]">
                    {((totalDeaths / totalAnimals) * 100).toFixed(2)}% do rebanho
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
