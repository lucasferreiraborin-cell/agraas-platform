const points = [
  { label: "Jan", x: 30, y: 180, value: 42 },
  { label: "Fev", x: 120, y: 145, value: 56 },
  { label: "Mar", x: 210, y: 150, value: 54 },
  { label: "Abr", x: 300, y: 110, value: 71 },
  { label: "Mai", x: 390, y: 95, value: 78 },
  { label: "Jun", x: 480, y: 65, value: 92 },
];

export default function ProductionChart() {
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section id="graficos" className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/70">
                Visual analytics
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Evolução de performance produtiva
              </h2>
            </div>
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/50">
              Últimos 6 meses
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07110d] p-4">
            <svg viewBox="0 0 540 240" className="h-auto w-full">
              <defs>
                <linearGradient id="lineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>

              {[40, 80, 120, 160, 200].map((y) => (
                <line
                  key={y}
                  x1="20"
                  y1={y}
                  x2="520"
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 6"
                />
              ))}

              <polyline
                fill="none"
                stroke="url(#lineGlow)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polyline}
              />

              {points.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} r="6" fill="#34d399" />
                  <circle cx={point.x} cy={point.y} r="14" fill="rgba(52,211,153,0.14)" />
                  <text
                    x={point.x}
                    y={225}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.48)"
                    fontSize="12"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/45">Melhor mês</p>
            <p className="mt-3 text-4xl font-semibold text-white">Junho</p>
            <p className="mt-2 text-sm text-emerald-300">92 pontos de performance</p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/45">Recomendação da IA</p>
            <p className="mt-3 text-lg font-semibold text-white">
              Priorizar expansão nos lotes com maior ganho por ciclo
            </p>
            <p className="mt-3 text-sm leading-6 text-white/55">
              O padrão indica que unidades com melhor rastreabilidade operacional tendem a
              sustentar maior produtividade e menor perda.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/45">Próxima evolução</p>
            <p className="mt-3 text-lg font-semibold text-white">
              Dashboard interativo por animal, lote, fazenda e período
            </p>
            <p className="mt-3 text-sm leading-6 text-white/55">
              A próxima camada da Agraas pode incluir filtros avançados, alertas inteligentes,
              mapa operacional e recomendações automatizadas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}