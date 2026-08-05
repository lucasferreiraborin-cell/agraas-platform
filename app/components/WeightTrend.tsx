"use client";

/**
 * Curva de crescimento do animal — sparkline de área (peso × tempo) com GMD.
 * SVG puro, leve, sem dependência de lib de gráfico. Usado no passaporte do
 * animal para dar profundidade de dado à leitura do ativo.
 */

import { TrendingUp } from "lucide-react";

type Point = { date: string | null; weight: number };

export default function WeightTrend({ points }: { points: Point[] }) {
  const clean = points.filter((p) => p.date && Number.isFinite(p.weight));

  if (clean.length < 2) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Curva de crescimento
        </p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Registre ao menos duas pesagens para visualizar a evolução de peso e o
          ganho médio diário (GMD).
        </p>
      </div>
    );
  }

  const weights = clean.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const W = 520;
  const H = 150;
  const padX = 10;
  const padTop = 16;
  const padBottom = 14;
  const n = clean.length;

  const xs = clean.map((_, i) => padX + (i / (n - 1)) * (W - 2 * padX));
  const ys = clean.map(
    (p) => padTop + (1 - (p.weight - min) / range) * (H - padTop - padBottom),
  );

  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xs[n - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;

  const first = clean[0];
  const last = clean[n - 1];
  const days = (new Date(last.date as string).getTime() - new Date(first.date as string).getTime()) / 86_400_000;
  const gmd = days > 0 ? (last.weight - first.weight) / days : null;
  const totalGain = last.weight - first.weight;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Curva de crescimento
        </p>
        <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
          {last.weight} <span className="text-xs font-normal text-[var(--text-muted)]">kg</span>
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full overflow-visible" role="img" aria-label="Evolução de peso">
        <defs>
          <linearGradient id="wt-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#wt-area)" />
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={ys[i]}
            r={i === n - 1 ? 5 : 3}
            fill={i === n - 1 ? "var(--primary)" : "#fff"}
            stroke="var(--primary)"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-soft)] px-2.5 py-1 text-[var(--primary)]">
          <TrendingUp size={13} />
          <span className="text-sm font-semibold tabular-nums">
            {gmd != null ? `${gmd.toFixed(2)} kg/dia` : "—"}
          </span>
          <span className="text-[.6875rem] font-medium opacity-80">GMD</span>
        </div>
        <p className="text-[.6875rem] text-[var(--text-muted)]">
          {n} pesagens · +{totalGain.toFixed(0)} kg · {fmtDate(first.date)}–{fmtDate(last.date)}
        </p>
      </div>
    </div>
  );
}
