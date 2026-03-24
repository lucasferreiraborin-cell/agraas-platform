"use client";

import { PieChart, Pie, Cell } from "recharts";

type Props = { pct: number; apt: number; inseminated: number; toInseminate: number };

function tierColor(pct: number) {
  if (pct >= 75) return "#4ade80";
  if (pct >= 50) return "#f59e0b";
  return "#f87171";
}

export default function ReproGauge({ pct, apt, inseminated, toInseminate }: Props) {
  const color = tierColor(pct);
  const data = [
    { value: pct },
    { value: Math.max(0, 100 - pct) },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <PieChart width={220} height={220}>
          <defs>
            <radialGradient id="gaugeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.7} />
            </radialGradient>
          </defs>
          <Pie
            data={data}
            cx={105}
            cy={105}
            innerRadius={72}
            outerRadius={96}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={true}
            animationDuration={900}
            animationEasing="ease-out"
          >
            <Cell fill="url(#gaugeGrad)" />
            <Cell fill="var(--surface-soft)" />
          </Pie>
        </PieChart>

        {/* Centro */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ color, fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {pct.toFixed(1)}%
          </span>
          <span className="mt-1 text-xs font-medium text-[var(--text-muted)]">aptas para IA</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="grid w-full max-w-xs grid-cols-3 gap-3 text-center">
        {[
          { label: "Aptas", value: apt, color: "#4ade80" },
          { label: "Inseminadas", value: inseminated, color: "#60a5fa" },
          { label: "A inseminar", value: toInseminate, color: "#f59e0b" },
        ].map(({ label, value, color: c }) => (
          <div key={label} className="rounded-xl bg-[var(--surface-soft)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
            <p className="mt-1.5 text-xl font-bold" style={{ color: c }}>
              {(value ?? 0).toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
