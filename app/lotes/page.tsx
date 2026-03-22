"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const OBJECTIVES = ["Engorda", "Cria", "Recria", "Reprodução", "Descarte"];

type LotRow = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  start_date: string | null;
  status: string | null;
  property_id: string | null;
  client_id: string | null;
};

type PropertyRow = { id: string; name: string | null };

export default function LotesPage() {
  const [lots, setLots] = useState<LotRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Campos do form
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetWeight, setTargetWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [myClientId, setMyClientId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      let clientId: string | null = null;
      if (user) {
        const { data: c } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
        clientId = c?.id ?? null;
        setMyClientId(clientId);
      }

      const [{ data: lotsData }, { data: propsData }] = await Promise.all([
        supabase.from("lots").select("id, name, description, objective, start_date, status, property_id, client_id").order("created_at", { ascending: false }),
        supabase.from("properties").select("id, name").order("name"),
      ]);
      setLots((lotsData as LotRow[]) ?? []);
      setProperties((propsData as PropertyRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function criarLote(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !myClientId) return;
    setSaving(true);
    const { data } = await supabase.from("lots").insert({
      name: nome,
      objective: objetivo || null,
      property_id: propertyId || null,
      start_date: startDate || null,
      target_weight: targetWeight ? Number(targetWeight) : null,
      status: "active",
      client_id: myClientId,
    }).select("id").single();

    if (data) {
      setShowForm(false);
      setNome(""); setObjetivo(""); setPropertyId(""); setTargetWeight("");
      const { data: lot } = await supabase.from("lots")
        .select("id, name, description, objective, start_date, status, property_id, client_id")
        .eq("id", data.id).single();
      if (lot) setLots(prev => [lot as LotRow, ...prev]);
    }
    setSaving(false);
  }

  if (!loading && lots.length === 0 && !showForm) {
    return (
      <main className="space-y-8">
        <div className="ag-card-strong overflow-hidden">
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-4xl">📦</div>
            <div className="ag-badge ag-badge-green mt-8">Gestão de lotes</div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Nenhum lote cadastrado</h2>
            <p className="mt-4 max-w-md text-base leading-8 text-[var(--text-secondary)]">
              Organize seus animais em lotes por objetivo (engorda, cria, recria) para controlar GMD e performance.
            </p>
            <button onClick={() => setShowForm(true)} className="ag-button-primary mt-8">Criar primeiro lote</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="p-8 lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="ag-badge ag-badge-green">Gestão de lotes</div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-5xl">Lotes da operação</h1>
              <p className="mt-4 text-[1.02rem] leading-8 text-[var(--text-secondary)]">
                Organize o rebanho por objetivo produtivo. Acompanhe GMD, score médio e previsão de saída.
              </p>
            </div>
            <button onClick={() => setShowForm(true)} className="ag-button-primary shrink-0">+ Novo lote</button>
          </div>
        </div>
      </section>

      {/* Formulário de criação */}
      {showForm && (
        <section className="ag-card p-8">
          <h2 className="ag-section-title">Criar novo lote</h2>
          <form onSubmit={criarLote} className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Nome do lote *</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
                className={inp} placeholder="Ex.: Lote Engorda Ago/24" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Objetivo</label>
              <select value={objetivo} onChange={e => setObjetivo(e.target.value)} className={inp}>
                <option value="">Selecione</option>
                {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Propriedade</label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inp}>
                <option value="">Selecione</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Data de início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Meta de peso (kg)</label>
              <input type="number" value={targetWeight} onChange={e => setTargetWeight(e.target.value)}
                className={inp} placeholder="Ex.: 480" min="0" />
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={saving || !nome}
                className="ag-button-primary disabled:opacity-60">{saving ? "Criando..." : "Criar lote"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="ag-button-secondary">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {/* Lista de lotes */}
      {loading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-3xl bg-[var(--surface-soft)]" />)}
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-3">
          {lots.map(lot => (
            <Link key={lot.id} href={`/lotes/${lot.id}`}
              className="ag-card block p-6 transition hover:border-[rgba(93,156,68,0.30)] hover:bg-[var(--primary-soft)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl">📦</div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  lot.status === "active"
                    ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                    : "bg-[rgba(31,41,55,0.08)] text-[var(--text-secondary)]"
                }`}>{lot.status === "active" ? "Ativo" : lot.status ?? "—"}</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{lot.name}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {lot.objective ?? "—"}
                {lot.start_date ? ` · início ${new Date(lot.start_date).toLocaleDateString("pt-BR")}` : ""}
              </p>
              <p className="mt-4 text-sm font-medium text-[var(--primary-hover)]">Ver dashboard →</p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

const inp = "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#4A7C3A]";
