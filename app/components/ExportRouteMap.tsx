"use client";
import { useEffect, useRef, useState } from "react";

type LotInfo = {
  pais_destino: string | null;
  porto_embarque: string | null;
  data_embarque: string | null;
  numero_contrato: string | null;
  certificacoes_exigidas: string[] | null;
};

type AptAnimal = {
  animal: { id: string; internal_code: string | null; nickname: string | null };
  score: number;
  last: number | null;
  pendencias: string[];
  status: "apto" | "pendencias" | "inapto";
  certs: string[];
};

type ExportStats = { aptos: number; inaptos: number; pendencias: number; pct: number };

// Santos, SP (porto principal)
const ORIGIN = { x: 297, y: 240 };
// Jeddah, Arábia Saudita (porto de desembarque pecuário)
const DEST = { x: 487, y: 145 };
// Bezier control — arco pelo Atlântico Norte
const CTRL = { x: 392, y: 55 };

const ROUTE_D = `M ${ORIGIN.x} ${ORIGIN.y} Q ${CTRL.x} ${CTRL.y} ${DEST.x} ${DEST.y}`;

function bezierPt(t: number): [number, number] {
  const mt = 1 - t;
  return [
    Math.round(mt * mt * ORIGIN.x + 2 * mt * t * CTRL.x + t * t * DEST.x),
    Math.round(mt * mt * ORIGIN.y + 2 * mt * t * CTRL.y + t * t * DEST.y),
  ];
}

