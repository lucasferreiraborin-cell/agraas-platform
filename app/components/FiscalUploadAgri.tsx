"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

type Farm = { id: string; name: string };

export default function FiscalUploadAgri({ farms }: { farms: Farm[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [farmId,  setFarmId]  = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    const form = new FormData();
    form.append("xml", file);
    if (farmId) form.append("farm_id", farmId);
    try {
      const res  = await fetch("/api/agriculture/fiscal/parse-xml", { method: "POST", body: form });
      const json = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Nota ${json.numero_nota || "importada"} · ${json.total_items} item(ns) · status: ${json.status}` });
      } else {
        setResult({ ok: false, msg: json.error ?? "Erro ao importar" });
      }
    } catch {
      setResult({ ok: false, msg: "Erro de conexão" });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 space-y-4">
      <div>
        <p className="font-semibold text-[var(--text-primary)]">Importar NF-e agrícola</p>
        <p className="text-sm text-[var(--text-muted)]">Arquivos .xml ou .pdf aceitos</p>
      </div>

      {farms.length > 0 && (
        <select value={farmId} onChange={e => setFarmId(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm bg-white text-[var(--text-primary)]">
          <option value="">Selecionar fazenda (opcional)</option>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      )}

      <label className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed px-5 py-4 transition ${loading ? "opacity-60 pointer-events-none" : "border-[var(--primary)]/30 hover:border-[var(--primary)]/60 hover:bg-[var(--primary-soft)]"}`}>
        {loading ? <Loader2 size={18} className="animate-spin text-[var(--primary)]" /> : <Upload size={18} className="text-[var(--primary)]" />}
        <span className="text-sm font-medium text-[var(--primary-hover)]">
          {loading ? "Importando…" : "Clique para selecionar arquivo"}
        </span>
        <input ref={inputRef} type="file" accept=".xml,.pdf" className="hidden" onChange={handleFile} disabled={loading} />
      </label>

      {result && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}
