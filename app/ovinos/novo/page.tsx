"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";

type PropertyRow = { id: string; name: string };

const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]";

export default function OvinosNovoPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [species,      setSpecies]      = useState<"ovino" | "caprino">("ovino");
  const [internalCode, setInternalCode] = useState("");
  const [breed,        setBreed]        = useState("");
  const [birthDate,    setBirthDate]    = useState("");
  const [sex,          setSex]          = useState<"Male" | "Female">("Male");
  const [weightKg,     setWeightKg]     = useState("");
  const [propertyId,   setPropertyId]   = useState("");
  const [rfid,         setRfid]         = useState("");
  const [notes,        setNotes]        = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      if (!client) return;
      const { data: props } = await supabase
        .from("properties")
        .select("id, name")
        .eq("client_id", client.id)
        .order("name");
      setProperties(props ?? []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sessão expirada."); setSaving(false); return; }

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    if (!client) { setError("Cliente não encontrado."); setSaving(false); return; }

    const payload = {
      client_id:     client.id,
      species,
      internal_code: internalCode || null,
      breed:         breed || null,
      birth_date:    birthDate || null,
      sex,
      weight_kg:     weightKg ? Number(weightKg) : null,
      property_id:   propertyId || null,
      rfid:          rfid || null,
      notes:         notes || null,
      status:        "active",
    };

    const { data, error: err } = await supabase
      .from("livestock_species")
      .insert(payload)
      .select("id")
      .single();

    if (err) { setError(err.message); setSaving(false); return; }
    router.push(`/ovinos/${data.id}`);
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <Link href="/ovinos" className="mb-6 flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
          <ArrowLeft size={14} /> Voltar para Ovinos
        </Link>
        <span className="ag-badge ag-badge-green">Pecuária Expandida</span>
        <h1 className="ag-page-title">Novo animal</h1>
        <p className="mt-3 text-[var(--text-secondary)]">Cadastro individual de ovino ou caprino.</p>
      </section>

      <section className="ag-card-strong p-8">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          {/* Espécie + Código */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Espécie *</label>
              <select value={species} onChange={e => setSpecies(e.target.value as "ovino" | "caprino")} className={inputCls} required>
                <option value="ovino">Ovino</option>
                <option value="caprino">Caprino</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Código interno</label>
              <input type="text" value={internalCode} onChange={e => setInternalCode(e.target.value)} placeholder="Ex: OV-001" className={inputCls} />
            </div>
          </div>

          {/* Raça + Data de nascimento */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Raça</label>
              <input type="text" value={breed} onChange={e => setBreed(e.target.value)} placeholder="Ex: Dorper, Santa Inês, Boer" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data de nascimento</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Sexo + Peso */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Sexo</label>
              <select value={sex} onChange={e => setSex(e.target.value as "Male" | "Female")} className={inputCls}>
                <option value="Male">Macho</option>
                <option value="Female">Fêmea</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Peso atual (kg)</label>
              <input type="number" step="0.1" min="0" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Ex: 55.0" className={inputCls} />
            </div>
          </div>

          {/* Propriedade + RFID */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Propriedade</label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inputCls}>
                <option value="">— Selecione —</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>RFID</label>
              <input type="text" value={rfid} onChange={e => setRfid(e.target.value)} placeholder="Ex: 941000026XXXXXX" className={inputCls} />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Informações adicionais..." className={inputCls + " resize-none"} />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Link href="/ovinos" className="ag-button-secondary">Cancelar</Link>
            <button type="submit" disabled={saving} className="ag-button-primary flex items-center gap-2 disabled:opacity-60">
              {saving ? <><Loader2 size={14} className="animate-spin" />Salvando…</> : "Cadastrar animal"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
