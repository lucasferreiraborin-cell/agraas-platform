"use client";

/**
 * Gráfico de barras cash flow 12 meses — Recharts.
 * Entradas (verde) vs Saídas (âmbar) + linha saldo acumulado.
 */

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type MonthData = {
  month: string; // "Jan/25"
  entradas: number;
  saidas: number;
  saldo: number;
};

function formatBRL(v: number): string {
  return v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `R$ ${(v / 1_000).toFixed(0)}k`
    : `R$ ${v.toFixed(0)}`;
}

export default function CashFlowChart({ data }: { data: MonthData[] }) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatBRL}
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip
          formatter={(value: unknown, name: unknown) => [
            `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            name === "entradas" ? "Entradas" : name === "saidas" ? "Saídas" : "Saldo acumulado",
          ]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid var(--border)",
            fontSize: 12,
            boxShadow: "var(--shadow-card)",
          }}
        />
        <Legend
          formatter={(value) =>
            value === "entradas" ? "Entradas" : value === "saidas" ? "Saídas" : "Saldo acumulado"
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="entradas" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="saidas" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.8} />
        <Line
          type="monotone"
          dataKey="saldo"
          stroke="#1e40af"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 2"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
