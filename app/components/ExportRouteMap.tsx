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

  const pctColor =
    exportStats.pct >= 80 ? "text-emerald-600"
    : exportStats.pct >= 50 ? "text-amber-600"
    : "text-red-600";

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white">
      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-px border-b border-[var(--border)] bg-[var(--border)] sm:grid-cols-5">
        {[
          { label: "Destino",      value: lot.pais_destino ?? "—",             color: "" },
          { label: "Porto",        value: lot.porto_embarque ?? "Santos, SP",   color: "" },
          { label: "Embarque",     value: embarqueFormatted,                    color: "" },
          { label: "Contrato",     value: lot.numero_contrato ?? "—",           color: "" },
          { label: "Conformidade", value: `${exportStats.pct}%`,                color: pctColor },
        ].map((k) => (
          <div key={k.label} className="bg-[var(--surface-soft)] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {k.label}
            </p>
            <p className={`mt-1 text-sm font-semibold ${k.color || "text-[var(--text-primary)]"}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Mapa */}
        <div className="flex-1 p-6 lg:p-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Rota de exportação
          </p>
          <ExportMapGL />
        </div>

        {/* Conformidade */}
        <div className="border-t border-[var(--border)] p-6 lg:w-[280px] lg:shrink-0 lg:border-l lg:border-t-0 lg:p-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Conformidade
            </p>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
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
                      ? "border-emerald-200 bg-emerald-50"
                      : isPend
                      ? "border-amber-200 bg-amber-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isApto ? "bg-emerald-500" : isPend ? "bg-amber-500" : "bg-red-500"
                      }`}
                    />
                    <p className="flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                      {animal.nickname ?? animal.internal_code ?? animal.id.slice(0, 8)}
                    </p>
                    <span
                      className={`text-sm font-bold ${
                        isApto ? "text-emerald-600" : isPend ? "text-amber-600" : "text-red-600"
                      }`}
                    >
                      {score}
                    </span>
                  </div>
                  {last && (
                    <p className="mt-0.5 pl-[18px] text-[10px] text-[var(--text-muted)]">{last} kg</p>
                  )}
                  {pendencias.length > 0 && (
                    <p className="mt-1 pl-[18px] text-[10px] leading-snug text-amber-600">
                      {pendencias[0]}
                    </p>
                  )}
                  {certs.some((c) => c.toLowerCase().includes("halal")) && (
                    <span className="mt-1.5 ml-[18px] inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                      ☪ Halal
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-center">
            <p className="text-xs">
              <span className="font-semibold text-emerald-600">{exportStats.aptos} aptos</span>
              {exportStats.pendencias > 0 && (
                <span className="font-semibold text-amber-600"> · {exportStats.pendencias} pend.</span>
              )}
              {exportStats.inaptos > 0 && (
                <span className="font-semibold text-red-600"> · {exportStats.inaptos} inaptos</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
