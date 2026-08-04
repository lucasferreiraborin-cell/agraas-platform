"use client";

/**
 * Demo interativo do Score Agraas na landing page.
 *
 * O visitante ajusta os 5 fatores (pesos fixos da metodologia v3) e vê o
 * score recalcular ao vivo, com o ring mudando de faixa/cor. Torna tangível
 * o claim "cada evento recalcula, fórmula transparente e auditável" — sem
 * precisar de login. Mesma paleta de faixas do ScoreRing (passaporte,
 * dashboard, marketplace).
 */

import { useState } from "react";
import { motion } from "framer-motion";

type DimKey = "produtivo" | "sanitario" | "continuidade" | "operacional" | "rastreabilidade";

const DIMS: { key: DimKey; label: string; weight: number; desc: string }[] = [
  { key: "produtivo", label: "Produtivo", weight: 28, desc: "GMD, natalidade e eficiência reprodutiva vs. média da raça e fase." },
  { key: "sanitario", label: "Sanitário", weight: 24, desc: "Vacinação em dia, carência MAPA respeitada, calendário profilático." },
  { key: "continuidade", label: "Continuidade", weight: 20, desc: "Regularidade dos eventos ao longo do tempo — sem gaps nem interrupções." },
  { key: "operacional", label: "Operacional", weight: 18, desc: "Qualidade do dado e tempo entre o evento real e o registro digital." },
  { key: "rastreabilidade", label: "Rastreabilidade", weight: 10, desc: "Genealogia, GTA, origem e movimentações — cadeia de custódia completa." },
];

type Preset = { name: string; vals: Record<DimKey, number> };
const PRESETS: Preset[] = [
  { name: "Cria regular", vals: { produtivo: 72, sanitario: 85, continuidade: 78, operacional: 70, rastreabilidade: 80 } },
  { name: "Terminação premium", vals: { produtivo: 92, sanitario: 88, continuidade: 84, operacional: 82, rastreabilidade: 74 } },
  { name: "Operação com gaps", vals: { produtivo: 55, sanitario: 48, continuidade: 40, operacional: 45, rastreabilidade: 32 } },
];

function band(score: number) {
  if (score >= 70) return { arc: "#2d9b6f", track: "rgba(45,155,111,0.16)", label: "Premium", chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" };
  if (score >= 50) return { arc: "#d4930a", track: "rgba(212,147,10,0.16)", label: "Padrão", chip: "border-amber-500/30 bg-amber-500/10 text-amber-400" };
  return { arc: "#c0392b", track: "rgba(192,57,43,0.16)", label: "Revisar", chip: "border-red-500/30 bg-red-500/10 text-red-400" };
}

export default function InteractiveScoreDemo() {
  const [vals, setVals] = useState<Record<DimKey, number>>(PRESETS[0].vals);
  const [active, setActive] = useState<string | null>(PRESETS[0].name);

  const score = Math.round(DIMS.reduce((s, d) => s + vals[d.key] * d.weight, 0) / 100);
  const b = band(score);

  const box = 184, r = 70, stroke = 16, cx = box / 2, cy = box / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);

  function setDim(key: DimKey, v: number) {
    setVals((p) => ({ ...p, [key]: v }));
    setActive(null);
  }

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
      {/* ── Ring ao vivo + cenários ── */}
      <div className="rounded-3xl border border-white/[.08] bg-white/[.02] p-8 backdrop-blur-sm">
        <p className="text-center text-[.8125rem] font-medium text-white/55">
          Simule um rebanho — ajuste os fatores ao lado
        </p>

        <div className="mt-6 flex justify-center">
          <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-label={`Score ${score}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={b.track} strokeWidth={stroke} />
            <motion.circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={b.arc}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              animate={{ strokeDashoffset: offset, stroke: b.arc }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" fontSize={46} fontWeight={700} fill="#ffffff" fontFamily="inherit">
              {score}
            </text>
            <text x={cx} y={cy + 26} textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="rgba(255,255,255,0.4)" fontFamily="inherit">
              / 100
            </text>
          </svg>
        </div>

        <div className="mt-4 flex justify-center">
          <span className={`rounded-md border px-2.5 py-0.5 text-[.6875rem] font-semibold ${b.chip}`}>
            {score} · {b.label}
          </span>
        </div>

        <div className="mt-7">
          <p className="text-center text-[.6875rem] uppercase tracking-[.14em] text-white/35">Cenários</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => { setVals(p.vals); setActive(p.name); }}
                className={`rounded-full border px-3 py-1 text-[.75rem] font-medium transition ${
                  active === p.name
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-white"
                    : "border-white/12 text-white/55 hover:border-white/25 hover:text-white/80"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-7 text-center text-[.7rem] leading-[1.6] text-white/40">
          Mesma fórmula e faixas do passaporte público, do dashboard logado e do marketplace.
        </p>
      </div>

      {/* ── 5 fatores ajustáveis ── */}
      <div>
        <p className="text-[.8125rem] font-semibold uppercase tracking-[.1em] text-[var(--primary)]">
          5 dimensões · pesos fixos, fórmula transparente
        </p>
        <h3 className="mt-3 text-[1.5rem] font-medium leading-[1.25] text-white">
          Mexa nos fatores. O score recalcula na hora.
        </h3>

        <div className="mt-7 space-y-5">
          {DIMS.map((d) => {
            const v = vals[d.key];
            const contribution = (v * d.weight) / 100;
            return (
              <div key={d.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[.9375rem] font-semibold text-white">{d.label}</span>
                  <span className="font-mono text-[.72rem] text-white/45">
                    peso {d.weight}% · <span className="text-[var(--primary)]">+{contribution.toFixed(1)} pts</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={v}
                  onChange={(e) => setDim(d.key, Number(e.target.value))}
                  aria-label={`${d.label} — ${v}`}
                  style={{ accentColor: b.arc }}
                  className="mt-2 w-full cursor-pointer"
                />
                <p className="mt-1.5 text-[.8125rem] leading-[1.6] text-white/45">{d.desc}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-8 rounded-xl border border-white/[.08] bg-white/[.03] p-5 text-[.9375rem] leading-[1.7] text-white/70">
          Cada evento no campo recalcula. Cada recálculo é auditável. Nenhuma nota
          pode ser manipulada retroativamente.
        </p>
      </div>
    </div>
  );
}
