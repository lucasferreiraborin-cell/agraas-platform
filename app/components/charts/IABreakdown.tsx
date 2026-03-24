"use client";

import {
  BarChart, Bar, XAxis, YAxis, Cell, LabelList,
  ResponsiveContainer, Tooltip,
} from "recharts";

type IARow = {
  service_number: number;
  inseminated: number | null;
  diagnosed: number | null;
  pregnant: number | null;
  conception_rate: number | null;
};

function barColor(rate: number) {
  if (rate >= 50) return "#4ade80";
  if (rate >= 30) return "#f59e0b";
  return "#f87171";
}

export default function IABreakdown({ rows }: { rows: IARow[] }) {
  const data = rows.map(r => ({
    name: `${r.service_number}ª IA`,
    taxa: Number((r.conception_rate ?? 0).toFixed(1)),
    gestantes: r.pregnant ?? 0,
    inseminadas: r.inseminated ?? 0,
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={Math.max(data.length * 64, 120)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 80, left: 12, bottom: 4 }}
          barCategoryGap="30%"
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={52}
            tick={{ fontSize: 12, fill: "var(--text-secondary)", fontWeight: 600 }}
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
            formatter={(value, name) => [
              name === "taxa" ? `${value}%` : value,
              name === "taxa" ? "Taxa de concepção" : String(name),
            ]}
          />
          <Bar dataKey="taxa" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.taxa)} fillOpacity={0.85} />
            ))}
            <LabelList
              dataKey="taxa"
              position="right"
              formatter={(v: unknown) => v != null ? `${v}%` : ""}
              style={{ fontSize: 13, fontWeight: 700, fill: "var(--text-primary)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Tabela de detalhes compacta */}
      <div className="overflow-x-auto">
        <table className="ag-table w-full">
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Inseminadas</th>
              <th>Diagnósticos</th>
              <th>Gestantes</th>
              <th>Concepção</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const rate = row.conception_rate ?? 0;
              const color = barColor(rate);
              return (
                <tr key={row.service_number}>
                  <td className="font-medium text-[var(--text-primary)]">{row.service_number}ª IA</td>
                  <td>{(row.inseminated ?? 0).toLocaleString("pt-BR")}</td>
                  <td>{(row.diagnosed ?? 0).toLocaleString("pt-BR")}</td>
                  <td>{(row.pregnant ?? 0).toLocaleString("pt-BR")}</td>
                  <td>
                    <span className="font-bold" style={{ color }}>{rate.toFixed(1)}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
