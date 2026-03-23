"use client";
import dynamic from "next/dynamic";
const ExportMapGL = dynamic(() => import("./ExportMapGL"), { ssr: false });

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
        {/* ── Mapa Mapbox ── */}
        <div className="flex-1 p-6 lg:p-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
            Rota de exportação
          </p>
          <ExportMapGL />
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
