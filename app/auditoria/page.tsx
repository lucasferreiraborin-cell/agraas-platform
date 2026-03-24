import { createSupabaseServerClient } from "@/lib/supabase-server";
import React from "react";

const IconCheck = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconWarn = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);
const IconX = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

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
  icon: React.ReactNode; label: string; value: number; note: string; variant: "green" | "amber" | "red";
}) {
  const cfg = {
    green: {
      border: "border-l-green-400",
      bg: "bg-white",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      valueCls: "text-green-600",
      badge: "bg-green-100 text-green-700",
      badgeText: "OK",
    },
    amber: {
      border: "border-l-amber-400",
      bg: "bg-white",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueCls: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
      badgeText: "Atenção",
    },
    red: {
      border: "border-l-red-400",
      bg: "bg-white",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      valueCls: "text-red-600",
      badge: "bg-red-100 text-red-700",
      badgeText: "Crítico",
    },
  }[variant];

  return (
    <div className={`flex items-center gap-5 rounded-2xl border border-[var(--border)] border-l-4 p-5 shadow-sm ${cfg.border} ${cfg.bg}`}>
      {/* Ícone */}
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
        <span className={`text-xl ${cfg.iconColor}`}>{icon}</span>
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${cfg.badge}`}>
            {cfg.badgeText}
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{note}</p>
      </div>

      {/* Valor */}
      <div className="shrink-0 text-right">
        <p className={`text-4xl font-extrabold tracking-[-0.04em] leading-none ${cfg.valueCls}`}>
          {value.toLocaleString("pt-BR")}
        </p>
        <p className="mt-1 text-[10px] text-[var(--text-muted)] uppercase tracking-[0.1em]">ocorrências</p>
      </div>
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
            <AlertPoint
              icon={snap.duplicates === 0 ? <IconCheck /> : <IconX />}
              label={snap.duplicates === 0 ? "Nenhum ID duplicado identificado" : "Duplicados encontrados"}
              value={snap.duplicates}
              note={snap.duplicates === 0 ? "Todos os identificadores são únicos no sistema" : "IDs com conflito — requer revisão imediata"}
              variant={snap.duplicates === 0 ? "green" : "red"}
            />
          </section>

          {/* Pontos de atenção */}
          <section className="ag-card p-6 lg:p-8">
            <SectionTitle title="Pontos de Atenção" sub="Inconsistências detectadas automaticamente" />
            <div className="space-y-3">
              <AlertPoint
                icon={<IconCheck />}
                label="IDs duplicados"
                value={snap.duplicates}
                note="Conflitos de identidade entre RFID e ID Usual"
                variant={snap.duplicates === 0 ? "green" : "red"}
              />
              <AlertPoint
                icon={<IconWarn />}
                label="Ajustes inseridos"
                value={snap.adjustments_inserted}
                note="Movimentações classificadas como ajuste de inventário"
                variant={snap.adjustments_inserted === 0 ? "green" : "amber"}
              />
              <AlertPoint
                icon={<IconX />}
                label="Saídas como ajuste"
                value={snap.exits_as_adjustment}
                note="Saídas registradas via ajuste — requer revisão de causa"
                variant={snap.exits_as_adjustment === 0 ? "green" : "red"}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
