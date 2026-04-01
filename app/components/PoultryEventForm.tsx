"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]";

const EVENT_LABELS: Record<string, string> = {
  vacina: "Vacinação", racao: "Ração", mortalidade: "Mortalidade", pesagem: "Pesagem", abate: "Abate",
};

const VALUE_PLACEHOLDER: Record<string, string> = {
  vacina: "— (opcional)",
  racao: "Kg de ração distribuída",
  mortalidade: "Nº de aves mortas",
  pesagem: "Peso médio em kg (ex: 1.82)",
  abate: "Nº de aves abatidas",
};

export default function PoultryEventForm({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [open,     setOpen]     = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const [eventType, setEventType] = useState<string>("pesagem");
  const [date,      setDate]      = useState(() => new Date().toISOString().split("T")[0]);
  const [value,     setValue]     = useState("");
  const [notes,     setNotes]     = useState("");
  const [operator,  setOperator]  = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sessão expirada."); setSaving(false); return; }

    const { data: client } = await supabase
      .from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!client) { setError("Cliente não encontrado."); setSaving(false); return; }

    const { error: err } = await supabase
      .from("poultry_batch_events")
      .insert({
        batch_id:   batchId,
        client_id:  client.id,
        event_type: eventType,
        date,
        value:      value ? Number(value) : null,
        notes:      notes || null,
        operator:   operator || null,
      });

    if (err) { setError(err.message); setSaving(false); return; }

    setOpen(false);
    setValue(""); setNotes(""); setOperator("");
    router.refresh();
    setSaving(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary-hover)] hover:bg-[var(--primary-soft)]/80 transition"
      >
        <Plus size={14} /> Registrar evento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Novo evento</h3>
              <button onClick={() => setOpen(false)} className="rounded-xl p-1.5 hover:bg-[var(--surface-soft)] transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Tipo de evento</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)} className={inputCls}>
                    {Object.entries(EVENT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} required />
                </div>
              </div>

              <div>
                <label className={labelCls}>Valor numérico</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={VALUE_PLACEHOLDER[eventType] ?? "Valor"}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Operador / Responsável</label>
                <input type="text" value={operator} onChange={e => setOperator(e.target.value)} placeholder="Nome do responsável" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Observações</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Detalhes do evento..." className={inputCls + " resize-none"} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="ag-button-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="ag-button-primary flex items-center gap-2 disabled:opacity-60">
                  {saving ? <><Loader2 size={14} className="animate-spin" />Salvando…</> : "Salvar evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
