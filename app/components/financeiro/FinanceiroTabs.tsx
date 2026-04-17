"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, FileText, ArrowLeftRight, Scale } from "lucide-react";
import { ReceitaCustoChart, FluxoCaixaChart } from "./FinanceiroCharts";
import type { MonthRow, CashRow } from "./FinanceiroCharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (v: number) => `${v.toFixed(1)}%`;

// ── Types ────────────────────────────────────────────────────────────────────
export type FinanceiroData = {
  kpis: { receitaTotal: number; custoTotal: number; resultado: number; margem: number; roiMedio: number; custoPorArroba: number };
  monthlyData: MonthRow[];
  dre: { receitaVendas: number; receitaAbates: number; custoInsumos: number; custoAlimentacao: number; custoMaoObra: number; outrosCustos: number };
  cashFlow: CashRow[];
  cashProjectionStart: number;
  balanco: {
    animaisVenda: number; estoqueInsumos: number; contasReceber: number;
    animaisReproducao: number; ativoFixo: number;
    contasPagar: number; financiamentos: number;
  };
};

const TABS = [
  { key: "visao", label: "Visão Geral", icon: BarChart3 },
  { key: "dre", label: "DRE", icon: FileText },
  { key: "fluxo", label: "Fluxo de Caixa", icon: ArrowLeftRight },
  { key: "balanco", label: "Balanço", icon: Scale },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function FinanceiroTabs({ data }: { data: FinanceiroData }) {
  const [tab, setTab] = useState<TabKey>("visao");
  const { kpis, monthlyData, dre, cashFlow, cashProjectionStart, balanco } = data;

  const receitaTotal = dre.receitaVendas + dre.receitaAbates;
  const custoTotal = dre.custoInsumos + dre.custoAlimentacao + dre.custoMaoObra + dre.outrosCustos;
  const ebitda = receitaTotal - custoTotal;

  const ativoCirculante = balanco.animaisVenda + balanco.estoqueInsumos + balanco.contasReceber;
  const ativoFixoTotal = balanco.animaisReproducao + balanco.ativoFixo;
  const ativoTotal = ativoCirculante + ativoFixoTotal;
  const passivoTotal = balanco.contasPagar + balanco.financiamentos;
  const patrimonioLiquido = ativoTotal - passivoTotal;

  return (
    <>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl bg-[var(--surface-soft)] p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.key ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Visão Geral ──────────────────────────────────────────────── */}
      {tab === "visao" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Receita total" value={fmt(kpis.receitaTotal)} color="text-emerald-600" />
            <KpiCard label="Custo total" value={fmt(kpis.custoTotal)} color="text-[#D97706]" />
            <KpiCard label="Resultado líquido" value={fmt(kpis.resultado)} color={kpis.resultado >= 0 ? "text-emerald-600" : "text-red-500"} />
            <KpiCard label="Margem líquida" value={pct(kpis.margem)} color={kpis.margem >= 0 ? "text-emerald-600" : "text-red-500"} />
            <KpiCard label="ROI médio" value={pct(kpis.roiMedio)} color="text-blue-600" />
            <KpiCard label="Custo por @" value={fmt(kpis.custoPorArroba)} color="text-[var(--text-primary)]" />
          </div>

          <section className="ag-card p-6 space-y-3">
            <h3 className="ag-section-title">Receitas vs Custos — últimos meses</h3>
            <ReceitaCustoChart data={monthlyData} />
          </section>
        </div>
      )}

      {/* ── DRE ──────────────────────────────────────────────────────── */}
      {tab === "dre" && (
        <section className="ag-card p-6 lg:p-8 space-y-6">
          <h3 className="ag-section-title">Demonstração do Resultado</h3>

          <div className="space-y-1 text-sm">
            <DreRow label="(+) Venda de animais" value={dre.receitaVendas} indent={1} />
            <DreRow label="(+) Venda de abates" value={dre.receitaAbates} indent={1} />
            <DreSeparator />
            <DreRow label="(=) RECEITA TOTAL" value={receitaTotal} bold />

            <div className="h-3" />
            <DreRow label="(-) Insumos e medicamentos" value={-dre.custoInsumos} indent={1} />
            <DreRow label="(-) Alimentação" value={-dre.custoAlimentacao} indent={1} />
            <DreRow label="(-) Mão de obra" value={-dre.custoMaoObra} indent={1} />
            <DreRow label="(-) Outros custos" value={-dre.outrosCustos} indent={1} />
            <DreSeparator />
            <DreRow label="(=) CUSTO OPERACIONAL" value={-custoTotal} bold />

            <div className="h-3" />
            <DreSeparator />
            <DreRow label="(=) RESULTADO OPERACIONAL (EBITDA)" value={ebitda} bold highlight />
          </div>
        </section>
      )}

      {/* ── Fluxo de Caixa ───────────────────────────────────────────── */}
      {tab === "fluxo" && (
        <section className="ag-card p-6 space-y-4">
          <h3 className="ag-section-title">Fluxo de Caixa Acumulado</h3>
          <p className="ag-section-subtitle">Entradas e saídas reais + projeção 90 dias</p>
          <FluxoCaixaChart data={cashFlow} projectionStart={cashProjectionStart} />
        </section>
      )}

      {/* ── Balanço ──────────────────────────────────────────────────── */}
      {tab === "balanco" && (
        <section className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ativo */}
            <div className="ag-card p-6 space-y-4">
              <h3 className="ag-section-title">ATIVO</h3>
              <div className="space-y-1 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mt-2">Ativo Circulante</p>
                <BalRow label="Animais para venda" value={balanco.animaisVenda} />
                <BalRow label="Estoque de insumos" value={balanco.estoqueInsumos} />
                <BalRow label="Contas a receber" value={balanco.contasReceber} />
                <DreSeparator />
                <BalRow label="Subtotal" value={ativoCirculante} bold />

                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mt-4">Ativo Fixo</p>
                <BalRow label="Animais de reprodução (Score Agraas)" value={balanco.animaisReproducao} />
                <BalRow label="Equipamentos e terra" value={balanco.ativoFixo} />
                <DreSeparator />
                <BalRow label="Subtotal" value={ativoFixoTotal} bold />

                <div className="h-2" />
                <BalRow label="ATIVO TOTAL" value={ativoTotal} bold highlight />
              </div>
            </div>

            {/* Passivo + PL */}
            <div className="ag-card p-6 space-y-4">
              <h3 className="ag-section-title">PASSIVO + PL</h3>
              <div className="space-y-1 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mt-2">Passivo</p>
                <BalRow label="Contas a pagar" value={balanco.contasPagar} />
                <BalRow label="Financiamentos" value={balanco.financiamentos} />
                <DreSeparator />
                <BalRow label="PASSIVO TOTAL" value={passivoTotal} bold />

                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mt-4">Patrimônio Líquido</p>
                <DreSeparator />
                <BalRow label="PATRIMÔNIO LÍQUIDO" value={patrimonioLiquido} bold highlight />
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="ag-kpi-card p-5">
      <p className="ag-kpi-label">{label}</p>
      <p className={`ag-kpi-value ${color}`}>{value}</p>
    </div>
  );
}

function DreRow({ label, value, indent, bold, highlight }: { label: string; value: number; indent?: number; bold?: boolean; highlight?: boolean }) {
  const color = value >= 0 ? "text-emerald-600" : "text-red-500";
  return (
    <div className={`flex items-center justify-between py-1.5 ${highlight ? "rounded-xl bg-[var(--primary-soft)] px-3 py-2.5" : ""}`}>
      <span className={`${bold ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`} style={{ paddingLeft: indent ? indent * 20 : 0 }}>
        {label}
      </span>
      <span className={`tabular-nums font-medium ${bold ? `font-bold ${color}` : color}`}>{fmt(value)}</span>
    </div>
  );
}

function BalRow({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return <DreRow label={label} value={value} bold={bold} highlight={highlight} />;
}

function DreSeparator() {
  return <div className="border-t border-[var(--border)]" />;
}
