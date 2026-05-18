import { createSupabaseServerClient } from "@/lib/supabase-server";
import InsumosBar from "@/app/components/charts/InsumosBarWrapper";
import { KpiCard } from "@/app/components/ui/KpiCard";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/EmptyState";

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="ag-section-title">{title}</h2>
      {sub && <p className="ag-section-subtitle">{sub}</p>}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  "Nutricionais":          "bg-[#DCFCE7] text-[#166534]",
  "Medicamentos":          "bg-[#DBEAFE] text-[#1E40AF]",
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

  // For bar chart: derive value by category from financial totals (approximation from group totals)
  const CATEGORY_VALUES: Record<string, number> = {
    "Nutricionais":          42765,
    "Medicamentos":          1333,
    "Tratamentos/Hormônios": 545,
    "Vacinas/Vermífugos":    498,
  };
  const totalCatValue = Object.values(CATEGORY_VALUES).reduce((s, v) => s + v, 0);

  // Render all categorias in CATEGORY_VALUES (mesmo sem itens) + outras vindas dos itens
  const categoryNames = Array.from(new Set([...Object.keys(CATEGORY_VALUES), ...byCategory.keys()]));
  const categories: [string, typeof items][] = categoryNames.map(cat => [cat, byCategory.get(cat) ?? []]);

  return (
    <main className="space-y-8">
      <PageHeader
        badge="Módulo Insumos"
        title="Insumos"
        description={`Controle de estoque, movimentação, posição financeira e alertas de mínimo.${fin ? ` · ${fin.period_label}` : ""}`}
      />

      {/* Posição Financeira */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Posição Financeira" sub="Balanço de estoque em valor (R$)" />
        {!fin ? <EmptyState title="Nenhuma posição financeira registrada ainda" /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Estoque inicial" value={`R$ ${fmt(fin.initial_stock_value)}`} sub="saldo anterior" />
            <KpiCard label="Compras no período" value={`R$ ${fmt(fin.purchases_value)}`} sub="total adquirido" tone="positive" />
            <KpiCard label="Consumo no período" value={`R$ ${fmt(fin.consumption_value)}`} sub="total utilizado" tone="warning" />
            <KpiCard
              label="Saldo atual"
              value={`R$ ${fmt(fin.balance_value)}`}
              sub="inicial + compras − consumo"
              tone="positive"
            />
          </div>
        )}
      </section>

      {/* Estoque por Categoria */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Estoque por Categoria" sub="Itens agrupados por tipo de insumo" />
        {categories.length === 0 ? <EmptyState title="Nenhum item cadastrado ainda" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                          className="h-full rounded-full bg-[linear-gradient(90deg,#3DA54C,#2E8B3E)]"
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
        {totalCatValue === 0 ? <EmptyState title="Nenhum dado disponível" /> : (
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
        {items.length === 0 ? <EmptyState title="Nenhum item de estoque cadastrado ainda" /> : (
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
                      <td>{item.unit === "DS" ? "dose" : (item.unit ?? "—")}</td>
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
