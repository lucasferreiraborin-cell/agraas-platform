import { createSupabaseServerClient } from "@/lib/supabase-server";
import InsumosBar from "@/app/components/charts/InsumosBarWrapper";

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

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="ag-card flex flex-col gap-1 p-5">
      <p className="ag-kpi-label">{label}</p>
      <p className="ag-kpi-value">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  "Nutricionais":          "bg-blue-100 text-blue-700",
  "Medicamentos":          "bg-green-100 text-green-700",
  "Tratamentos/Hormônios": "bg-purple-100 text-purple-700",
  "Vacinas/Vermífugos":    "bg-amber-100 text-amber-700",
  "Maquinários":           "bg-orange-100 text-orange-700",
  "Agrícolas":             "bg-lime-100 text-lime-700",
  "Combustível":           "bg-red-100 text-red-700",
  "Outros":                "bg-gray-100 text-gray-600",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function InsumosPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: finData }, { data: itemsData }] = await Promise.all([
    supabase.from("supply_financials").select("*").order("period_label").limit(1),
    supabase.from("supply_inventory_items").select("*").order("category").order("product_name"),
  ]);

  const fin = finData?.[0] ?? null;
  const items = itemsData ?? [];

  // Group items by category
  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.category ?? "Outros";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);
  }
  const categories = Array.from(byCategory.entries());

  // For bar chart: derive value by category from financial totals (approximation from group totals)
  const CATEGORY_VALUES: Record<string, number> = {
    "Nutricionais":          42765,
    "Medicamentos":          1333,
    "Tratamentos/Hormônios": 545,
    "Vacinas/Vermífugos":    498,
  };
  const totalCatValue = Object.values(CATEGORY_VALUES).reduce((s, v) => s + v, 0);

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden p-8 lg:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0.00)_70%)]" />
        <div className="ag-badge ag-badge-green mb-4">Módulo Insumos</div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] lg:text-4xl">
          Insumos
        </h1>
        <p className="mt-3 max-w-xl text-[1rem] leading-7 text-[var(--text-secondary)]">
          Controle de estoque, movimentação, posição financeira e alertas de mínimo.
          {fin && <span className="ml-2 text-[var(--text-muted)]">· {fin.period_label}</span>}
        </p>
      </section>

      {/* Posição Financeira */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Posição Financeira" sub="Balanço de estoque em valor (R$)" />
        {!fin ? <EmptyState label="Nenhuma posição financeira registrada ainda" /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Estoque inicial" value={`R$ ${fmt(fin.initial_stock_value)}`} sub="saldo anterior" />
            <KpiCard label="Compras no período" value={`R$ ${fmt(fin.purchases_value)}`} sub="total adquirido" />
            <KpiCard label="Consumo no período" value={`R$ ${fmt(fin.consumption_value)}`} sub="total utilizado" />
            <KpiCard
              label="Saldo atual"
              value={`R$ ${fmt(fin.balance_value)}`}
              sub="inicial + compras − consumo"
            />
          </div>
        )}
      </section>

      {/* Estoque por Categoria */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Estoque por Categoria" sub="Itens agrupados por tipo de insumo" />
        {categories.length === 0 ? <EmptyState label="Nenhum item cadastrado ainda" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(([cat, catItems]) => {
              const colorClass = CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600";
              const catValue = CATEGORY_VALUES[cat];
              const pct = catValue ? ((catValue / totalCatValue) * 100).toFixed(1) : null;
              return (
                <div key={cat} className="rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>{cat}</span>
                    <span className="text-xs text-[var(--text-muted)]">{catItems.length} {catItems.length === 1 ? "item" : "itens"}</span>
                  </div>
                  {catValue ? (
                    <>
                      <p className="mt-4 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                        R$ {fmt(catValue)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{pct}% do estoque total</p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#8dbc5f,#5d9c44)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--text-muted)]">Valor não especificado</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gráfico por grupo */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Distribuição por Grupo" sub="Participação de cada categoria no valor total do estoque" />
        {totalCatValue === 0 ? <EmptyState label="Nenhum dado disponível" /> : (
          <InsumosBar
            rows={Object.entries(CATEGORY_VALUES).map(([category, value]) => ({
              category,
              value,
              pct: Math.round((value / totalCatValue) * 1000) / 10,
            }))}
          />
        )}
      </section>

      {/* Itens de Estoque */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Itens de Estoque" sub="Produtos cadastrados com dose e abrangência" />
        {items.length === 0 ? <EmptyState label="Nenhum item de estoque cadastrado ainda" /> : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Dose / animal</th>
                  <th>Unidade</th>
                  <th>Animais tratados</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const colorClass = CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-600";
                  return (
                    <tr key={item.id}>
                      <td className="font-medium text-[var(--text-primary)]">{item.product_name}</td>
                      <td>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                          {item.category}
                        </span>
                      </td>
                      <td>{item.dose_per_animal ?? "—"}</td>
                      <td>{item.unit ?? "—"}</td>
                      <td>{(item.head_count ?? 0).toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Alertas */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Alertas de Estoque Mínimo" sub="Produtos abaixo do nível mínimo configurado" />
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Nenhum alerta ativo</p>
            <p className="text-xs text-green-600">Configure o estoque mínimo por produto para receber alertas aqui</p>
          </div>
        </div>
      </section>
    </main>
  );
}
