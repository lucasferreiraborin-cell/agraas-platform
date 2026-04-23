"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import createGlobe from "cobe";
import { motion } from "framer-motion";

type GlobeState = { phi: number; theta: number; width: number; height: number };
type CobeOpts = Parameters<typeof createGlobe>[1] & {
  onRender?: (state: GlobeState) => void;
};

// ── Brazilian ports in [lat, lng] — cobe plots them on actual geo positions ──
const PORTS = [
  { key: "itaqui",     label: "Itaqui",     uf: "MA", lat:  -2.565, lng: -44.367, size: 0.06 },
  { key: "santos",     label: "Santos",     uf: "SP", lat: -23.950, lng: -46.330, size: 0.08 },
  { key: "paranagua",  label: "Paranaguá",  uf: "PR", lat: -25.520, lng: -48.510, size: 0.06 },
  { key: "riogrande",  label: "Rio Grande", uf: "RS", lat: -32.040, lng: -52.090, size: 0.06 },
];

// ── Ray geometry: deterministic directions fanning outward from the sphere center of BR ──
type Ray = {
  startX: number;
  startY: number;
  angle: number;
  delay: number;
  duration: number;
  len: number;
  repeatDelay: number;
};

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function AnimatedGlobe({ size = 640 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0, lastX: 0, dragging: false });
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let phi = 4.8; // starting longitude so Brazil faces us
    let theta = 0.25; // tilt so BR sits in bottom-left
    let width = 0;

    const onResize = () => {
      if (canvas) width = canvas.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const options: CobeOpts = {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 3,
      mapSamples: 16000,
      mapBrightness: 4,
      baseColor: [0.08, 0.22, 0.11],
      markerColor: [0.18, 0.72, 0.38], // Agraas green #2E8B3E scaled
      glowColor: [0.08, 0.34, 0.14],
      markers: PORTS.map((p) => ({
        location: [p.lat, p.lng] as [number, number],
        size: p.size,
      })),
      onRender: (state: GlobeState) => {
        if (!pointer.current.dragging) {
          phi += 0.0035;
        }
        state.phi = phi + pointer.current.x;
        state.theta = theta + pointer.current.y * 0.2;
        state.width = width * 2;
        state.height = width * 2;
      },
    };

    const globe = createGlobe(canvas, options);

    // First render cue — fade-in once pixels are on the canvas
    const raf = requestAnimationFrame(() => setRendered(true));

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [size]);

  // Gentle cursor-driven drift (no aggressive grab-rotate)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const dy = (e.clientY - rect.top - rect.height / 2) / rect.height;
      // target small drift
      pointer.current.x = dx * 0.35;
      pointer.current.y = dy * 0.35;
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const rays = useMemo<Ray[]>(() => {
    const rng = makeRng(2026);
    const result: Ray[] = [];
    const total = 26;
    // All rays originate visually near Brazil center on the globe face
    // (in % of container: about 36% from left, 58% from top)
    const originX = 0.36;
    const originY = 0.58;
    for (let i = 0; i < total; i++) {
      const angleBase = -90 + (i / total) * 360;
      const jitter = (rng() - 0.5) * 12;
      result.push({
        startX: originX,
        startY: originY,
        angle: angleBase + jitter,
        delay: 0.4 + i * 0.1 + rng() * 0.2,
        duration: 2.8 + rng() * 1.5,
        len: 0.55 + rng() * 0.45,
        repeatDelay: 2.0 + rng() * 2.5,
      });
    }
    return result;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{
        width: "100%",
        maxWidth: size,
        aspectRatio: "1/1",
      }}
    >
      {/* Outer atmosphere halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(46,139,62,0.26) 0%, rgba(46,139,62,0.08) 35%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />

      {/* Globe canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: rendered ? 1 : 0,
          transition: "opacity 1.2s cubic-bezier(.19,1,.22,1)",
          contain: "layout paint size",
        }}
        aria-label="Globo 3D com portos brasileiros destacados"
      />

      {/* SVG ray overlay — rays emanating outward from Brazilian hemisphere */}
      <svg
        className="pointer-events-none absolute inset-0"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="globe-ray" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#C9E5B7" stopOpacity="0" />
            <stop offset="20%"  stopColor="#8dbc5f" stopOpacity="0.9" />
            <stop offset="70%"  stopColor="#2E8B3E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2E8B3E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {rays.map((ray, i) => {
          const sx = ray.startX * 100;
          const sy = ray.startY * 100;
          const rad = (ray.angle * Math.PI) / 180;
          const ex = sx + Math.cos(rad) * ray.len * 55;
          const ey = sy + Math.sin(rad) * ray.len * 55;
          const mx = (sx + ex) / 2 + Math.cos(rad + Math.PI / 2) * 4;
          const my = (sy + ey) / 2 + Math.sin(rad + Math.PI / 2) * 4;
          const d = `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
          return (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke="url(#globe-ray)"
              strokeWidth={0.45}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1],
                opacity: [0, 0.85, 0],
              }}
              transition={{
                duration: ray.duration,
                delay: ray.delay,
                repeat: Infinity,
                repeatDelay: ray.repeatDelay,
                ease: [0.19, 1, 0.22, 1],
                times: [0, 0.55, 1],
              }}
            />
          );
        })}
      </svg>

      {/* Port labels anchored to BR hemisphere — subtle, just city names */}
      <div
        className="pointer-events-none absolute flex flex-col gap-1"
        style={{ left: "15%", top: "52%" }}
      >
        {PORTS.map((p, i) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 0.9, x: 0 }}
            transition={{ duration: 0.6, delay: 1.2 + i * 0.15, ease: [0.19, 1, 0.22, 1] }}
            className="flex items-baseline gap-1.5"
          >
            <span className="font-mono text-[.6875rem] font-semibold text-white/80">
              {p.label}
            </span>
            <span className="font-mono text-[.5625rem] text-white/40 tracking-[.1em]">
              {p.uf}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
