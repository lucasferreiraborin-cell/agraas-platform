"use client";

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[80px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-6 py-8 text-sm text-[var(--text-muted)]">
      {label}
    </div>
  );
}

function KpiSlot({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="ag-card flex flex-col gap-1 p-5">
      <p className="ag-kpi-label">{label}</p>
      <p className="ag-kpi-value text-[var(--text-muted)]">—</p>
      <p className="text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="ag-section-title">{title}</h2>
      {sub && <p className="ag-section-subtitle">{sub}</p>}
    </div>
  );
}

const CATEGORIAS = [
  { label: "Nutricionais",  color: "bg-blue-100 text-blue-700" },
  { label: "Sanitários",    color: "bg-green-100 text-green-700" },
  { label: "Maquinários",   color: "bg-orange-100 text-orange-700" },
  { label: "Agrícolas",     color: "bg-yellow-100 text-yellow-700" },
  { label: "Combustível",   color: "bg-red-100 text-red-700" },
  { label: "Outros",        color: "bg-gray-100 text-gray-600" },
];

export default function InsumosPage() {
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
          Controle de estoque, movimentação diária, posição financeira e alertas de mínimo.
        </p>
      </section>

      {/* Posição Financeira */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Posição Financeira" sub="Balanço de estoque em valor (R$)" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiSlot label="Estoque inicial" sub="valor R$" />
          <KpiSlot label="Compras no período" sub="valor R$" />
          <KpiSlot label="Consumo no período" sub="valor R$" />
          <KpiSlot label="Saldo atual" sub="valor R$" />
        </div>
      </section>

      {/* Estoque por Categoria */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Estoque por Categoria" sub="Posição atual agrupada por tipo de insumo" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS.map(cat => (
            <div key={cat.label} className="rounded-2xl border border-[var(--border)] p-5">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cat.color}`}>
                  {cat.label}
                </span>
                <span className="text-xs text-[var(--text-muted)]">0 itens</span>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">—</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Nenhum dado registrado ainda</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
                <div className="h-full w-0 rounded-full bg-[var(--primary-soft)]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gráfico estoque por grupo */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Distribuição por Grupo" sub="Participação de cada categoria no estoque total" />
        <div className="space-y-3">
          {CATEGORIAS.map(cat => (
            <div key={cat.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-[var(--text-secondary)]">{cat.label}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-lg bg-[var(--surface-soft)]">
                <div className="h-full w-0 rounded-lg bg-[var(--primary-soft)]" />
              </div>
              <span className="w-10 text-right text-xs text-[var(--text-muted)]">0%</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">Nenhum insumo cadastrado ainda</p>
      </section>

      {/* Movimentação Diária */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Movimentação Diária" sub="Entradas e saídas por produto nos últimos 30 dias" />
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Unidade</th>
                <th>Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Nenhuma movimentação registrada ainda
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Alertas de Estoque Mínimo */}
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
        <div className="mt-4">
          <EmptyState label="Nenhum produto com estoque mínimo configurado" />
        </div>
      </section>
    </main>
  );
}