export default function ExportRouteMap({
  lot,
  exportAptidao,
  exportStats,
  totalAnimals,
}: {
  lot: LotInfo;
  exportAptidao: AptAnimal[];
  exportStats: ExportStats;
  totalAnimals: number;
}) {
  const [drawn, setDrawn] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(540);

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
    const t = setTimeout(() => setDrawn(true), 120);
    return () => clearTimeout(t);
  }, []);

  const embarqueFormatted = lot.data_embarque
    ? new Date(lot.data_embarque).toLocaleDateString("pt-BR")
    : "—";

  return (
    <section className="overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.07)] bg-[linear-gradient(135deg,#0c0c1a_0%,#111827_100%)]">
      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-px border-b border-white/[0.07] bg-white/[0.04] sm:grid-cols-5">
        {[
          { label: "Destino", value: lot.pais_destino ?? "—" },
          { label: "Porto", value: lot.porto_embarque ?? "Santos, SP" },
          { label: "Embarque", value: embarqueFormatted },
          { label: "Contrato", value: lot.numero_contrato ?? "—" },
          {
            label: "Conformidade",
            value: `${exportStats.pct}%`,
            color:
              exportStats.pct >= 80
                ? "text-emerald-400"
                : exportStats.pct >= 50
                ? "text-amber-400"
                : "text-red-400",
          },
        ].map((k) => (
          <div key={k.label} className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
              {k.label}
            </p>
            <p className={`mt-1 text-sm font-semibold ${k.color ?? "text-white/75"}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* ── Mapa SVG ── */}
        <div className="flex-1 p-6 lg:p-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
            Rota de exportação
          </p>
          <div className="overflow-hidden rounded-2xl">
            <svg
              viewBox="0 0 800 380"
              className="w-full h-auto"
              aria-label="Mapa rota de exportação Brasil → Arábia Saudita"
            >
              <defs>
                <radialGradient id="erm-ocean" cx="55%" cy="40%" r="65%">
                  <stop offset="0%" stopColor="#152236" />
                  <stop offset="100%" stopColor="#090e18" />
                </radialGradient>
                <filter id="erm-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Oceano */}
              <rect width="800" height="380" fill="url(#erm-ocean)" />

              {/* Grade sutil */}
              <g stroke="#4a90d9" strokeWidth="0.4" opacity="0.07">
                {[95, 190, 285].map((y) => (
                  <line key={y} x1="0" y1={y} x2="800" y2={y} />
                ))}
                {[100, 200, 300, 400, 500, 600, 700].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="380" />
                ))}
              </g>

              {/* Equador */}
              <line
                x1="0" y1="190" x2="800" y2="190"
                stroke="#4a90d9" strokeWidth="0.6"
                strokeDasharray="5 10" opacity="0.18"
              />

              {/* ── Continentes (silhuetas simplificadas) ── */}

              {/* América do Norte (parcial) */}
              <path
                d="M 100 80 L 145 55 L 195 48 L 235 60 L 228 82 L 218 105 L 222 130 L 228 155 L 222 164 L 208 155 L 192 140 L 170 118 L 148 100 Z"
                fill="#1a3520" stroke="#2a5530" strokeWidth="0.7"
              />

              {/* América do Sul */}
              <path
                d="M 222 164 L 238 150 L 258 145 L 270 152 L 284 160 L 310 155 L 325 165 L 330 185 L 325 200 L 323 212 L 317 224 L 316 238 L 298 242 L 286 260 L 268 293 L 248 306 L 237 305 L 222 275 L 220 245 L 220 200 Z"
                fill="#1a3520" stroke="#2a5530" strokeWidth="0.7"
              />

              {/* Ilhas Falkland */}
              <circle cx="258" cy="315" r="3" fill="#1a3520" />

              {/* Europa */}
              <path
                d="M 378 114 L 376 98 L 382 88 L 392 80 L 408 76 L 420 72 L 435 68 L 452 62 L 462 66 L 458 78 L 455 90 L 462 98 L 468 108 L 473 114 L 462 116 L 454 120 L 444 118 L 427 110 L 410 108 L 392 112 Z"
                fill="#1a3520" stroke="#2a5530" strokeWidth="0.7"
              />

              {/* Grã-Bretanha */}
              <path d="M 368 85 L 375 78 L 378 88 L 372 94 Z" fill="#1a3520" stroke="#2a5530" strokeWidth="0.5" />

              {/* África */}
              <path
                d="M 358 158 L 372 138 L 388 116 L 410 108 L 427 110 L 444 118 L 462 116 L 474 126 L 478 142 L 497 163 L 495 185 L 494 213 L 484 228 L 478 260 L 464 273 L 443 262 L 430 248 L 428 232 L 418 214 L 406 207 L 390 200 L 378 190 L 362 172 Z"
                fill="#1a3520" stroke="#2a5530" strokeWidth="0.7"
              />

              {/* Madagascar */}
              <path d="M 500 232 L 504 218 L 508 228 L 506 242 Z" fill="#1a3520" stroke="#2a5530" strokeWidth="0.5" />

              {/* Península Arábica */}
              <path
                d="M 476 127 L 483 124 L 493 122 L 504 125 L 513 130 L 518 136 L 523 145 L 523 152 L 519 160 L 510 164 L 498 164 L 494 156 L 488 148 L 482 140 L 477 133 Z"
                fill="#1a3520" stroke="#2a5530" strokeWidth="0.7"
              />

              {/* Turquia / Levante */}
              <path
                d="M 466 113 L 473 114 L 480 116 L 490 118 L 495 122 L 490 126 L 483 124 L 474 126 L 468 120 Z"
                fill="#1a3520" stroke="#2a5530" strokeWidth="0.5"
              />

              {/* Índia (parcial) */}
              <path
                d="M 560 130 L 575 125 L 585 140 L 580 165 L 568 178 L 558 170 L 555 152 Z"
                fill="#1a3520" stroke="#2a5530" strokeWidth="0.6"
              />

              {/* Rota — sombra */}
              <path
                d={ROUTE_D}
                fill="none"
                stroke="#4ade80"
                strokeWidth="6"
                strokeDasharray="10 8"
                opacity="0.07"
              />

              {/* Rota — linha animada */}
              <path
                ref={pathRef}
                d={ROUTE_D}
                fill="none"
                stroke="#4ade80"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${pathLen} ${pathLen}`}
                strokeDashoffset={drawn ? 0 : pathLen}
                opacity="0.95"
                style={{
                  transition: "stroke-dashoffset 2.6s cubic-bezier(0.4,0,0.2,1)",
                }}
                filter="url(#erm-glow)"
              />

              {/* Pontos ao longo da rota */}
              {drawn &&
                [0.28, 0.52, 0.76].map((t) => {
                  const [px, py] = bezierPt(t);
                  return (
                    <circle key={t} cx={px} cy={py} r="2.5" fill="#4ade80" opacity="0.45" />
                  );
                })}

              {/* ── Pin origem — Santos ── */}
              <g>
                <circle cx={ORIGIN.x} cy={ORIGIN.y} r="16" fill="#0f2d1a" stroke="#4ade80" strokeWidth="2" />
                <circle cx={ORIGIN.x} cy={ORIGIN.y} r="6" fill="#4ade80" />
                <text
                  x={ORIGIN.x} y={ORIGIN.y + 30}
                  fill="#4ade80" fontSize="9" fontWeight="700"
                  textAnchor="middle" letterSpacing="0.8"
                >
                  SANTOS
                </text>
                <text
                  x={ORIGIN.x} y={ORIGIN.y + 41}
                  fill="rgba(255,255,255,0.35)" fontSize="8"
                  textAnchor="middle"
                >
                  Brasil
                </text>
              </g>

              {/* ── Pin destino — Jeddah ── */}
              <g>
                {drawn && (
                  <circle cx={DEST.x} cy={DEST.y} r="26" fill="#4ade80" opacity="0.1">
                    <animate
                      attributeName="r" values="18;26;18" dur="2.4s" repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity" values="0.14;0.05;0.14" dur="2.4s" repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle cx={DEST.x} cy={DEST.y} r="16" fill="#0f2d1a" stroke="#4ade80" strokeWidth="2" />
                <circle cx={DEST.x} cy={DEST.y} r="6" fill="#4ade80" />
                <text
                  x={DEST.x} y={DEST.y + 30}
                  fill="#4ade80" fontSize="9" fontWeight="700"
                  textAnchor="middle" letterSpacing="0.8"
                >
                  JEDDAH
                </text>
                <text
                  x={DEST.x} y={DEST.y + 41}
                  fill="rgba(255,255,255,0.35)" fontSize="8"
                  textAnchor="middle"
                >
                  Arábia Saudita
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* ── Cards de conformidade ── */}
        <div className="border-t border-white/[0.07] p-6 lg:w-[280px] lg:shrink-0 lg:border-l lg:border-t-0 lg:p-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
              Conformidade
            </p>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/40">
              {totalAnimals} animais
            </span>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
            {exportAptidao.map(({ animal, score, last, status, pendencias, certs }) => {
              const isApto = status === "apto";
              const isPend = status === "pendencias";
              return (
                <div
                  key={animal.id}
                  className={`rounded-xl border px-4 py-3 ${
                    isApto
                      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                      : isPend
                      ? "border-amber-500/25 bg-amber-500/[0.06]"
                      : "border-red-500/20 bg-red-500/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isApto ? "bg-emerald-400" : isPend ? "bg-amber-400" : "bg-red-400"
                      }`}
                    />
                    <p className="flex-1 truncate text-sm font-semibold text-white/80">
                      {animal.nickname ?? animal.internal_code ?? animal.id.slice(0, 8)}
                    </p>
                    <span
                      className={`text-sm font-bold ${
                        isApto ? "text-emerald-400" : isPend ? "text-amber-400" : "text-red-400"
                      }`}
                    >
                      {score}
                    </span>
                  </div>
                  {last && (
                    <p className="mt-0.5 pl-[18px] text-[10px] text-white/30">{last} kg</p>
                  )}
                  {pendencias.length > 0 && (
                    <p className="mt-1 pl-[18px] text-[10px] leading-snug text-amber-400/70">
                      {pendencias[0]}
                    </p>
                  )}
                  {certs.some((c) => c.toLowerCase().includes("halal")) && (
                    <span className="mt-1.5 ml-[18px] inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                      ☪ Halal
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-center">
            <p className="text-xs">
              <span className="font-semibold text-emerald-400">{exportStats.aptos} aptos</span>
              {exportStats.pendencias > 0 && (
                <span className="font-semibold text-amber-400"> · {exportStats.pendencias} pend.</span>
              )}
              {exportStats.inaptos > 0 && (
                <span className="font-semibold text-red-400"> · {exportStats.inaptos} inaptos</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
