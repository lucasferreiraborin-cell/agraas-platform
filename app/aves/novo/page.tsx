"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";

type PropertyRow = { id: string; name: string };

const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]";

export default function AvesNovoPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [batchCode,      setBatchCode]      = useState("");
  const [species,        setSpecies]        = useState<"frango" | "peru" | "pato">("frango");
  const [breed,          setBreed]          = useState("");
  const [housingDate,    setHousingDate]    = useState("");
  const [initialCount,   setInitialCount]   = useState("");
  const [integratorName, setIntegratorName] = useState("");
  const [propertyId,     setPropertyId]     = useState("");
  const [notes,          setNotes]          = useState("");

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
    if (!initialCount || Number(initialCount) <= 0) {
      setError("Quantidade inicial deve ser maior que zero.");
      return;
    }
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

    const count = Number(initialCount);
    const payload = {
      client_id:      client.id,
      batch_code:     batchCode,
      species,
      breed:          breed || null,
      housing_date:   housingDate,
      initial_count:  count,
      current_count:  count,
      mortality_count: 0,
      integrator_name: integratorName || null,
      property_id:    propertyId || null,
      notes:          notes || null,
      status:         "alojado",
    };

    const { data, error: err } = await supabase
      .from("poultry_batches")
      .insert(payload)
      .select("id")
      .single();

    if (err) { setError(err.message); setSaving(false); return; }
    router.push(`/aves/${data.id}`);
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong p-8">
        <Link href="/aves" className="mb-6 flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
          <ArrowLeft size={14} /> Voltar para Aves
        </Link>
        <span className="ag-badge ag-badge-green">Pecuária Expandida</span>
        <h1 className="ag-page-title">Novo lote avícola</h1>
        <p className="mt-3 text-[var(--text-secondary)]">Cadastro de lote de frango, peru ou pato.</p>
      </section>

      <section className="ag-card-strong p-8">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          {/* Código + Espécie */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Código do lote *</label>
              <input
                type="text"
                value={batchCode}
                onChange={e => setBatchCode(e.target.value)}
                placeholder="Ex: FRG-2025-003"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Espécie *</label>
              <select value={species} onChange={e => setSpecies(e.target.value as "frango" | "peru" | "pato")} className={inputCls} required>
                <option value="frango">Frango</option>
                <option value="peru">Peru</option>
                <option value="pato">Pato</option>
              </select>
            </div>
          </div>

          {/* Raça + Data alojamento */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Raça / Linhagem</label>
              <input type="text" value={breed} onChange={e => setBreed(e.target.value)} placeholder="Ex: Ross 308, Cobb 500" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data de alojamento *</label>
              <input type="date" value={housingDate} onChange={e => setHousingDate(e.target.value)} className={inputCls} required />
            </div>
          </div>

          {/* Quantidade inicial + Integrador */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Quantidade inicial *</label>
              <input
                type="number"
                min="1"
                value={initialCount}
                onChange={e => setInitialCount(e.target.value)}
                placeholder="Ex: 15000"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Integrador / Empresa</label>
              <input type="text" value={integratorName} onChange={e => setIntegratorName(e.target.value)} placeholder="Ex: BRF, JBS Aves" className={inputCls} />
            </div>
          </div>

          {/* Propriedade */}
          <div>
            <label className={labelCls}>Propriedade</label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inputCls}>
              <option value="">— Selecione —</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
            <Link href="/aves" className="ag-button-secondary">Cancelar</Link>
            <button type="submit" disabled={saving} className="ag-button-primary flex items-center gap-2 disabled:opacity-60">
              {saving ? <><Loader2 size={14} className="animate-spin" />Salvando…</> : "Criar lote"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
