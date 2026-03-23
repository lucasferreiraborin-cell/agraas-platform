"use client";

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[80px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-6 py-8 text-sm text-[var(--text-muted)]">
      {label}
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

function CounterCard({
  label, value, sub, variant = "neutral",
}: {
  label: string; value: string | number; sub: string; variant?: "neutral" | "green" | "amber" | "red";
}) {
  const colors = {
    neutral: "border-[var(--border)] bg-[var(--surface-soft)]",
    green:   "border-green-200 bg-green-50",
    amber:   "border-amber-200 bg-amber-50",
    red:     "border-red-200 bg-red-50",
  };
  const textColors = {
    neutral: "text-[var(--text-primary)]",
    green:   "text-green-700",
    amber:   "text-amber-700",
    red:     "text-red-700",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[variant]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${textColors[variant]}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

const SAIDAS_CATEGORIAS = ["Venda", "Morte", "Transferência", "Ajuste de inventário", "Abate"];

export default function AuditoriaPage() {
  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden p-8 lg:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0.00)_70%)]" />
        <div className="ag-badge ag-badge-green mb-4">Módulo Auditoria</div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] lg:text-4xl">
          Auditoria
        </h1>
        <p className="mt-3 max-w-xl text-[1rem] leading-7 text-[var(--text-secondary)]">
          Reconciliação do rebanho, rastreabilidade de saídas, alertas de duplicidade e pontos de atenção.
        </p>
      </section>

      {/* Reconciliação do Rebanho */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Reconciliação do Rebanho" sub="Inventário × registros ativos × movimentações" />
        <div className="grid gap-4 sm:grid-cols-3">
          <CounterCard label="Inventariados" value="—" sub="animais com registro ativo" variant="green" />
          <CounterCard label="Não inventariados" value="—" sub="sem movimentação recente" variant="amber" />
          <CounterCard label="Com movimentação" value="—" sub="transferência / saída / entrada" variant="neutral" />
        </div>
        <div className="mt-4">
          <EmptyState label="Nenhum dado de inventário registrado ainda" />
        </div>
      </section>

      {/* Saídas por Categoria */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Saídas por Categoria" sub="Classificação de todas as baixas do período" />
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Categoria de saída</th>
                <th>Quantidade</th>
                <th>% do total</th>
                <th>Valor envolvido (R$)</th>
                <th>Última ocorrência</th>
              </tr>
            </thead>
            <tbody>
              {SAIDAS_CATEGORIAS.map(cat => (
                <tr key={cat}>
                  <td className="font-medium text-[var(--text-primary)]">{cat}</td>
                  <td className="text-[var(--text-muted)]">—</td>
                  <td className="text-[var(--text-muted)]">—</td>
                  <td className="text-[var(--text-muted)]">—</td>
                  <td className="text-[var(--text-muted)]">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EmptyState label="Nenhuma saída registrada ainda" />
      </section>

      {/* Alertas de IDs Duplicados */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Alertas de IDs Duplicados" sub="RFID e ID Usual com mais de um animal associado" />
        <div className="grid gap-4 sm:grid-cols-2">
          <CounterCard label="RFID duplicados" value="—" sub="leituras com conflito de identidade" variant="neutral" />
          <CounterCard label="ID Usual duplicados" value="—" sub="brincos / marcações repetidas" variant="neutral" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Código</th>
                <th>Animais afetados</th>
                <th>Propriedades</th>
                <th>Ação sugerida</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Nenhum ID duplicado identificado
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pontos de Atenção */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Pontos de Atenção" sub="Inconsistências detectadas automaticamente" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CounterCard label="Sem pesagem recente" value="—" sub="mais de 60 dias sem peso" variant="amber" />
          <CounterCard label="Sem propriedade" value="—" sub="animais sem localização" variant="red" />
          <CounterCard label="Certs vencidas" value="—" sub="certificações expiradas" variant="amber" />
          <CounterCard label="Eventos pendentes" value="—" sub="registros incompletos" variant="neutral" />
        </div>
        <div className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Sistema pronto para auditoria</p>
              <p className="text-xs text-green-600">Nenhuma inconsistência detectada — popule os dados para ativar os alertas</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
