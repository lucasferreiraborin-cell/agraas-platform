"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Circle, Loader2, MapPin, User, AlertTriangle, Plus, X } from "lucide-react";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type Checkpoint = {
  id: string;
  stage: string;
  timestamp: string;
  animals_confirmed: number | null;
  animals_lost: number;
  loss_cause: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  responsible_name: string | null;
  notes: string | null;
};

const STAGES = [
  { key: "fazenda",       label: "Fazenda",        icon: "🌾" },
  { key: "concentracao",  label: "Concentração",   icon: "🏚" },
  { key: "transporte",    label: "Transporte",     icon: "🚛" },
  { key: "porto_origem",  label: "Porto Origem",   icon: "⚓" },
  { key: "navio",         label: "Navio",          icon: "🚢" },
  { key: "porto_destino", label: "Porto Destino",  icon: "🏳️" },
  { key: "entregue",      label: "Entregue",       icon: "✅" },
];

export default function TrackingTimeline({
  lotId,
  clientId,
  initialCheckpoints,
  hasHalal = false,
}: {
  lotId: string;
  clientId: string | null;
  initialCheckpoints: Checkpoint[];
  hasHalal?: boolean;
}) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(initialCheckpoints);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [fAnimals, setFAnimals]       = useState("");
  const [fLost, setFLost]             = useState("0");
  const [fLossCause, setFLossCause]   = useState("");
  const [fLocation, setFLocation]     = useState("");
  const [fLat, setFLat]               = useState("");
  const [fLng, setFLng]               = useState("");
  const [fResponsible, setFResponsible] = useState("");
  const [fNotes, setFNotes]           = useState("");

  const completedStages = new Set(checkpoints.map(c => c.stage));

  const currentStageIdx = STAGES.findIndex(s => !completedStages.has(s.key));
  const currentStage = currentStageIdx === -1 ? null : STAGES[currentStageIdx];

  // KPIs
  const started = checkpoints.find(c => c.stage === "fazenda")?.animals_confirmed ?? null;
  const lastCheckpoint = checkpoints.length > 0
    ? checkpoints.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b)
    : null;
  const alive = lastCheckpoint?.animals_confirmed ?? null;
  const totalLost = checkpoints.reduce((s, c) => s + (c.animals_lost ?? 0), 0);
  const pctSurvival = started && alive ? ((alive / started) * 100).toFixed(1) : null;

  function checkpointForStage(stageKey: string): Checkpoint | undefined {
    return checkpoints.find(c => c.stage === stageKey);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentStage) return;
    setSaving(true);
    setError("");
    const { data, error: err } = await supabase
      .from("shipment_tracking")
      .insert({
        lot_id:            lotId,
        client_id:         clientId,
        stage:             currentStage.key,
        timestamp:         new Date().toISOString(),
        animals_confirmed: fAnimals ? Number(fAnimals) : null,
        animals_lost:      Number(fLost) || 0,
        loss_cause:        fLossCause || null,
        location_name:     fLocation || null,
        location_lat:      fLat ? Number(fLat) : null,
        location_lng:      fLng ? Number(fLng) : null,
        responsible_name:  fResponsible || null,
        notes:             fNotes || null,
      })
      .select()
      .single();

    if (err) { setError(err.message); setSaving(false); return; }
    setCheckpoints(prev => [...prev, data as Checkpoint]);
    setShowModal(false);
    setFAnimals(""); setFLost("0"); setFLossCause(""); setFLocation("");
    setFLat(""); setFLng(""); setFResponsible(""); setFNotes("");
    setSaving(false);
  }

  const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
  const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      {started != null && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-6 py-4">
          <KPIStat label="Saíram" value={started} />
          <div className="w-px self-stretch bg-[var(--border)]" />
          <KPIStat label="Vivos agora" value={alive ?? "—"} green />
          <div className="w-px self-stretch bg-[var(--border)]" />
          <KPIStat label="Perdas" value={totalLost} red={totalLost > 0} />
          <div className="w-px self-stretch bg-[var(--border)]" />
          <KPIStat label="Sobrevivência" value={pctSurvival ? `${pctSurvival}%` : "—"} green={pctSurvival != null && Number(pctSurvival) >= 98} />
          {hasHalal && (
            <>
              <div className="w-px self-stretch bg-[var(--border)]" />
              <div className="flex items-center gap-2">
                <HalalBadgeSVG size={40} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600">Halal</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Timeline vertical */}
      <div className="relative">
        {STAGES.map((stage, idx) => {
          const cp = checkpointForStage(stage.key);
          const done = completedStages.has(stage.key);
          const isCurrent = currentStage?.key === stage.key;
          const isFuture = !done && !isCurrent;
          const isLast = idx === STAGES.length - 1;

          return (
            <div key={stage.key} className="flex gap-5">
              {/* Connector column */}
              <div className="flex flex-col items-center" style={{ minWidth: 40 }}>
                {/* Circle */}
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                    ? "border-blue-500 bg-blue-500 text-white animate-pulse"
                    : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]"
                }`}>
                  {done
                    ? <CheckCircle2 size={18} />
                    : isCurrent
                    ? <Circle size={18} className="fill-white/30" />
                    : <span className="text-xs">{idx + 1}</span>
                  }
                </div>
                {/* Line */}
                {!isLast && (
                  <div className={`mt-1 w-0.5 flex-1 min-h-[2rem] ${
                    done ? "bg-emerald-400" : isCurrent ? "bg-blue-300" : "border-l-2 border-dashed border-[var(--border)] bg-transparent w-0"
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-8 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-base">{stage.icon}</span>
                  <h3 className={`font-semibold ${done ? "text-emerald-700" : isCurrent ? "text-blue-700" : "text-[var(--text-muted)]"}`}>
                    {stage.label}
                  </h3>
                  {isCurrent && (
                    <span className="ml-1 rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                      Etapa atual
                    </span>
                  )}
                </div>

                {/* Checkpoint card */}
                {cp && (
                  <div className={`mt-3 rounded-2xl border p-4 space-y-2 ${
                    cp.animals_lost > 0
                      ? "border-red-200 bg-red-50"
                      : "border-emerald-200 bg-emerald-50/60"
                  }`}>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      {cp.animals_confirmed != null && (
                        <span className="font-semibold text-[var(--text-primary)]">
                          {cp.animals_confirmed} animais confirmados
                        </span>
                      )}
                      {cp.animals_lost > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-red-700">
                          <AlertTriangle size={13} />
                          {cp.animals_lost} {cp.animals_lost === 1 ? "perda" : "perdas"}
                          {cp.loss_cause && ` · ${cp.loss_cause}`}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-secondary)]">
                      {cp.location_name && (
                        <span className="flex items-center gap-1"><MapPin size={11} />{cp.location_name}</span>
                      )}
                      {cp.responsible_name && (
                        <span className="flex items-center gap-1"><User size={11} />{cp.responsible_name}</span>
                      )}
                      <span>{new Date(cp.timestamp).toLocaleString("pt-BR")}</span>
                    </div>
                    {cp.notes && (
                      <p className="text-xs text-[var(--text-muted)] italic">{cp.notes}</p>
                    )}
                  </div>
                )}

                {/* Botão registrar na etapa atual */}
                {isCurrent && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-3 flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Plus size={14} />
                    Registrar checkpoint — {stage.label}
                  </button>
                )}

                {/* Lote entregue */}
                {stage.key === "entregue" && done && (
                  <div className="mt-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    ✅ Lote entregue com sucesso
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de checkpoint */}
      {showModal && currentStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Registrar checkpoint — {currentStage.icon} {currentStage.label}
              </h3>
              <button onClick={() => setShowModal(false)} className="rounded-xl p-1.5 hover:bg-[var(--surface-soft)] transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Animais confirmados</label>
                  <input type="number" min="0" value={fAnimals} onChange={e => setFAnimals(e.target.value)} placeholder="Ex: 498" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Perdas</label>
                  <input type="number" min="0" value={fLost} onChange={e => setFLost(e.target.value)} placeholder="0" className={inputCls} />
                </div>
              </div>
              {Number(fLost) > 0 && (
                <div>
                  <label className={labelCls}>Causa da perda</label>
                  <input type="text" value={fLossCause} onChange={e => setFLossCause(e.target.value)} placeholder="Ex: estresse no transporte" className={inputCls} />
                </div>
              )}
              <div>
                <label className={labelCls}>Local</label>
                <input type="text" value={fLocation} onChange={e => setFLocation(e.target.value)} placeholder="Ex: Porto de Santos" className={inputCls} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Latitude (opcional)</label>
                  <input type="number" step="any" value={fLat} onChange={e => setFLat(e.target.value)} placeholder="-23.9618" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Longitude (opcional)</label>
                  <input type="number" step="any" value={fLng} onChange={e => setFLng(e.target.value)} placeholder="-46.3322" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Responsável</label>
                <input type="text" value={fResponsible} onChange={e => setFResponsible(e.target.value)} placeholder="Nome do responsável" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Observações</label>
                <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={2} placeholder="Notas adicionais..." className={inputCls + " resize-none"} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="ag-button-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="ag-button-primary flex items-center gap-2 disabled:opacity-60">
                  {saving ? <><Loader2 size={14} className="animate-spin" />Salvando…</> : "Salvar checkpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KPIStat({ label, value, green, red }: { label: string; value: string | number; green?: boolean; red?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tracking-tight ${green ? "text-emerald-600" : red ? "text-red-600" : "text-[var(--text-primary)]"}`}>
        {value}
      </p>
    </div>
  );
}
