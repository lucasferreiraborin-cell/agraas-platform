"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const STAGES = [
  { key: "fazenda",        label: "Fazenda" },
  { key: "armazem",        label: "Armazém" },
  { key: "transportadora", label: "Transportadora" },
  { key: "porto_origem",   label: "Porto Origem" },
  { key: "navio",          label: "Navio" },
  { key: "porto_destino",  label: "Porto Destino" },
  { key: "entregue",       label: "Entregue" },
];

const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]";

export default function CropCheckpointForm({
  shipmentId,
  currentStage,
}: {
  shipmentId: string;
  currentStage: string | null;
}) {
  const router = useRouter();
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const defaultStage = STAGES.find(s => s.key === currentStage)
    ? currentStage!
    : STAGES[0].key;

  const [stage,       setStage]       = useState(defaultStage);
  const [stageDate,   setStageDate]   = useState(() => new Date().toISOString().split("T")[0]);
  const [qtyConf,     setQtyConf]     = useState("");
  const [qtyLost,     setQtyLost]     = useState("0");
  const [lossCause,   setLossCause]   = useState("");
  const [location,    setLocation]    = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes,       setNotes]       = useState("");

  function resetForm() {
    setQtyConf(""); setQtyLost("0"); setLossCause("");
    setLocation(""); setResponsible(""); setNotes("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/agriculture/checkpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipment_id:             shipmentId,
        stage,
        stage_date:              new Date(stageDate + "T12:00:00").toISOString(),
        quantity_confirmed_tons: qtyConf ? Number(qtyConf) : null,
        quantity_lost_tons:      Number(qtyLost) || 0,
        loss_cause:              lossCause || null,
        location_name:           location || null,
        responsible_name:        responsible || null,
        notes:                   notes || null,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "Erro ao salvar checkpoint.");
      setSaving(false);
      return;
    }

    setOpen(false);
    resetForm();
    router.refresh();
    setSaving(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-hover)] hover:bg-[var(--primary-soft)]/80 transition"
      >
        <Plus size={14} /> Registrar checkpoint
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Novo checkpoint</h3>
              <button onClick={() => setOpen(false)} className="rounded-xl p-1.5 hover:bg-[var(--surface-soft)] transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Estágio</label>
                  <select value={stage} onChange={e => setStage(e.target.value)} className={inputCls}>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" value={stageDate} onChange={e => setStageDate(e.target.value)} className={inputCls} required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Toneladas confirmadas</label>
                  <input type="number" step="0.001" min="0" value={qtyConf} onChange={e => setQtyConf(e.target.value)} placeholder="Ex: 3498.200" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Perdas (t)</label>
                  <input type="number" step="0.001" min="0" value={qtyLost} onChange={e => setQtyLost(e.target.value)} placeholder="0" className={inputCls} />
                </div>
              </div>

              {Number(qtyLost) > 0 && (
                <div>
                  <label className={labelCls}>Causa da perda</label>
                  <input type="text" value={lossCause} onChange={e => setLossCause(e.target.value)} placeholder="Ex: umidade acima do padrão" className={inputCls} />
                </div>
              )}

              <div>
                <label className={labelCls}>Local</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Porto de Santos" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Responsável</label>
                <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nome / agência" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Observações</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Detalhes do checkpoint..." className={inputCls + " resize-none"} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="ag-button-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="ag-button-primary flex items-center gap-2 disabled:opacity-60">
                  {saving ? <><Loader2 size={14} className="animate-spin" />Salvando…</> : "Salvar checkpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
