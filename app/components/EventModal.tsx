"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type EventType = "weight" | "observation";

export default function EventModal({ animalId }: { animalId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EventType>("weight");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Campos pesagem
  const [weight, setWeight] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightNotes, setWeightNotes] = useState("");

  // Campos observação
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventNotes, setEventNotes] = useState("");

  function reset() {
    setWeight(""); setWeightDate(new Date().toISOString().slice(0, 10)); setWeightNotes("");
    setEventType(""); setEventDate(new Date().toISOString().slice(0, 10)); setEventNotes("");
    setError(""); setType("weight");
  }

  async function salvar() {
    setLoading(true);
    setError("");

    if (type === "weight") {
      if (!weight) { setError("Informe o peso."); setLoading(false); return; }
      const { error: wErr } = await supabase.from("weights").insert({
        animal_id: animalId,
        weight: Number(weight),
        weighing_date: weightDate || null,
        notes: weightNotes || null,
      });
      if (!wErr) {
        await supabase.from("events").insert({
          animal_id: animalId,
          source: "animal",
          event_type: "weight_recorded",
          event_date: weightDate || null,
          notes: `Pesagem: ${weight} kg${weightNotes ? ` — ${weightNotes}` : ""}`,
        });
      }
      if (wErr) { setError(wErr.message); setLoading(false); return; }
    } else {
      const { error: eErr } = await supabase.from("events").insert({
        animal_id: animalId,
        source: "animal",
        event_type: eventType || "observation",
        event_date: eventDate || null,
        notes: eventNotes || null,
      });
      if (eErr) { setError(eErr.message); setLoading(false); return; }
    }

    setLoading(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ag-button-primary"
      >
        + Registrar evento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Registrar evento
              </h2>
              <button type="button" onClick={() => { setOpen(false); reset(); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>

            {/* Switch de tipo */}
            <div className="mt-5 flex rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-1">
              {(["weight", "observation"] as EventType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                    type === t
                      ? "bg-white shadow-[var(--shadow-soft)] text-[var(--text-primary)]"
                      : "text-[var(--text-muted)]"
                  }`}>
                  {t === "weight" ? "⚖ Pesagem" : "📋 Observação"}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {type === "weight" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Peso (kg) *</span>
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                      className={inputClass} placeholder="Ex.: 420" min="0" step="0.1" autoFocus />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Data</span>
                    <input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value)} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Observações</span>
                    <input type="text" value={weightNotes} onChange={e => setWeightNotes(e.target.value)}
                      className={inputClass} placeholder="Ex.: Pesagem mensal" />
                  </label>
                </>
              )}

              {type === "observation" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Tipo de evento</span>
                    <input type="text" value={eventType} onChange={e => setEventType(e.target.value)}
                      className={inputClass} placeholder="Ex.: Vacinação, Exame, Observação..." autoFocus />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Data</span>
                    <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Descrição</span>
                    <textarea value={eventNotes} onChange={e => setEventNotes(e.target.value)}
                      className={`${inputClass} min-h-[80px] resize-y`} placeholder="Descreva o evento..." />
                  </label>
                </>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={salvar} disabled={loading}
                className="flex-1 rounded-2xl bg-[var(--primary-hover)] py-3 text-sm font-semibold text-white transition hover:bg-[#3B6B2E] disabled:opacity-60">
                {loading ? "Salvando..." : "Salvar evento"}
              </button>
              <button type="button" onClick={() => { setOpen(false); reset(); }}
                className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputClass = "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#4A7C3A] focus:ring-1 focus:ring-[#4A7C3A]/20";
