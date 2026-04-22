"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export type ScoreRingSize = "sm" | "md" | "lg";
export type ScoreRingVariant = "light" | "dark";

export interface ScoreDimension {
  label: string;
  weight: number;
}

interface ScoreRingProps {
  score: number;
  size?: ScoreRingSize;
  variant?: ScoreRingVariant;
  label?: string;
  sub?: string;
  breakdown?: ScoreDimension[];
  delay?: number;
  animate?: boolean;
}

const SIZE_MAP: Record<ScoreRingSize, {
  box: number;
  r: number;
  stroke: number;
  fontScore: number;
  fontSub: number;
}> = {
  sm: { box: 96,  r: 40, stroke: 7,  fontScore: 22, fontSub: 10 },
  md: { box: 140, r: 52, stroke: 14, fontScore: 30, fontSub: 11 },
  lg: { box: 180, r: 68, stroke: 16, fontScore: 40, fontSub: 13 },
};

function colorForScore(score: number) {
  if (score >= 70) return { arc: "#2d9b6f", track: "#d1fae5" };
  if (score >= 50) return { arc: "#d4930a", track: "#fef3c7" };
  return { arc: "#c0392b", track: "#fee2e2" };
}

function darkTrackForScore(score: number) {
  if (score >= 70) return "rgba(45, 155, 111, 0.14)";
  if (score >= 50) return "rgba(212, 147, 10, 0.16)";
  return "rgba(192, 57, 43, 0.16)";
}

export default function ScoreRing({
  score,
  size = "md",
  variant = "light",
  label,
  sub,
  breakdown,
  delay = 0,
  animate = true,
}: ScoreRingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });

  const { box, r, stroke, fontScore, fontSub } = SIZE_MAP[size];
  const cx = box / 2;
  const cy = box / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const targetOffset = circ * (1 - pct / 100);
  const { arc, track } = colorForScore(score);
  const trackColor = variant === "dark" ? darkTrackForScore(score) : track;
  const numberColor = variant === "dark" ? "#ffffff" : arc;
  const subColor = variant === "dark" ? "rgba(255,255,255,0.4)" : "#9ca3af";
  const labelColor = variant === "dark" ? "#ffffff" : "var(--text-primary)";
  const shouldAnimate = animate && inView;

  return (
    <div ref={ref} className="inline-flex flex-col items-center">
      <motion.div
        initial={animate ? { opacity: 0, scale: 0.85 } : undefined}
        animate={shouldAnimate ? { opacity: 1, scale: 1 } : animate ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay, ease: [0.19, 1, 0.22, 1] }}
        style={{ width: box, height: box }}
        className="relative"
      >
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-label={`Score ${score}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={animate ? { strokeDashoffset: circ } : { strokeDashoffset: targetOffset }}
            animate={shouldAnimate ? { strokeDashoffset: targetOffset } : animate ? { strokeDashoffset: circ } : { strokeDashoffset: targetOffset }}
            transition={{ duration: 1.6, delay: delay + 0.2, ease: [0.19, 1, 0.22, 1] }}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <text
            x={cx} y={cy - fontSub * 0.4}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={fontScore} fontWeight={700} fill={numberColor} fontFamily="inherit"
          >
            {score}
          </text>
          <text
            x={cx} y={cy + fontScore * 0.55}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSub} fill={subColor} fontFamily="inherit"
          >
            / 100
          </text>
        </svg>
      </motion.div>

      {label && (
        <p
          className="mt-3 text-[.9375rem] font-medium"
          style={{ color: labelColor }}
        >
          {label}
        </p>
      )}
      {sub && (
        <p
          className="mt-1 font-mono text-[.6875rem] uppercase tracking-[.18em]"
          style={{ color: variant === "dark" ? "rgba(255,255,255,0.4)" : "var(--text-muted)" }}
        >
          {sub}
        </p>
      )}

      {breakdown && breakdown.length > 0 && (
        <div className="mt-5 w-full min-w-[200px] space-y-2.5">
          {breakdown.map((dim, i) => (
            <ScoreBar
              key={dim.label}
              label={dim.label}
              weight={dim.weight}
              score={score}
              variant={variant}
              delay={delay + 0.8 + i * 0.08}
              animate={shouldAnimate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  weight,
  score,
  variant,
  delay,
  animate,
}: {
  label: string;
  weight: number;
  score: number;
  variant: ScoreRingVariant;
  delay: number;
  animate: boolean;
}) {
  const { arc } = colorForScore(score);
  const textColor = variant === "dark" ? "rgba(255,255,255,0.7)" : "var(--text-secondary)";
  const weightColor = variant === "dark" ? "rgba(255,255,255,0.4)" : "var(--text-muted)";
  const trackColor = variant === "dark" ? "rgba(255,255,255,0.06)" : "#f3f4f6";

  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span style={{ color: textColor }} className="font-medium">{label}</span>
        <span style={{ color: weightColor }} className="font-mono">{weight}%</span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full"
        style={{ background: trackColor }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={animate ? { width: `${weight}%` } : { width: 0 }}
          transition={{ duration: 0.9, delay, ease: [0.19, 1, 0.22, 1] }}
          className="h-full rounded-full"
          style={{ background: arc }}
        />
      </div>
    </div>
  );
}
