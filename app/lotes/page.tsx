"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const OBJECTIVES = ["Engorda", "Cria", "Recria", "Reprodução", "Descarte", "Exportação"];
const PAISES_DESTINO = ["Arábia Saudita", "Emirados Árabes", "Kuwait", "Qatar", "Omã", "Jordânia", "Egito", "Líbia", "Argélia"];
const PORTOS = ["Santos (SP)", "Paranaguá (PR)", "Vitória (ES)", "Salvador (BA)", "Fortaleza (CE)", "Belém (PA)", "Outro"];
const CERTS_DISPONIVEIS = ["Halal", "MAPA", "GTA", "TRACES", "SIF"];

type LotRow = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  start_date: string | null;
  status: string | null;
  property_id: string | null;
  client_id: string | null;
  pais_destino: string | null;
  porto_embarque: string | null;
  data_embarque: string | null;
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
  // Campos de exportação
  const [paisDestino, setPaisDestino] = useState("");
  const [portoEmbarque, setPortoEmbarque] = useState("");
  const [dataEmbarque, setDataEmbarque] = useState("");
  const [certsExigidas, setCertsExigidas] = useState<string[]>([]);
  const [numeroContrato, setNumeroContrato] = useState("");

  const [saving, setSaving] = useState(false);
  const [myClientId, setMyClientId] = useState<string | null>(null);

  const isExport = objetivo === "Exportação";

  function toggleCert(cert: string) {
    setCertsExigidas(prev => prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]);
  }

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
        supabase.from("lots")
          .select("id, name, description, objective, start_date, status, property_id, client_id, pais_destino, porto_embarque, data_embarque")
          .order("created_at", { ascending: false }),
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
      ...(isExport ? {
        pais_destino: paisDestino || null,
        porto_embarque: portoEmbarque || null,
        data_embarque: dataEmbarque || null,
        certificacoes_exigidas: certsExigidas.length > 0 ? certsExigidas : null,
        numero_contrato: numeroContrato || null,
      } : {}),
    }).select("id").single();

    if (data) {
      setShowForm(false);
      setNome(""); setObjetivo(""); setPropertyId(""); setTargetWeight("");
      setPaisDestino(""); setPortoEmbarque(""); setDataEmbarque(""); setCertsExigidas([]); setNumeroContrato("");
      const { data: lot } = await supabase.from("lots")
        .select("id, name, description, objective, start_date, status, property_id, client_id, pais_destino, porto_embarque, data_embarque")
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
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]">Nenhum lote cadastrado</h2>
            <p className="mt-4 max-w-md text-base leading-8 text-[var(--text-secondary)]">
              Organize seus animais em lotes por objetivo produtivo ou crie um <strong>Lote de Exportação</strong> com rastreabilidade completa para mercados internacionais.
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
                Organize o rebanho por objetivo produtivo. Acompanhe GMD, score médio, previsão de saída e conformidade de exportação.
              </p>
            </div>
            <button onClick={() => setShowForm(true)} className="ag-button-primary shrink-0">+ Novo lote</button>
          </div>
        </div>
      </section>

      {/* Formulário de criação */}
      {showForm && (
        <section className={`overflow-hidden rounded-3xl border ${isExport ? "border-[rgba(26,26,46,0.20)] bg-[linear-gradient(135deg,#0f0f1a_0%,#1a1a2e_100%)]" : "ag-card"} p-8`}>
          <h2 className={`text-xl font-semibold ${isExport ? "text-white" : "ag-section-title"}`}>
            {isExport ? "🌍 Criar Lote de Exportação" : "Criar novo lote"}
          </h2>
          {isExport && <p className="mt-1 text-sm text-white/60">Lote com rastreabilidade completa para mercados internacionais</p>}

          <form onSubmit={criarLote} className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={`mb-2 block text-sm font-medium ${isExport ? "text-white/80" : ""}`}>Nome do lote *</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
                className={isExport ? inpDark : inp} placeholder="Ex.: Lote Exportação Riad Mar/26" />
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isExport ? "text-white/80" : ""}`}>Objetivo</label>
              <select value={objetivo} onChange={e => setObjetivo(e.target.value)} className={isExport ? inpDark : inp}>
                <option value="">Selecione</option>
                {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isExport ? "text-white/80" : ""}`}>Propriedade</label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={isExport ? inpDark : inp}>
                <option value="">Selecione</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
              </select>
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isExport ? "text-white/80" : ""}`}>Data de início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={isExport ? inpDark : inp} />
            </div>
            <div>
              <label className={`mb-2 block text-sm font-medium ${isExport ? "text-white/80" : ""}`}>Meta de peso (kg)</label>
              <input type="number" value={targetWeight} onChange={e => setTargetWeight(e.target.value)}
                className={isExport ? inpDark : inp} placeholder="Ex.: 480" min="0" />
            </div>

            {/* Campos exclusivos de exportação */}
            {isExport && (
              <>
                <div className="sm:col-span-2">
                  <div className="my-2 border-t border-white/10" />
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Dados de Exportação</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">País de destino</label>
                  <select value={paisDestino} onChange={e => setPaisDestino(e.target.value)} className={inpDark}>
                    <option value="">Selecione</option>
                    {PAISES_DESTINO.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Porto de embarque</label>
                  <select value={portoEmbarque} onChange={e => setPortoEmbarque(e.target.value)} className={inpDark}>
                    <option value="">Selecione</option>
                    {PORTOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Data prevista de embarque</label>
                  <input type="date" value={dataEmbarque} onChange={e => setDataEmbarque(e.target.value)} className={inpDark} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Número do contrato</label>
                  <input type="text" value={numeroContrato} onChange={e => setNumeroContrato(e.target.value)}
                    className={inpDark} placeholder="Ex.: CONT-2026-001" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-3 block text-sm font-medium text-white/80">Certificações exigidas</label>
                  <div className="flex flex-wrap gap-3">
                    {CERTS_DISPONIVEIS.map(cert => (
                      <button key={cert} type="button" onClick={() => toggleCert(cert)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          certsExigidas.includes(cert)
                            ? "border-emerald-400 bg-emerald-500 text-white"
                            : "border-white/20 bg-white/8 text-white/70 hover:bg-white/15"
                        }`}>
                        {cert === "Halal" ? "☪ Halal" : cert}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={saving || !nome}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold disabled:opacity-60 ${isExport ? "bg-white text-[#1a1a2e] hover:bg-white/90" : "ag-button-primary"}`}>
                {saving ? "Criando..." : isExport ? "🌍 Criar Lote de Exportação" : "Criar lote"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className={`rounded-2xl border px-6 py-3 text-sm font-semibold ${isExport ? "border-white/20 text-white/70 hover:bg-white/8" : "ag-button-secondary"}`}>
                Cancelar
              </button>
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
          {lots.map(lot => {
            const isExportLot = lot.objective === "Exportação";
            return (
              <Link key={lot.id} href={`/lotes/${lot.id}`}
                className={`block rounded-3xl border p-6 transition ${
                  isExportLot
                    ? "border-[rgba(26,26,46,0.15)] bg-[linear-gradient(135deg,#0f0f1a_0%,#1a1a2e_100%)] hover:border-[rgba(255,255,255,0.15)]"
                    : "ag-card hover:border-[rgba(93,156,68,0.30)] hover:bg-[var(--primary-soft)]"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${isExportLot ? "bg-white/10" : "bg-[var(--primary-soft)]"}`}>
                    {isExportLot ? "🌍" : "📦"}
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    isExportLot ? "bg-emerald-500/20 text-emerald-300" : lot.status === "active" ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]" : "bg-[rgba(31,41,55,0.08)] text-[var(--text-secondary)]"
                  }`}>{lot.status === "active" ? (isExportLot ? "Export Active" : "Ativo") : lot.status ?? "—"}</span>
                </div>
                <h3 className={`mt-4 text-xl font-semibold tracking-[-0.03em] ${isExportLot ? "text-white" : "text-[var(--text-primary)]"}`}>{lot.name}</h3>
                <p className={`mt-1 text-sm ${isExportLot ? "text-white/55" : "text-[var(--text-muted)]"}`}>
                  {lot.objective ?? "—"}
                  {lot.pais_destino ? ` · ${lot.pais_destino}` : ""}
                  {lot.data_embarque ? ` · embarque ${new Date(lot.data_embarque).toLocaleDateString("pt-BR")}` : lot.start_date ? ` · início ${new Date(lot.start_date).toLocaleDateString("pt-BR")}` : ""}
                </p>
                <p className={`mt-4 text-sm font-medium ${isExportLot ? "text-emerald-400" : "text-[var(--primary-hover)]"}`}>
                  {isExportLot ? "Ver conformidade →" : "Ver dashboard →"}
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

const inp = "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#4A7C3A]";
const inpDark = "w-full rounded-lg border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none focus:border-white/40 placeholder:text-white/30";
