"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

// ── Brazilian ports positioned on the visible hemisphere of the globe ──
// Coordinates in globe-local space (cx/cy origin at center, radius 1 = edge)
// Dots clustered near bottom-left to represent South America / Brazil.
const PORTS = [
  { key: "itaqui",      label: "Itaqui",      uf: "MA", x: -0.22, y: -0.04, size: 7 },
  { key: "santos",      label: "Santos",      uf: "SP", x: -0.14, y:  0.28, size: 9 },
  { key: "paranagua",   label: "Paranaguá",   uf: "PR", x: -0.10, y:  0.36, size: 7 },
  { key: "riogrande",   label: "Rio Grande",  uf: "RS", x: -0.08, y:  0.46, size: 7 },
];

type Ray = {
  fromIndex: number;
  angle: number;    // degrees, outward angle relative to globe center
  delay: number;
  duration: number;
  len: number;      // extension beyond globe radius (1.0 = same as radius)
};

function generateRays(seed: number): Ray[] {
  // Deterministic pseudo-random to avoid SSR hydration mismatch
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const rays: Ray[] = [];
  // Spread ~28 rays across the 360° sphere perimeter — biased outward from the BR cluster
  const totalRays = 28;
  for (let i = 0; i < totalRays; i++) {
    // Angles: spread 360° but with more density on the east/north side (outward from BR)
    const baseAngle = -90 + (i / totalRays) * 360;
    const jitter = (rng() - 0.5) * 8;
    const angle = baseAngle + jitter;
    const fromIndex = Math.floor(rng() * PORTS.length);
    rays.push({
      fromIndex,
      angle,
      delay: 0.1 + i * 0.08 + rng() * 0.1,
      duration: 2.2 + rng() * 1.5,
      len: 0.55 + rng() * 0.55,
    });
  }
  return rays;
}

