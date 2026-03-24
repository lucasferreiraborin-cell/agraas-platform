"use client";

import {
  BarChart, Bar, XAxis, YAxis, Cell, LabelList,
  ResponsiveContainer, Tooltip,
} from "recharts";

type InsumosRow = { category: string; value: number; pct: number };

const CAT_COLORS: Record<string, string> = {
  "Nutricionais":          "#3b82f6",
  "Medicamentos":          "#22c55e",
  "Tratamentos/Hormônios": "#a855f7",
  "Vacinas/Vermífugos":    "#f59e0b",
  "Maquinários":           "#f97316",
  "Agrícolas":             "#84cc16",
  "Combustível":           "#ef4444",
  "Outros":                "#94a3b8",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function InsumosBar({ rows }: { rows: InsumosRow[] }) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const data = sorted.map(r => ({ ...r, label: `R$ ${fmt(r.value)}` }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(sorted.length * 56, 120)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 120, left: 8, bottom: 4 }}
        barCategoryGap="28%"
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="category"
          width={160}
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{
            borderRadius: 10,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            fontSize: 12,
          }}
          formatter={(v) => [`R$ ${fmt(typeof v === "number" ? v : 0)}`, "Valor"]}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={CAT_COLORS[entry.category] ?? "#94a3b8"}
              fillOpacity={0.8}
            />
          ))}
          <LabelList
            dataKey="label"
            position="right"
            style={{ fontSize: 12, fontWeight: 700, fill: "var(--text-primary)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
