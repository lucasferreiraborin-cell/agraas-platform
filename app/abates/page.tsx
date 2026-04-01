"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Beef, Weight, Building2, Percent, CheckCircle, Loader2 } from "lucide-react";
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

type Animal         = { id: string; internal_code: string | null };
type Slaughterhouse = { id: string; name: string | null };
type SlaughterRecord = {
  id: string;
  animal_id: string | null;
  slaughterhouse_id: string | null;
  slaughter_date: string | null;
  carcass_weight: number | null;
  classification: string | null;
  document_source: string | null;
};

const inputCls = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

export default function AbatesPage() {
  const [animals,         setAnimals]         = useState<Animal[]>([]);
  const [slaughterhouses, setSlaughterhouses]  = useState<Slaughterhouse[]>([]);
  const [records,         setRecords]         = useState<SlaughterRecord[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [submitting,      setSubmitting]      = useState(false);
  const [success,         setSuccess]         = useState("");
  const [error,           setError]           = useState("");

  // DocumentGate
  const [gateMode,  setGateMode]  = useState<GateMode>("idle");
  const [parsedDoc, setParsedDoc] = useState<ParsedDoc | null>(null);

  // Campos do formulário
  const [animalId,       setAnimalId]       = useState("");
  const [frigorificoId,  setFrigorificoId]  = useState("");
  const [slaughterDate,  setSlaughterDate]  = useState(new Date().toISOString().slice(0, 10));
  const [pesoVivo,       setPesoVivo]       = useState("");
  const [pesoCarcaca,    setPesoCarcaca]    = useState("");
  const [classification, setClassification] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ar, sr, rr] = await Promise.all([
        supabase.from("animals").select("id, internal_code").order("created_at", { ascending: false }),
        supabase.from("slaughterhouses").select("id, name").order("name"),
        supabase.from("slaughter_records")
          .select("id, animal_id, slaughterhouse_id, slaughter_date, carcass_weight, classification, document_source")
          .order("slaughter_date", { ascending: false }).limit(50),
      ]);
      setAnimals(ar.data ?? []);
      setSlaughterhouses(sr.data ?? []);
      setRecords(rr.data ?? []);
      setLoading(false);
    })();
  }, []);

  const animalMap = useMemo(() => new Map(animals.map(a => [a.id, a.internal_code ?? a.id])), [animals]);
  const frigMap   = useMemo(() => new Map(slaughterhouses.map(s => [s.id, s.name ?? s.id])), [slaughterhouses]);

  const rendimentoLive = pesoVivo && pesoCarcaca
    ? ((Number(pesoCarcaca) / Number(pesoVivo)) * 100).toFixed(1)
    : null;

  const kpis = useMemo(() => {
    const total    = records.length;
    const withW    = records.filter(r => r.carcass_weight);
    const avgCarcaca = withW.length > 0
      ? Math.round(withW.reduce((s, r) => s + Number(r.carcass_weight), 0) / withW.length)
      : 0;
    const frigCount: Record<string, number> = {};
    records.forEach(r => { if (r.slaughterhouse_id) frigCount[r.slaughterhouse_id] = (frigCount[r.slaughterhouse_id] ?? 0) + 1; });
    const topFrigId = Object.entries(frigCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { total, avgCarcaca, topFrig: topFrigId ? frigMap.get(topFrigId) ?? "—" : "—" };
  }, [records, frigMap]);

  const frigBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalCarcaca: number; withW: number }> = {};
    records.forEach(r => {
      const id = r.slaughterhouse_id ?? "__sem__";
      if (!map[id]) map[id] = { count: 0, totalCarcaca: 0, withW: 0 };
      map[id].count++;
      if (r.carcass_weight) { map[id].totalCarcaca += Number(r.carcass_weight); map[id].withW++; }
    });
    return Object.entries(map).map(([id, v]) => ({
      nome: id === "__sem__" ? "Sem frigorífico" : frigMap.get(id) ?? id,
      count: v.count,
      avgCarcaca: v.withW > 0 ? Math.round(v.totalCarcaca / v.withW) : null,
    })).sort((a, b) => b.count - a.count);
  }, [records, frigMap]);

  function handleParsed(data: ParsedDoc) {
    setParsedDoc(data);
    setGateMode("verified");
    // Sugere frigorífico pelo nome do emitente
    // (o usuário confirma pelo select — só hint, não lock automático)
    const emitenteNome = data.header.emitente_nome.toLowerCase();
    const match = slaughterhouses.find(s => s.name && s.name.toLowerCase().includes(emitenteNome.slice(0, 8)));
    if (match) setFrigorificoId(match.id);
    // Tenta extrair peso de carcaça do primeiro item da nota (se for em kg)
    if (data.items.length > 0) {
      const item = data.items[0];
      if (item.unidade.toLowerCase().includes("kg") || item.unidade.toLowerCase() === "kg") {
        setPesoCarcaca(String(item.quantidade));
      }
    }
  }

  function handleManual() {
    setParsedDoc(null);
    setGateMode("manual");
  }

  function handleReset() {
    setParsedDoc(null);
    setGateMode("idle");
    setPesoCarcaca("");
    setFrigorificoId("");
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

    let documentSource: string | null = null;
    if (gateMode === "verified" && parsedDoc) {
      documentSource = `nfe:${parsedDoc.header.numero_nota}`;
    }

    const { error: err } = await supabase.from("slaughter_records").insert({
      animal_id:         animalId || null,
      slaughterhouse_id: frigorificoId || null,
      slaughter_date:    slaughterDate || null,
      carcass_weight:    pesoCarcaca ? Number(pesoCarcaca) : null,
      classification:    classification || null,
      document_source:   documentSource,
    });

    if (err) { setError(err.message); setSubmitting(false); return; }
    setSuccess("Abate registrado com sucesso.");
    const { data: newR } = await supabase.from("slaughter_records")
      .select("id, animal_id, slaughterhouse_id, slaughter_date, carcass_weight, classification, document_source")
      .order("slaughter_date", { ascending: false }).limit(50);
    setRecords(newR ?? []);
    setAnimalId(""); setPesoVivo(""); setClassification("");
    setSlaughterDate(new Date().toISOString().slice(0, 10));
    handleReset();
    setSubmitting(false);
  }

  return (
    <main className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.12)_0%,rgba(122,168,76,0)_70%)]" />
            <span className="ag-badge ag-badge-green">Rastreabilidade</span>
            <h1 className="ag-page-title">Registro de Abates</h1>
            <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[var(--text-secondary)]">
              Registre abates com peso de carcaça e frigorífico. Importe a NF-e ou laudo para rastreabilidade completa.
            </p>
          </div>
          <div className="ag-hero-panel">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" />Carregando…</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Total abates", value: kpis.total,               sub: "registrados",      icon: Beef,     bg: "bg-[var(--primary-soft)]", cl: "text-[var(--primary)]" },
                  { label: "Peso médio",   value: kpis.avgCarcaca > 0 ? `${kpis.avgCarcaca} kg` : "—", sub: "carcaça média", icon: Weight, bg: "bg-blue-50", cl: "text-blue-600" },
                  { label: "Frigorífico",  value: kpis.topFrig,             sub: "mais utilizado",   icon: Building2, bg: "bg-amber-50", cl: "text-amber-600" },
                ].map(k => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="ag-kpi-card">
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${k.bg}`}>
                        <Icon size={17} className={k.cl} />
                      </div>
                      <p className="mt-3 ag-kpi-label">{k.label}</p>
                      <p className={`font-bold leading-tight mt-1 ${String(k.value).length > 10 ? "text-sm break-words" : "ag-kpi-value"}`}>{k.value}</p>
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
        <h2 className="ag-section-title">Registrar abate</h2>

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

            {/* Frigorífico — hint do emitente quando verified */}
            <div>
              <label className={labelCls}>
                Frigorífico *
                {gateMode === "verified" && parsedDoc?.header.emitente_nome && (
                  <span className="ml-1 text-[10px] normal-case tracking-normal text-emerald-600">
                    (emitente: {parsedDoc.header.emitente_nome})
                  </span>
                )}
              </label>
              <select value={frigorificoId} onChange={e => setFrigorificoId(e.target.value)} className={inputCls} required>
                <option value="">Selecione um frigorífico</option>
                {slaughterhouses.map(s => <option key={s.id} value={s.id}>{s.name ?? s.id}</option>)}
              </select>
            </div>

            {/* Data */}
            <div>
              <label className={labelCls}>Data do abate *</label>
              <input type="date" value={slaughterDate} onChange={e => setSlaughterDate(e.target.value)} className={inputCls} required />
            </div>

            {/* Peso vivo — sempre editável */}
            <div>
              <label className={labelCls}>
                Peso vivo (kg)
                {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
              </label>
              <input type="number" step="0.1" min="0" value={pesoVivo} onChange={e => setPesoVivo(e.target.value)} placeholder="Ex: 500" className={inputCls} />
            </div>

            {/* Peso carcaça — bloqueado se veio do documento (item kg) */}
            {gateMode === "verified" && pesoCarcaca && parsedDoc?.items[0]?.unidade?.toLowerCase().includes("kg") ? (
              <LockedField
                label="Peso carcaça (kg)"
                value={`${Number(pesoCarcaca).toLocaleString("pt-BR")} kg`}
              />
            ) : (
              <div>
                <label className={labelCls}>
                  Peso carcaça (kg)
                  {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
                </label>
                <input type="number" step="0.1" min="0" value={pesoCarcaca} onChange={e => setPesoCarcaca(e.target.value)} placeholder="Ex: 280" className={inputCls} />
              </div>
            )}

            {/* Classificação */}
            <div>
              <label className={labelCls}>
                Classificação
                {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
              </label>
              <input type="text" value={classification} onChange={e => setClassification(e.target.value)} placeholder="Ex: A, B, Precoce" className={inputCls} />
            </div>

            {/* Rendimento calculado */}
            {rendimentoLive && (
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="flex items-center gap-3 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary)]/20 px-4 py-3">
                  <Percent size={16} className="text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--primary)]">
                    Rendimento calculado: {rendimentoLive}%
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    ({pesoCarcaca} kg ÷ {pesoVivo} kg × 100)
                  </span>
                </div>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-4 pt-2">
              <button type="submit" disabled={submitting}
                className="ag-button-primary flex items-center gap-2 disabled:opacity-60">
                {submitting ? <><Loader2 size={14} className="animate-spin" />Registrando…</> : "Registrar abate"}
              </button>
              {success && <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle size={14} />{success}</div>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </DocumentGate>
      </section>

      {/* ── Breakdown por frigorífico ─────────────────────────────────────── */}
      {frigBreakdown.length > 0 && (
        <section className="ag-card-strong p-8 space-y-5">
          <h2 className="ag-section-title">Por frigorífico</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {frigBreakdown.map(f => (
              <div key={f.nome} className="ag-kpi-card">
                <p className="font-semibold text-[var(--text-primary)] truncate">{f.nome}</p>
                <p className="mt-2 text-2xl font-bold text-[var(--primary)] tracking-tight">{f.count}</p>
                <p className="ag-kpi-label">abates</p>
                {f.avgCarcaca && <p className="mt-1 text-xs text-[var(--text-muted)]">Carcaça média: {f.avgCarcaca} kg</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Histórico ────────────────────────────────────────────────────── */}
      <section className="ag-card-strong p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="ag-section-title">Histórico de abates</h2>
          <span className="ag-badge">{records.length} registros</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" />Carregando…</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">Nenhum abate registrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ag-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Data</th>
                  <th className="text-left">Animal</th>
                  <th className="text-left">Frigorífico</th>
                  <th className="text-right">Carcaça (kg)</th>
                  <th className="text-center">Classificação</th>
                  <th className="text-center">Rastreabilidade</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td className="tabular-nums text-[var(--text-secondary)]">
                      {r.slaughter_date ? new Date(r.slaughter_date).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="font-medium">{r.animal_id ? (animalMap.get(r.animal_id) ?? r.animal_id) : "—"}</td>
                    <td className="text-[var(--text-secondary)]">{r.slaughterhouse_id ? (frigMap.get(r.slaughterhouse_id) ?? r.slaughterhouse_id) : "—"}</td>
                    <td className="text-right tabular-nums font-medium">
                      {r.carcass_weight != null ? Number(r.carcass_weight).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="text-center">
                      {r.classification ? <span className="ag-badge">{r.classification}</span> : "—"}
                    </td>
                    <td className="text-center">
                      {r.document_source ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                          ✓ {r.document_source.startsWith("nfe:") ? `NF-e ${r.document_source.split(":")[1]}` : r.document_source}
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
