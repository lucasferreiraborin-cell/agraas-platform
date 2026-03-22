"use client";
import { useState, useRef } from "react";

type PropertyPin = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  scoreAvg: number;
  animalsCount: number;
};

function lngToX(lng: number): number {
  return ((lng + 74) / 40) * 600;
}

function latToY(lat: number): number {
  return ((5 - lat) / 39) * 650;
}

function pinColor(score: number): string {
  if (score >= 70) return "#5d9c44";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

const BRAZIL_PATH =
  "M 336,10 L 360,50 L 360,83 L 585,216 " +
  "L 525,300 L 525,333 L 510,417 L 465,467 " +
  "L 420,484 L 390,550 L 330,617 L 315,641 " +
  "L 255,633 L 240,583 L 240,500 L 240,450 " +
  "L 240,384 L 210,333 L 195,283 L 90,250 " +
  "L 15,233 L 15,133 L 60,83 L 150,50 L 210,0 Z";

export default function BrazilMapSVG({
  properties,
}: {
  properties: PropertyPin[];
}) {
  const [hoveredPin, setHoveredPin] = useState<PropertyPin | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  function updateTooltip(e: React.MouseEvent, prop: PropertyPin) {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 14,
        y: e.clientY - rect.top - 70,
      });
    }
    setHoveredPin(prop);
  }

  return (
    <div ref={containerRef} className="relative select-none">
      <svg viewBox="0 0 600 650" className="h-auto w-full">
        {/* Ocean background */}
        <rect x="0" y="0" width="600" height="650" fill="#f0f7ff" rx="16" />

        {/* Brazil fill */}
        <path
          d={BRAZIL_PATH}
          fill="#e4f2d8"
          stroke="#8dbc5f"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Subtle grid */}
        <g opacity="0.06" stroke="#5d9c44" strokeWidth="1">
          {[100, 200, 300, 400, 500].map((x) => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={650} />
          ))}
          {[100, 200, 300, 400, 500, 600].map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={600} y2={y} />
          ))}
        </g>

        {/* Pins */}
        {properties.map((prop) => {
          const x = lngToX(prop.lng);
          const y = latToY(prop.lat);
          const color = pinColor(prop.scoreAvg);
          const isHovered = hoveredPin?.id === prop.id;

          return (
            <g
              key={prop.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => updateTooltip(e, prop)}
              onMouseMove={(e) => updateTooltip(e, prop)}
              onMouseLeave={() => setHoveredPin(null)}
              onClick={() => {
                window.location.href = `/propriedades/${prop.id}`;
              }}
            >
              {/* Pulse ring on hover */}
              {isHovered && (
                <circle cx={x} cy={y} r={22} fill={color} opacity={0.18} />
              )}
              {/* Shadow */}
              <circle
                cx={x + 1}
                cy={y + 2}
                r={12}
                fill="rgba(0,0,0,0.18)"
              />
              {/* Pin body */}
              <circle
                cx={x}
                cy={y}
                r={12}
                fill={color}
                stroke="white"
                strokeWidth={2.5}
              />
              {/* Inner dot */}
              <circle cx={x} cy={y} r={5} fill="white" opacity={0.88} />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPin && (
        <div
          className="pointer-events-none absolute z-20 min-w-[180px] rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xl"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <p className="font-semibold text-[var(--text-primary)]">
            {hoveredPin.name}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {hoveredPin.city}, {hoveredPin.state}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Score médio
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--primary-hover)]">
                {hoveredPin.scoreAvg}
              </p>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Animais
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {hoveredPin.animalsCount}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
