import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Truck, MapPin, AlertTriangle } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type TrackingRow = {
  id: string;
  lot_id: string;
  stage: string;
  timestamp: string;
  animals_confirmed: number | null;
  animals_lost: number;
  location_name: string | null;
};

type LotRow = { id: string; name: string; certificacoes_exigidas: string[] | null };

const STAGE_LABELS: Record<string, string> = {
  fazenda:       "Fazenda",
  concentracao:  "Concentração",
  transporte:    "Transporte",
  porto_origem:  "Porto Origem",
  navio:         "Navio",
  porto_destino: "Porto Destino",
  entregue:      "Entregue",
};

const STAGE_ORDER = ["fazenda","concentracao","transporte","porto_origem","navio","porto_destino","entregue"];

export default async function TrackingPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: trackingData }, { data: lotsData }] = await Promise.all([
    supabase
      .from("shipment_tracking")
      .select("id, lot_id, stage, timestamp, animals_confirmed, animals_lost, location_name")
      .order("timestamp", { ascending: false }),
    supabase.from("lots").select("id, name, certificacoes_exigidas"),
  ]);

  const trackings: TrackingRow[] = (trackingData ?? []) as TrackingRow[];
  const lots: LotRow[] = (lotsData ?? []) as LotRow[];
  const lotMap = new Map(lots.map(l => [l.id, l]));
  const lotName = (id: string) => lotMap.get(id)?.name ?? id;
  const lotHasHalal = (id: string) => lotMap.get(id)?.certificacoes_exigidas?.includes("Halal") ?? false;

  // Agrupa checkpoints por lote e determina etapa atual
  const byLot = new Map<string, TrackingRow[]>();
  for (const t of trackings) {
    const list = byLot.get(t.lot_id) ?? [];
    list.push(t);
    byLot.set(t.lot_id, list);
  }

  const lotSummaries = Array.from(byLot.entries()).map(([lotId, rows]) => {
    const completedStages = new Set(rows.map(r => r.stage));
    const currentStageIdx = STAGE_ORDER.findIndex(s => !completedStages.has(s));
    const currentStage = currentStageIdx === -1 ? "entregue" : STAGE_ORDER[currentStageIdx];
    const lastRow = rows[0];
    const totalLost = rows.reduce((s, r) => s + (r.animals_lost ?? 0), 0);
    const lastConfirmed = lastRow?.animals_confirmed ?? null;
    const started = rows.find(r => r.stage === "fazenda")?.animals_confirmed ?? null;
    const pctSurvival = started && lastConfirmed ? Math.round((lastConfirmed / started) * 100) : null;
    return { lotId, lotName: lotName(lotId), hasHalal: lotHasHalal(lotId), currentStage, lastRow, totalLost, lastConfirmed, started, pctSurvival };
  });

  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="ag-card-strong overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
          <span className="ag-badge ag-badge-green">PIF · Exportação</span>
          <h1 className="ag-page-title">Rastreio de Embarques</h1>
          <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
            Acompanhe em tempo real cada lote de exportação — da fazenda à entrega no destino.
          </p>
        </div>
      </section>

      {/* Lista de lotes com tracking */}
      {lotSummaries.length === 0 ? (
        <section className="ag-card-strong p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Truck size={32} className="text-[var(--text-muted)] mb-4" />
            <p className="text-sm text-[var(--text-muted)]">Nenhum checkpoint registrado ainda.</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Os checkpoints são adicionados na aba Tracking dentro de cada lote.</p>
          </div>
        </section>
      ) : (
        <section className="ag-card-strong p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="ag-section-title">Lotes em trânsito</h2>
            <span className="ag-badge">{lotSummaries.length} lotes</span>
          </div>
          <div className="space-y-4">
            {lotSummaries.map(({ lotId, lotName, hasHalal, currentStage, lastRow, totalLost, lastConfirmed, started, pctSurvival }) => {
              const stageIdx = STAGE_ORDER.indexOf(currentStage);
              return (
                <Link
                  key={lotId}
                  href={`/lotes/${lotId}?tab=tracking`}
                  className="block rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)] transition group"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">{lotName}</p>
                        {hasHalal && <HalalBadgeSVG size={40} />}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <MapPin size={11} />
                        <span>{lastRow?.location_name ?? "—"}</span>
                        <span>·</span>
                        <span>{lastRow?.timestamp ? new Date(lastRow.timestamp).toLocaleDateString("pt-BR") : "—"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {lastConfirmed != null && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Vivos agora</p>
                          <p className="text-lg font-bold text-[var(--text-primary)]">{lastConfirmed}</p>
                        </div>
                      )}
                      {totalLost > 0 && (
                        <div className="flex items-center gap-1 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5">
                          <AlertTriangle size={12} className="text-red-500" />
                          <span className="text-xs font-semibold text-red-700">{totalLost} perdas</span>
                        </div>
                      )}
                      {pctSurvival != null && (
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Sobrevivência</p>
                          <p className={`text-lg font-bold ${pctSurvival >= 98 ? "text-emerald-600" : pctSurvival >= 95 ? "text-amber-600" : "text-red-600"}`}>{pctSurvival}%</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mini progress bar das 7 etapas */}
                  <div className="mt-4 flex items-center gap-1">
                    {STAGE_ORDER.map((s, i) => {
                      const done = i < stageIdx;
                      const current = i === stageIdx;
                      return (
                        <div key={s} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`h-1.5 w-full rounded-full transition-all ${done ? "bg-emerald-500" : current ? "bg-blue-500" : "bg-[var(--border)]"}`} />
                          {current && (
                            <span className="text-[9px] font-semibold text-blue-600 whitespace-nowrap">{STAGE_LABELS[s]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
