"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

// ── Brazilian ports [lat, lng] on the actual globe surface ──
const PORTS = [
  { key: "itaqui",    label: "Itaqui",     uf: "MA", lat:  -2.565, lng: -44.367 },
  { key: "santos",    label: "Santos",     uf: "SP", lat: -23.950, lng: -46.330 },
  { key: "paranagua", label: "Paranaguá",  uf: "PR", lat: -25.520, lng: -48.510 },
  { key: "riogrande", label: "Rio Grande", uf: "RS", lat: -32.040, lng: -52.090 },
];

// ── Destination anchors distributed across continents (no labels) ──
const DESTINATIONS: [number, number][] = [
  [ 21.5,  39.1],  // Jeddah
  [ 25.2,  51.5],  // Doha
  [ 25.2,  55.3],  // Dubai
  [ 31.2, 121.5],  // Shanghai
  [ 51.9,   4.5],  // Rotterdam
  [ 53.5,  10.0],  // Hamburgo
  [ 40.7, -74.0],  // NY
  [ 35.7, 139.8],  // Tokyo
  [ -6.2, 106.8],  // Jakarta
  [-33.9,  18.4],  // Cape Town
  [ 55.8,  37.6],  // Moscow
  [  1.3, 103.8],  // Singapore
];

type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  altitude: number;
};

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function AnimatedGlobe({ size = 680 }: { size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<unknown>(null);
  const [mounted, setMounted] = useState(false);

  const arcs: Arc[] = useMemo(() => {
    const rng = makeRng(2026);
    const a: Arc[] = [];
    DESTINATIONS.forEach((dst, i) => {
      const port = PORTS[Math.floor(rng() * PORTS.length)];
      a.push({
        startLat: port.lat,
        startLng: port.lng,
        endLat: dst[0],
        endLng: dst[1],
        color: i % 3 === 0 ? "rgba(141, 188, 95, 0.9)" : "rgba(46, 139, 62, 0.8)",
        altitude: 0.25 + rng() * 0.25,
      });
    });
    return a;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const container = containerRef.current;
      if (!container) return;

      const mod = await import("globe.gl");
      if (cancelled) return;

      // globe.gl's default export is a factory function — loose typing to bypass
      // the declared constructor signature that doesn't match runtime usage.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const GlobeFactory = mod.default as unknown as (el: HTMLElement) => any;
      const globe = GlobeFactory(container);

      globe
        .globeImageUrl("/globe/earth-dark.jpg")
        .bumpImageUrl("/globe/earth-topology.png")
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#2E8B3E")
        .atmosphereAltitude(0.2)
        .arcsData(arcs)
        .arcColor("color")
        .arcAltitude("altitude")
        .arcStroke(0.55)
        .arcDashLength(0.35)
        .arcDashGap(0.65)
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime(3200)
        .arcsTransitionDuration(0)
        .pointsData(
          PORTS.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            label: p.label,
            uf: p.uf,
          })),
        )
        .pointColor(() => "#C9E5B7")
        .pointAltitude(0.02)
        .pointRadius(0.5)
        .pointLabel((p: { label: string; uf: string }) => {
          return `<div style="font-family:ui-monospace,monospace;font-size:11px;padding:6px 10px;background:rgba(7,26,14,0.92);color:#fff;border:1px solid rgba(46,139,62,0.4);border-radius:8px;letter-spacing:0.02em"><b>${p.label}</b> <span style="opacity:.5;letter-spacing:.1em">${p.uf}</span></div>`;
        })
        .ringsData(PORTS.map((p) => ({ lat: p.lat, lng: p.lng })))
        .ringColor(() => "rgba(141, 188, 95, 0.6)")
        .ringMaxRadius(3.5)
        .ringPropagationSpeed(1.2)
        .ringRepeatPeriod(1600)
        .width(size)
        .height(size);

      // Position camera on Brazil and auto-rotate
      globe.pointOfView({ lat: -15, lng: -55, altitude: 2.0 }, 0);

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI / 3.2;
      controls.maxPolarAngle = Math.PI - Math.PI / 3.2;

      globeRef.current = globe;
      setMounted(true);

      // Reflow on container resize (responsive)
      const ro = new ResizeObserver(() => {
        const w = container.clientWidth;
        if (w > 0) {
          globe.width(w);
          globe.height(w);
        }
      });
      ro.observe(container);

      globe._ro = ro;
    })();

    return () => {
      cancelled = true;
      const g = globeRef.current as {
        _destructor?: () => void;
        _ro?: ResizeObserver;
      } | null;
      if (g?._ro) g._ro.disconnect();
      if (g?._destructor) g._destructor();
    };
  }, [arcs, size]);

  return (
    <div className="relative mx-auto" style={{ width: "100%", maxWidth: size }}>
      {/* Atmospheric halo ring */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(46,139,62,0.22) 0%, rgba(46,139,62,0.06) 40%, transparent 70%)",
          filter: "blur(30px)",
          transform: "scale(1.15)",
        }}
      />

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: mounted ? 1 : 0, scale: mounted ? 1 : 0.95 }}
        transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
        className="relative"
        style={{ aspectRatio: "1/1", cursor: "grab" }}
      />
    </div>
  );
}
