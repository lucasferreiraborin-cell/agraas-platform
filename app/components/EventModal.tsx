"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type EventType = "weight" | "application" | "movement" | "observation";

const UNITS = ["mL", "g", "comprimido", "UI", "dose"];
const MOVEMENT_TYPES = ["Transferência", "Venda", "Empréstimo", "Retorno", "Outro"];

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

  // Campos aplicação sanitária
  const [productName, setProductName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("mL");
  const [appDate, setAppDate] = useState(new Date().toISOString().slice(0, 10));
  const [operatorName, setOperatorName] = useState("");
  const [carenciaDias, setCarenciaDias] = useState("");

  // Campos movimentação
  const [movementType, setMovementType] = useState("Transferência");
  const [originRef, setOriginRef] = useState("");
  const [destinationRef, setDestinationRef] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [movementNotes, setMovementNotes] = useState("");

  // Campos observação
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventNotes, setEventNotes] = useState("");

  function reset() {
    setWeight(""); setWeightDate(new Date().toISOString().slice(0, 10)); setWeightNotes("");
    setProductName(""); setDose(""); setUnit("mL"); setAppDate(new Date().toISOString().slice(0, 10));
    setOperatorName(""); setCarenciaDias("");
    setMovementType("Transferência"); setOriginRef(""); setDestinationRef("");
    setMovementDate(new Date().toISOString().slice(0, 10)); setMovementNotes("");
    setEventType(""); setEventDate(new Date().toISOString().slice(0, 10)); setEventNotes("");
    setError(""); setType("weight");
  }

  function calcWithdrawalDate(date: string, dias: string): string | null {
    if (!date || !dias || isNaN(Number(dias))) return null;
    const d = new Date(date);
    d.setDate(d.getDate() + Number(dias));
    return d.toISOString().slice(0, 10);
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
      if (wErr) { setError(wErr.message); setLoading(false); return; }
      await supabase.from("events").insert({
        animal_id: animalId,
        source: "animal",
        event_type: "weight_recorded",
        event_date: weightDate || null,
        notes: `Pesagem: ${weight} kg${weightNotes ? ` — ${weightNotes}` : ""}`,
      });

    } else if (type === "application") {
      if (!productName) { setError("Informe o produto."); setLoading(false); return; }
      const withdrawalDate = calcWithdrawalDate(appDate, carenciaDias);
      const { error: aErr } = await supabase.from("applications").insert({
        animal_id: animalId,
        product_name: productName,
        dose: dose ? Number(dose) : null,
        unit: unit || null,
        operator_name: operatorName || null,
        application_date: appDate || null,
        withdrawal_date: withdrawalDate,
      });
      if (aErr) { setError(aErr.message); setLoading(false); return; }
      await supabase.from("events").insert({
        animal_id: animalId,
        source: "animal",
        event_type: "application",
        event_date: appDate || null,
        notes: `Aplicação: ${productName}${dose ? ` — ${dose} ${unit}` : ""}${withdrawalDate ? ` · Carência até ${new Date(withdrawalDate).toLocaleDateString("pt-BR")}` : ""}`,
      });

    } else if (type === "movement") {
      if (!destinationRef) { setError("Informe o destino."); setLoading(false); return; }
      const { error: mErr } = await supabase.from("animal_movements").insert({
        animal_id: animalId,
        movement_type: movementType,
        origin_ref: originRef || null,
        destination_ref: destinationRef,
        movement_date: movementDate || null,
        notes: movementNotes || null,
      });
      if (mErr) { setError(mErr.message); setLoading(false); return; }
      await supabase.from("events").insert({
        animal_id: animalId,
        source: "animal",
        event_type: "movement",
        event_date: movementDate || null,
        notes: `${movementType}: ${originRef ? `${originRef} → ` : ""}${destinationRef}${movementNotes ? ` — ${movementNotes}` : ""}`,
      });

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

  const tabs: { key: EventType; label: string }[] = [
    { key: "weight", label: "⚖ Pesagem" },
    { key: "application", label: "💉 Aplicação" },
    { key: "movement", label: "🚛 Movimentação" },
    { key: "observation", label: "📋 Observação" },
  ];

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
              {tabs.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setType(key)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${
                    type === key
                      ? "bg-white shadow-[var(--shadow-soft)] text-[var(--text-primary)]"
                      : "text-[var(--text-muted)]"
                  }`}>
                  {label}
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

              {type === "application" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Produto *</span>
                    <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
                      className={inputClass} placeholder="Ex.: Ivermectina, Vacina aftosa..." autoFocus />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">Dose</span>
                      <input type="number" value={dose} onChange={e => setDose(e.target.value)}
                        className={inputClass} placeholder="Ex.: 5" min="0" step="0.01" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">Unidade</span>
                      <select value={unit} onChange={e => setUnit(e.target.value)} className={inputClass}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Data da aplicação</span>
                    <input type="date" value={appDate} onChange={e => setAppDate(e.target.value)} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Operador</span>
                    <input type="text" value={operatorName} onChange={e => setOperatorName(e.target.value)}
                      className={inputClass} placeholder="Nome do responsável" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Carência (dias)</span>
                    <input type="number" value={carenciaDias} onChange={e => setCarenciaDias(e.target.value)}
                      className={inputClass} placeholder="Ex.: 21" min="0" />
                  </label>
                  {carenciaDias && appDate && (
                    <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm">
                      <span className="text-[var(--text-muted)]">Data de liberação: </span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {new Date(calcWithdrawalDate(appDate, carenciaDias) ?? "").toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </>
              )}

              {type === "movement" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Tipo de movimentação</span>
                    <select value={movementType} onChange={e => setMovementType(e.target.value)} className={inputClass} autoFocus>
                      {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Origem</span>
                    <input type="text" value={originRef} onChange={e => setOriginRef(e.target.value)}
                      className={inputClass} placeholder="Ex.: Fazenda Santa Helena" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Destino *</span>
                    <input type="text" value={destinationRef} onChange={e => setDestinationRef(e.target.value)}
                      className={inputClass} placeholder="Ex.: Fazenda Rio Verde" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Data</span>
                    <input type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Observações</span>
                    <input type="text" value={movementNotes} onChange={e => setMovementNotes(e.target.value)}
                      className={inputClass} placeholder="Ex.: Venda para frigorífico..." />
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