export default function AnimatedGlobe({
  size = 560,
}: {
  size?: number;
}) {
  const rays = useMemo(() => generateRays(2026), []);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34; // globe radius ~38% of canvas width (leave space for rays to extend out)

  // Meridians: vertical ellipses at different "rotation" phases (simulated)
  const meridians = 9;
  const parallels = 5; // horizontal ellipses (latitude)

  return (
    <div className="relative" style={{ width: "100%", maxWidth: size, aspectRatio: "1/1" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label="Globo com portos brasileiros e rotas de exportação"
      >
        <defs>
          <radialGradient id="globe-sphere" cx="45%" cy="40%" r="65%">
            <stop offset="0%"  stopColor="#1e5e26" stopOpacity="0.25" />
            <stop offset="55%" stopColor="#0f3517" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#050c06" stopOpacity="0.9" />
          </radialGradient>

          <radialGradient id="globe-rim" cx="50%" cy="50%" r="50%">
            <stop offset="90%"  stopColor="rgba(46,139,62,0)" />
            <stop offset="96%"  stopColor="rgba(46,139,62,0.55)" />
            <stop offset="100%" stopColor="rgba(46,139,62,0)" />
          </radialGradient>

          <radialGradient id="globe-glow-outer" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(46,139,62,0.28)" />
            <stop offset="55%"  stopColor="rgba(46,139,62,0.08)" />
            <stop offset="100%" stopColor="rgba(46,139,62,0)" />
          </radialGradient>

          <radialGradient id="port-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(141, 188, 95, 1)" />
            <stop offset="40%"  stopColor="rgba(46, 139, 62, 0.6)" />
            <stop offset="100%" stopColor="rgba(46, 139, 62, 0)" />
          </radialGradient>

          <linearGradient id="ray-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#8dbc5f" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#2E8B3E" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2E8B3E" stopOpacity="0" />
          </linearGradient>

          {/* Clip the meridians to the circle — proper globe look */}
          <clipPath id="globe-clip">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* Outer soft halo */}
        <circle cx={cx} cy={cy} r={r * 1.55} fill="url(#globe-glow-outer)" />

        {/* Sphere body */}
        <circle cx={cx} cy={cy} r={r} fill="url(#globe-sphere)" />

        {/* Rim accent (primary glow at edge) */}
        <circle cx={cx} cy={cy} r={r * 1.02} fill="url(#globe-rim)" />

        {/* Graticule (meridians + parallels) clipped to sphere */}
        <g clipPath="url(#globe-clip)" opacity="0.35">
          {Array.from({ length: meridians }).map((_, i) => {
            const phaseDur = 120;
            const offset = (i / meridians) * phaseDur;
            return (
              <motion.ellipse
                key={`m-${i}`}
                cx={cx}
                cy={cy}
                rx={r}
                ry={r}
                fill="none"
                stroke="#2E8B3E"
                strokeWidth={0.6}
                initial={{ rotateY: (i / meridians) * 360 }}
                animate={{ rotateY: [(i / meridians) * 360, (i / meridians) * 360 + 360] }}
                transition={{
                  duration: phaseDur,
                  repeat: Infinity,
                  ease: "linear",
                  delay: -offset,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "fill-box" }}
                // Fake the perspective by varying rx through a transform each frame via SMIL fallback
              >
                <animate
                  attributeName="rx"
                  values={`${r};${r * 0.02};${r};${r * 0.02};${r}`}
                  dur="60s"
                  begin={`-${(i / meridians) * 60}s`}
                  repeatCount="indefinite"
                />
              </motion.ellipse>
            );
          })}

          {Array.from({ length: parallels }).map((_, i) => {
            const ratio = (i + 1) / (parallels + 1);
            const y = cy + (ratio - 0.5) * 2 * r;
            const ry = r * 0.04;
            const rx = Math.sqrt(Math.max(0, r * r - Math.pow(y - cy, 2)));
            return (
              <ellipse
                key={`p-${i}`}
                cx={cx}
                cy={y}
                rx={rx}
                ry={ry}
                fill="none"
                stroke="#2E8B3E"
                strokeWidth={0.5}
                opacity={0.7 - Math.abs(ratio - 0.5) * 0.6}
              />
            );
          })}
        </g>

        {/* Rim outline */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(46,139,62,0.4)"
          strokeWidth="0.8"
        />

        {/* Rays emanating outward from ports */}
        <g>
          {rays.map((ray, i) => {
            const port = PORTS[ray.fromIndex];
            const px = cx + port.x * r;
            const py = cy + port.y * r;
            const rad = (ray.angle * Math.PI) / 180;
            // Endpoint well beyond globe edge, fades out via gradient
            const endX = cx + Math.cos(rad) * r * (1 + ray.len);
            const endY = cy + Math.sin(rad) * r * (1 + ray.len);
            // Curve control point biased slightly forward
            const midX = (px + endX) / 2 + Math.cos(rad + Math.PI / 2) * 8;
            const midY = (py + endY) / 2 + Math.sin(rad + Math.PI / 2) * 8;
            const pathD = `M ${px} ${py} Q ${midX} ${midY} ${endX} ${endY}`;
            return (
              <motion.path
                key={`ray-${i}`}
                d={pathD}
                fill="none"
                stroke="url(#ray-grad)"
                strokeWidth={0.9}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 1],
                  opacity: [0, 0.9, 0],
                }}
                transition={{
                  duration: ray.duration,
                  delay: ray.delay,
                  repeat: Infinity,
                  repeatDelay: 1.2 + (i % 4) * 0.3,
                  ease: [0.19, 1, 0.22, 1],
                  times: [0, 0.55, 1],
                }}
              />
            );
          })}
        </g>

        {/* Port dots + glow + label */}
        <g>
          {PORTS.map((port, i) => {
            const px = cx + port.x * r;
            const py = cy + port.y * r;
            return (
              <g key={port.key}>
                {/* Pulsing outer glow */}
                <motion.circle
                  cx={px}
                  cy={py}
                  r={port.size}
                  fill="url(#port-glow)"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: [0.25, 0.8, 0.25],
                    scale: [0.9, 1.6, 0.9],
                  }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    delay: i * 0.35,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: `${px}px ${py}px`, transformBox: "fill-box" }}
                />
                {/* Solid core */}
                <circle cx={px} cy={py} r={1.8} fill="#C9E5B7" />
                <circle
                  cx={px}
                  cy={py}
                  r={port.size * 0.32}
                  fill="#2E8B3E"
                  opacity={0.9}
                />
                {/* Label */}
                <g transform={`translate(${px + port.size + 4}, ${py + 2.5})`}>
                  <text
                    x="0"
                    y="0"
                    fill="#ffffff"
                    opacity="0.85"
                    fontSize={size * 0.018}
                    fontWeight="600"
                    fontFamily="inherit"
                    letterSpacing="-0.01em"
                  >
                    {port.label}
                  </text>
                  <text
                    x="0"
                    y={size * 0.022}
                    fill="#ffffff"
                    opacity="0.4"
                    fontSize={size * 0.013}
                    fontFamily="ui-monospace, monospace"
                    letterSpacing="0.1em"
                  >
                    {port.uf}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
