"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { DollarSign, Weight, TrendingUp, CheckCircle, Loader2 } from "lucide-react";
import DocumentGate, {
  type GateMode,
  type ParsedDoc,
  LockedField,
  UnverifiedBadge,
} from "@/app/components/DocumentGate";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Animal   = { id: string; internal_code: string | null };
type Property = { id: string; name: string | null };
type VendaEvent = {
  id: string;
  event_date: string | null;
  animal_id: string | null;
  notes: string | null;
  document_source: string | null;
};

function parseNotes(notes: string | null): { comprador?: string; preco?: number; peso?: number; animal_code?: string } {
  try { return notes ? JSON.parse(notes) : {}; } catch { return {}; }
}

export default function VendasPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 py-8 text-sm text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin" />Carregando…</div>}>
      <VendasContent />
    </Suspense>
  );
}

function VendasContent() {
  const searchParams   = useSearchParams();
  const presetAnimalId = searchParams.get("animalId") ?? "";

  const [animals,    setAnimals]    = useState<Animal[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [history,    setHistory]    = useState<VendaEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");

  // DocumentGate
  const [gateMode,  setGateMode]  = useState<GateMode>("idle");
  const [parsedDoc, setParsedDoc] = useState<ParsedDoc | null>(null);

  // Campos do formulário
  const [animalId,   setAnimalId]   = useState(presetAnimalId);
  const [propertyId, setPropertyId] = useState("");
  const [saleDate,   setSaleDate]   = useState(new Date().toISOString().slice(0, 10));
  const [comprador,  setComprador]  = useState("");
  const [preco,      setPreco]      = useState("");
  const [pesoVivo,   setPesoVivo]   = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ar, pr, hr] = await Promise.all([
        supabase.from("animals").select("id, internal_code").order("created_at", { ascending: false }),
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("events")
          .select("id, event_date, animal_id, notes, document_source")
          .eq("source", "animal").eq("event_type", "ownership_transfer")
          .order("event_date", { ascending: false }).limit(50),
      ]);
      setAnimals(ar.data ?? []);
      setProperties(pr.data ?? []);
      setHistory(hr.data ?? []);
      setLoading(false);
    })();
  }, []);

  const animalMap   = useMemo(() => new Map(animals.map(a => [a.id, a.internal_code ?? a.id])), [animals]);
  const parsedHistory = useMemo(() => history.map(e => ({ ...e, ...parseNotes(e.notes) })), [history]);

  const kpis = useMemo(() => {
    const total     = parsedHistory.length;
    const receita   = parsedHistory.reduce((s, e) => s + (e.preco ?? 0), 0);
    const pesoTotal = parsedHistory.reduce((s, e) => s + (e.peso ?? 0), 0);
    return { total, receita, pesoTotal };
  }, [parsedHistory]);

  function handleParsed(data: ParsedDoc) {
    setParsedDoc(data);
    setGateMode("verified");
    // Pre-preenche comprador (destinatário da nota) e preço
    setComprador(data.header.destinatario_nome || "");
    setPreco(data.header.valor_total > 0 ? String(data.header.valor_total) : "");
  }

  function handleManual() {
    setParsedDoc(null);
    setGateMode("manual");
  }

  function handleReset() {
    setParsedDoc(null);
    setGateMode("idle");
    setComprador("");
    setPreco("");
  }

  function verifiedSummary() {
    if (!parsedDoc) return "";
    const h = parsedDoc.header;
    const parts = [
      h.numero_nota && `NF-e ${h.numero_nota}`,
      h.emitente_nome,
      h.valor_total > 0 && `R$\u00a0${h.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    ].filter(Boolean);
    return parts.join(" · ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(""); setSuccess("");

    const selectedAnimal = animals.find(a => a.id === animalId);
    const notesObj = {
      animal_code: selectedAnimal?.internal_code ?? animalId,
      comprador:   comprador || undefined,
      preco:       preco ? Number(preco) : undefined,
      peso:        pesoVivo ? Number(pesoVivo) : undefined,
    };

    let documentSource: string | null = null;
    if (gateMode === "verified" && parsedDoc) {
      documentSource = `nfe:${parsedDoc.header.numero_nota}`;
    }

    try {
      const [evErr, anErr] = await Promise.all([
        supabase.from("events").insert({
          animal_id:       animalId || null,
          source:          "animal",
          event_type:      "ownership_transfer",
          event_date:      saleDate || null,
          notes:           JSON.stringify(notesObj),
          document_source: documentSource,
        }).then(r => r.error),
        propertyId
          ? supabase.from("animals").update({ current_property_id: propertyId }).eq("id", animalId).then(r => r.error)
          : Promise.resolve(null),
      ]);
      if (evErr) { setError(evErr.message); return; }
      if (anErr) { setError(anErr.message); return; }
      setSuccess("Venda registrada com sucesso.");
      // Atualiza histórico
      const { data: newH } = await supabase.from("events")
        .select("id, event_date, animal_id, notes, document_source")
        .eq("source", "animal").eq("event_type", "ownership_transfer")
        .order("event_date", { ascending: false }).limit(50);
      setHistory(newH ?? []);
      // Reset form
      setAnimalId(""); setPropertyId(""); setPesoVivo("");
      setSaleDate(new Date().toISOString().slice(0, 10));
      handleReset();
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
  const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

  return (
    <main className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Registro</span>
            <h1 className="ag-page-title">Vendas e Transferências</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Registre vendas de animais com comprador, preço e peso. Importe a NF-e para dados verificados.
            </p>
          </div>
          <div className="ag-hero-panel">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" />Carregando…</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Total vendas",  value: kpis.total,   sub: "registradas",        icon: TrendingUp, bg: "bg-[var(--primary-soft)]", cl: "text-[var(--primary)]" },
                  { label: "Receita total", value: `R$\u00a0${kpis.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, sub: "soma informada", icon: DollarSign, bg: "bg-emerald-50", cl: "text-emerald-600" },
                  { label: "Peso vendido",  value: kpis.pesoTotal > 0 ? `${kpis.pesoTotal.toLocaleString("pt-BR")} kg` : "—", sub: "total informado", icon: Weight, bg: "bg-blue-50", cl: "text-blue-600" },
                ].map(k => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="ag-kpi-card">
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${k.bg}`}>
                        <Icon size={17} className={k.cl} />
                      </div>
                      <p className="mt-3 ag-kpi-label">{k.label}</p>
                      <p className="ag-kpi-value">{k.value}</p>
                      <p className="sub">{k.sub}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Formulário ───────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-6">
        <h2 className="ag-section-title">Registrar venda / transferência</h2>

        <DocumentGate
          mode={gateMode}
          verifiedSummary={verifiedSummary()}
          onParsed={handleParsed}
          onManual={handleManual}
          onReset={handleReset}
        >
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Animal */}
            <div>
              <label className={labelCls}>Animal *</label>
              <select value={animalId} onChange={e => setAnimalId(e.target.value)} className={inputCls} required>
                <option value="">Selecione um animal</option>
                {animals.map(a => <option key={a.id} value={a.id}>{a.internal_code ?? a.id}</option>)}
              </select>
            </div>

            {/* Propriedade destino */}
            <div>
              <label className={labelCls}>Propriedade destino</label>
              <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inputCls}>
                <option value="">Não informado</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
              </select>
            </div>

            {/* Data */}
            <div>
              <label className={labelCls}>Data da venda *</label>
              <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className={inputCls} required />
            </div>

            {/* Comprador — bloqueado se veio da NF-e */}
            {gateMode === "verified" && parsedDoc?.header.destinatario_nome ? (
              <LockedField label="Comprador" value={parsedDoc.header.destinatario_nome} />
            ) : (
              <div>
                <label className={labelCls}>
                  Comprador
                  {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
                </label>
                <input
                  type="text"
                  value={comprador}
                  onChange={e => setComprador(e.target.value)}
                  placeholder="Nome ou empresa"
                  className={inputCls}
                />
              </div>
            )}

            {/* Preço — bloqueado se veio da NF-e */}
            {gateMode === "verified" && parsedDoc && parsedDoc.header.valor_total > 0 ? (
              <LockedField
                label="Preço (R$)"
                value={`R$\u00a0${parsedDoc.header.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              />
            ) : (
              <div>
                <label className={labelCls}>
                  Preço (R$)
                  {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={preco}
                  onChange={e => setPreco(e.target.value)}
                  placeholder="0,00"
                  className={inputCls}
                />
              </div>
            )}

            {/* Peso vivo — sempre editável (não está na NF-e) */}
            <div>
              <label className={labelCls}>
                Peso vivo (kg)
                {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={pesoVivo}
                onChange={e => setPesoVivo(e.target.value)}
                placeholder="Ex: 450"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="ag-button-primary flex items-center gap-2 disabled:opacity-60"
              >
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" />Registrando…</>
                  : "Registrar venda"
                }
              </button>
              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle size={14} />{success}
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </DocumentGate>
      </section>

      {/* ── Histórico ────────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="ag-section-title">Histórico de vendas</h2>
          <span className="ag-badge">{history.length} registros</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" />Carregando…</div>
        ) : parsedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Data</th>
                  <th className="text-left">Animal</th>
                  <th className="text-left">Comprador</th>
                  <th className="text-right">Preço</th>
                  <th className="text-right">Peso vivo</th>
                  <th className="text-center">Rastreabilidade</th>
                </tr>
              </thead>
              <tbody>
                {parsedHistory.map(e => (
                  <tr key={e.id}>
                    <td className="tabular-nums text-[var(--text-secondary)]">
                      {e.event_date ? new Date(e.event_date).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="font-medium">
                      {e.animal_code ?? (e.animal_id ? animalMap.get(e.animal_id) : "—") ?? "—"}
                    </td>
                    <td className="text-[var(--text-secondary)]">{e.comprador ?? "—"}</td>
                    <td className="text-right tabular-nums font-medium">
                      {e.preco != null ? `R$\u00a0${Number(e.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="text-right tabular-nums">
                      {e.peso != null ? `${Number(e.peso).toLocaleString("pt-BR")} kg` : "—"}
                    </td>
                    <td className="text-center">
                      {e.document_source ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                          ✓ {e.document_source.startsWith("nfe:") ? `NF-e ${e.document_source.split(":")[1]}` : e.document_source}
                        </span>
                      ) : (
                        <UnverifiedBadge />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
