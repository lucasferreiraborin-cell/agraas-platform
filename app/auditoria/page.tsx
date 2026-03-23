import { createSupabaseServerClient } from "@/lib/supabase-server";

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

function StatCard({
  label, valueIn, labelIn, valueOut, labelOut, variant = "neutral",
}: {
  label: string;
  valueIn: number;
  labelIn: string;
  valueOut: number;
  labelOut: string;
  variant?: "neutral" | "green" | "amber" | "red";
}) {
  const border = { neutral: "border-[var(--border)]", green: "border-green-200", amber: "border-amber-200", red: "border-red-200" }[variant];
  const bg    = { neutral: "bg-[var(--surface-soft)]", green: "bg-green-50", amber: "bg-amber-50", red: "bg-red-50" }[variant];
  const text  = { neutral: "text-[var(--text-primary)]", green: "text-green-700", amber: "text-amber-700", red: "text-red-700" }[variant];
  return (
    <div className={`rounded-2xl border p-5 ${border} ${bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]`}>{label}</p>
      <div className={`mt-3 flex items-end justify-between gap-2 ${text}`}>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">{labelIn}</p>
          <p className="text-2xl font-semibold">{valueIn.toLocaleString("pt-BR")}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-muted)]">{labelOut}</p>
          <p className="text-2xl font-semibold">{valueOut.toLocaleString("pt-BR")}</p>
        </div>
      </div>
    </div>
  );
}

function AlertPoint({
  icon, label, value, note, variant,
}: {
  icon: string; label: string; value: number; note: string; variant: "green" | "amber" | "red";
}) {
  const colors = {
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red:   "border-red-200 bg-red-50 text-red-800",
  }[variant];
  const sub = { green: "text-green-600", amber: "text-amber-600", red: "text-red-600" }[variant];
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 ${colors}`}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className={`text-xs ${sub}`}>{note}</p>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}

export default async function AuditoriaPage() {
  const supabase = await createSupabaseServerClient();

  const { data: snapshots } = await supabase
    .from("audit_snapshot")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  const snap = snapshots?.[0] ?? null;

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
          Reconciliação do rebanho, rastreabilidade de saídas e pontos de atenção.
          {snap && (
            <span className="ml-2 text-[var(--text-muted)]">
              · Snapshot {new Date(snap.snapshot_date).toLocaleDateString("pt-BR")}
            </span>
          )}
        </p>
      </section>

      {!snap ? (
        <EmptyState label="Nenhum dado de auditoria registrado ainda" />
      ) : (
        <>
          {/* Reconciliação */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Reconciliação do Rebanho" sub="Entrada versus saída por categoria de movimentação" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Inventariados"
                valueIn={snap.inventoried_in}
                labelIn="entrada"
                valueOut={snap.inventoried_out}
                labelOut="saldo"
                variant="green"
              />
              <StatCard
                label="Com movimentação"
                valueIn={snap.movements_in}
                labelIn="entrada"
                valueOut={snap.movements_out}
                labelOut="saldo"
                variant="neutral"
              />
              <StatCard
                label="Não inventariados"
                valueIn={snap.not_inventoried_in}
                labelIn="entrada"
                valueOut={snap.not_inventoried_out}
                labelOut="saldo"
                variant="amber"
              />
            </div>

            {/* Totais */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Total presentes"
                valueIn={snap.total_present_in}
                labelIn="entrada"
                valueOut={snap.total_present_out}
                labelOut="saldo"
                variant="neutral"
              />
              <StatCard
                label="Estoque total"
                valueIn={snap.total_stock_in}
                labelIn="entrada"
                valueOut={snap.total_stock_out}
                labelOut="saldo"
                variant="neutral"
              />
            </div>

            {/* Diferença */}
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Saídas totais (entrada − saldo)</p>
              <div className="mt-2 flex items-end gap-6">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Inventariados</p>
                  <p className="text-xl font-semibold text-[var(--text-primary)]">
                    {(snap.inventoried_in - snap.inventoried_out).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Não inventariados</p>
                  <p className="text-xl font-semibold text-[var(--text-primary)]">
                    {Math.abs(snap.not_inventoried_in - snap.not_inventoried_out).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Estoque total</p>
                  <p className="text-xl font-semibold text-[var(--text-primary)]">
                    {(snap.total_stock_in - snap.total_stock_out).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* IDs duplicados */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="IDs Duplicados" sub="RFID e ID Usual com conflito de identidade" />
            {snap.duplicates === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Nenhum ID duplicado identificado</p>
                  <p className="text-xs text-green-600">Todos os identificadores são únicos no sistema</p>
                </div>
              </div>
            ) : (
              <AlertPoint
                icon="⚠️"
                label="Duplicados encontrados"
                value={snap.duplicates}
                note="IDs com conflito — requer revisão"
                variant="red"
              />
            )}
          </section>

          {/* Pontos de atenção */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Pontos de Atenção" sub="Inconsistências detectadas automaticamente" />
            <div className="space-y-3">
              <AlertPoint
                icon="✅"
                label="IDs duplicados"
                value={snap.duplicates}
                note="Nenhum conflito de identidade detectado"
                variant="green"
              />
              <AlertPoint
                icon="⚠️"
                label="Ajustes inseridos"
                value={snap.adjustments_inserted}
                note="Movimentações classificadas como ajuste de inventário"
                variant="amber"
              />
              <AlertPoint
                icon="🔴"
                label="Saídas como ajuste"
                value={snap.exits_as_adjustment}
                note="Saídas registradas via ajuste — requer revisão de causa"
                variant="red"
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
