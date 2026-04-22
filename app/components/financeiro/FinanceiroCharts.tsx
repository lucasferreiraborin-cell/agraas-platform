"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const BarChartLazy = dynamic(() => import("recharts").then(m => {
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = m;
  return { default: ({ data }: { data: MonthRow[] }) => (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
          formatter={(v) => [`R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receita" name="Receita" fill="#2E8B3E" radius={[4, 4, 0, 0]} />
        <Bar dataKey="custo" name="Custo" fill="#d97706" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )};
}), { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-2xl bg-[var(--surface-soft)]" /> });

const AreaChartLazy = dynamic(() => import("recharts").then(m => {
  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } = m;
  return { default: ({ data, projectionStart }: { data: CashRow[]; projectionStart: number }) => (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
          formatter={(v) => [`R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]} />
        {projectionStart > 0 && <ReferenceLine x={data[projectionStart]?.label} stroke="#94a3b8" strokeDasharray="6 4" label={{ value: "Projeção", fill: "#94a3b8", fontSize: 10 }} />}
        <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#2E8B3E" fill="url(#greenGrad)" strokeWidth={2} />
        <defs>
          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E8B3E" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#2E8B3E" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </AreaChart>
    </ResponsiveContainer>
  )};
}), { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-2xl bg-[var(--surface-soft)]" /> });

export type MonthRow = { month: string; receita: number; custo: number };
export type CashRow = { label: string; saldo: number; isProjection?: boolean };

export function ReceitaCustoChart({ data }: { data: MonthRow[] }) {
  return <BarChartLazy data={data} />;
}

export function FluxoCaixaChart({ data, projectionStart }: { data: CashRow[]; projectionStart: number }) {
  return <AreaChartLazy data={data} projectionStart={projectionStart} />;
}
