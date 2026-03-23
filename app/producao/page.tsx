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

const FAIXAS = ["< 180 kg", "180–300 kg", "300–420 kg", "420–540 kg", "> 540 kg"];
const MESES = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
const FAIXAS_ETARIAS = ["0–6 meses", "7–12 meses", "13–24 meses", "> 24 meses"];

export default function ProducaoPage() {
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

      {/* Estoque de Animais */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Estoque de Animais" sub="Movimentação do período" />
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
              {["Bezerro(a)", "Novilho(a)", "Garrote/Novilha", "Boi/Vaca", "Touro"].map(cat => (
                <tr key={cat}>
                  <td className="font-medium text-[var(--text-primary)]">{cat}</td>
                  {Array(5).fill(null).map((_, i) => (
                    <td key={i} className="text-[var(--text-muted)]">—</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--border)] font-semibold">
                <td className="text-[var(--text-primary)]">Total</td>
                {Array(5).fill(null).map((_, i) => (
                  <td key={i} className="text-[var(--text-muted)]">—</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Distribuição por faixa de peso */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Distribuição por Faixa de Peso" sub="Quantidade de animais por intervalo de peso vivo" />
        <div className="space-y-3">
          {FAIXAS.map(f => (
            <div key={f} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-[var(--text-secondary)]">{f}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-lg bg-[var(--surface-soft)]">
                <div className="h-full w-0 rounded-lg bg-[var(--primary-soft)]" />
              </div>
              <span className="w-8 text-right text-xs text-[var(--text-muted)]">—</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">Nenhum dado de pesagem registrado ainda</p>
      </section>

      {/* Vendas históricas */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Vendas Históricas" sub="Receita mensal, GMD e GPD por período" />
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Cabeças</th>
                <th>Peso total (kg)</th>
                <th>Arrobas</th>
                <th>Receita (R$)</th>
                <th>GMD médio</th>
                <th>GPD médio</th>
              </tr>
            </thead>
            <tbody>
              {MESES.map(m => (
                <tr key={m}>
                  <td className="font-medium text-[var(--text-primary)]">{m}</td>
                  {Array(6).fill(null).map((_, i) => (
                    <td key={i} className="text-[var(--text-muted)]">—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EmptyState label="Nenhuma venda registrada ainda" />
      </section>

      {/* Entradas mensais de bezerros */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Entradas Mensais de Bezerros" sub="Nascimentos e compras por mês com peso médio" />
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Nascimentos</th>
                <th>Compras</th>
                <th>Total entradas</th>
                <th>Peso médio (kg)</th>
              </tr>
            </thead>
            <tbody>
              {MESES.map(m => (
                <tr key={m}>
                  <td className="font-medium text-[var(--text-primary)]">{m}</td>
                  {Array(4).fill(null).map((_, i) => (
                    <td key={i} className="text-[var(--text-muted)]">—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EmptyState label="Nenhuma entrada de bezerros registrada ainda" />
      </section>

      {/* Mortalidade por faixa etária */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Mortalidade por Faixa Etária" sub="Óbitos e participação percentual por grupo" />
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Faixa etária</th>
                <th>Animais no período</th>
                <th>Mortes</th>
                <th>% Mortalidade</th>
                <th>Causa principal</th>
              </tr>
            </thead>
            <tbody>
              {FAIXAS_ETARIAS.map(f => (
                <tr key={f}>
                  <td className="font-medium text-[var(--text-primary)]">{f}</td>
                  {Array(4).fill(null).map((_, i) => (
                    <td key={i} className="text-[var(--text-muted)]">—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EmptyState label="Nenhum óbito registrado ainda" />
      </section>
    </main>
  );
}
