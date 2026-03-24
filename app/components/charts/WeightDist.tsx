"use client";

import {
  BarChart, Bar, XAxis, YAxis, Cell, LabelList,
  ResponsiveContainer, Tooltip,
} from "recharts";

type WeightRow = { range_label: string; count: number | null; range_order?: number | null };

export default function WeightDist({ rows }: { rows: WeightRow[] }) {
  const counts = rows.map(r => r.count ?? 0);
  const maxCount = Math.max(...counts, 1);

  const data = rows.map(r => ({
    name: r.range_label,
    count: r.count ?? 0,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 28, right: 8, left: 0, bottom: 8 }}
          barCategoryGap="22%"
        >
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5d9c44" stopOpacity={1} />
              <stop offset="100%" stopColor="#8dbc5f" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="weightGradDim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8dbc5f" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#b5d98a" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, maxCount * 1.18]} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)", radius: 6 }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--border)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              fontSize: 12,
            }}
            formatter={(v) => [typeof v === "number" ? v.toLocaleString("pt-BR") : v, "Animais"]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={52}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.count === maxCount ? "url(#weightGrad)" : "url(#weightGradDim)"}
              />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: 12, fontWeight: 700, fill: "var(--text-primary)" }}
              formatter={(v: unknown) => typeof v === "number" && v > 0 ? v.toLocaleString("pt-BR") : ""}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legenda faixa dominante */}
      {data.length > 0 && (
        <p className="mt-1 text-center text-xs text-[var(--text-muted)]">
          Maior concentração:{" "}
          <span className="font-semibold text-[var(--text-secondary)]">
            {data.find(d => d.count === maxCount)?.name ?? "—"}
          </span>{" "}
          ({maxCount.toLocaleString("pt-BR")} animais)
        </p>
      )}
    </div>
  );
}
