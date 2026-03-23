"use client";

import { useState } from "react";

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

export default function ReprodutivoPage() {
  const [tab, setTab] = useState<"ia" | "touro">("ia");

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden p-8 lg:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0.00)_70%)]" />
        <div className="ag-badge ag-badge-green mb-4">Módulo Reprodutivo</div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] lg:text-4xl">
          Reprodutivo
        </h1>
        <p className="mt-3 max-w-xl text-[1rem] leading-7 text-[var(--text-secondary)]">
          Gestão da estação de monta, índices reprodutivos, partos e desmame.
        </p>
      </section>

      {/* Estação de Monta — KPIs */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Estação de Monta" sub="Indicadores do período atual" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiSlot label="Período" sub="início — fim" />
          <KpiSlot label="Fêmeas inseminadas" sub="total do período" />
          <KpiSlot label="Taxa de prenhez" sub="prenhas / total aptas" />
          <KpiSlot label="Taxa concepção IA" sub="concepções / IAs realizadas" />
        </div>
      </section>

      {/* Serviços de IA */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Breakdown por Serviço de IA" sub="Resultados acumulados por repasse" />
        <div className="mb-4 flex gap-2">
          {(["ia", "touro"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition ${
                tab === t
                  ? "border-[var(--primary-hover)] bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              {t === "ia" ? "Inseminação Artificial" : "Monta Natural"}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Inseminadas</th>
                <th>Prenhas</th>
                <th>Vazias</th>
                <th>Taxa (%)</th>
              </tr>
            </thead>
            <tbody>
              {["1ª IA", "2ª IA", "3ª IA"].map(row => (
                <tr key={row}>
                  <td className="font-medium text-[var(--text-primary)]">{row}</td>
                  <td className="text-[var(--text-muted)]">—</td>
                  <td className="text-[var(--text-muted)]">—</td>
                  <td className="text-[var(--text-muted)]">—</td>
                  <td className="text-[var(--text-muted)]">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gauge APTAS */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Fêmeas Aptas" sub="Percentual apto para inseminação" />
        <div className="flex flex-col items-center gap-4">
          <svg width="180" height="100" viewBox="0 0 180 100">
            {/* Track */}
            <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--border)" strokeWidth="16" strokeLinecap="round" />
            {/* Empty fill */}
            <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--surface-soft)" strokeWidth="14" strokeLinecap="round" />
            <text x="90" y="82" textAnchor="middle" className="fill-[var(--text-muted)]" fontSize="22" fontWeight="600">—%</text>
            <text x="90" y="98" textAnchor="middle" className="fill-[var(--text-muted)]" fontSize="10">Nenhum dado ainda</text>
          </svg>
          <div className="grid w-full max-w-sm gap-3 sm:grid-cols-3 text-center">
            {[["Aptas", "—"], ["Não aptas", "—"], ["Sem avaliação", "—"]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-[var(--surface-soft)] p-3">
                <p className="text-xs text-[var(--text-muted)]">{l}</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estoque de Reprodutores */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Estoque de Reprodutores" sub="Categoria × status reprodutivo" />
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Total</th>
                <th>Prenha</th>
                <th>Servida</th>
                <th>Vazia</th>
                <th>Parida</th>
                <th>Solteira</th>
              </tr>
            </thead>
            <tbody>
              {["Vaca", "Novilha", "Bezerra"].map(cat => (
                <tr key={cat}>
                  <td className="font-medium text-[var(--text-primary)]">{cat}</td>
                  {Array(6).fill(null).map((_, i) => (
                    <td key={i} className="text-[var(--text-muted)]">—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Partos */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Partos" sub="Nascimentos, perdas e mortes no período" />
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiSlot label="Nascidos vivos" sub="total do período" />
          <KpiSlot label="Perdas gestacionais" sub="abortos / natimortos" />
          <KpiSlot label="Mortes de gestante" sub="vacas perdidas" />
        </div>
        <div className="mt-4">
          <EmptyState label="Nenhum parto registrado ainda" />
        </div>
      </section>

      {/* Desmame */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Desmame" sub="Indicadores de desmame por sexo" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiSlot label="Desmamados" sub="total" />
          <KpiSlot label="Idade média" sub="dias" />
          <KpiSlot label="Peso médio" sub="kg" />
          <KpiSlot label="GPD médio" sub="g/dia" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Sexo</th>
                <th>Quantidade</th>
                <th>Idade média (dias)</th>
                <th>Peso médio (kg)</th>
                <th>GPD (g/dia)</th>
              </tr>
            </thead>
            <tbody>
              {["Macho", "Fêmea"].map(s => (
                <tr key={s}>
                  <td className="font-medium text-[var(--text-primary)]">{s}</td>
                  {Array(4).fill(null).map((_, i) => (
                    <td key={i} className="text-[var(--text-muted)]">—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dias perdidos */}
      <section className="ag-card p-6 lg:p-8">
        <SectionTitle title="Dias Perdidos por Categoria" sub="Eficiência reprodutiva por grupo" />
        <div className="overflow-x-auto">
          <table className="ag-table w-full">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Animais</th>
                <th>Dias perdidos totais</th>
                <th>Média por animal</th>
                <th>Impacto estimado</th>
              </tr>
            </thead>
            <tbody>
              {["Vaca", "Novilha"].map(cat => (
                <tr key={cat}>
                  <td className="font-medium text-[var(--text-primary)]">{cat}</td>
                  {Array(4).fill(null).map((_, i) => (
                    <td key={i} className="text-[var(--text-muted)]">—</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EmptyState label="Nenhum dado de dias perdidos registrado ainda" />
      </section>
    </main>
  );
}
