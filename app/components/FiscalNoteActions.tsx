"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

type NoteItem = {
  id: string;
  descricao: string | null;
  ncm: string | null;
  unidade: string | null;
  valor_total: number | null;
  quantidade: number | null;
};

type Props = { noteId: string; status: string; items: NoteItem[] };

function ncmToCategory(ncm: string | null): string {
  const prefix = (ncm ?? "").slice(0, 4);
  if (["3002","3004","3808","3006"].includes(prefix)) return "Sanitários";
  if (["2309","2302","2301","1209","1001","1005"].includes(prefix)) return "Nutricionais";
  if (prefix >= "8432" && prefix <= "8436") return "Equipamentos";
  if (["3101","3102","3103","3104","3105"].includes(prefix)) return "Fertilizantes";
  return "Outros";
}

export default function FiscalNoteActions({ noteId, status, items }: Props) {
  const [analyzing, setAnalyzing]         = useState(false);
  const [applying, setApplying]           = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [aiResult, setAiResult]           = useState<string | null>(null);
  const [error, setError]                 = useState("");
  const [showDeleteModal, setShowDelete]  = useState(false);
  const [showPreview, setShowPreview]     = useState(false);
  const router = useRouter();

  async function handleAnalyze() {
    setAnalyzing(true); setError(""); setAiResult(null);
    try {
      const res  = await fetch("/api/fiscal/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note_id: noteId }) });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setAiResult(json.resumo ?? `Risco geral: ${json.overall_risk}. ${json.suggestions?.join(" ") ?? ""}`);
      router.refresh();
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleApply() {
    setApplying(true); setError(""); setShowPreview(false);
    try {
      const res  = await fetch("/api/fiscal/apply-stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note_id: noteId }) });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      router.refresh();
    } finally {
      setApplying(false);
    }
  }

  async function handleDelete() {
    setDeleting(true); setError("");
    try {
      const res  = await fetch("/api/fiscal/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note_id: noteId }) });
      const json = await res.json();
      if (json.error) { setError(json.error); setDeleting(false); setShowDelete(false); return; }
      router.push("/fiscal");
    } catch {
      setError("Erro ao excluir nota."); setDeleting(false);
    }
  }

  const isValidada = status === "validada";

  return (
    <>
      {/* ── Botões de ação ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleAnalyze} disabled={analyzing} className="ag-button-secondary flex items-center gap-2 disabled:opacity-60">
            {analyzing ? <><Loader2 size={14} className="animate-spin" />Analisando…</> : "Analisar com IA"}
          </button>
          <button
            onClick={() => isValidada ? undefined : setShowPreview(true)}
            disabled={isValidada || applying}
            className="ag-button-primary flex items-center gap-2 disabled:opacity-60"
          >
            {applying
              ? <><Loader2 size={14} className="animate-spin" />Aplicando…</>
              : isValidada
                ? <><CheckCircle size={14} />Aplicado</>
                : "Aplicar ao estoque"}
          </button>
        </div>

        <button
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition w-fit"
        >
          <Trash2 size={13} />
          Excluir nota
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {aiResult && (
          <div className="rounded-xl border border-[var(--border)] bg-white/80 px-4 py-3 text-xs text-[var(--text-secondary)] max-w-xs">
            <span className="font-semibold text-[var(--text-primary)]">IA Fiscal: </span>{aiResult}
          </div>
        )}
      </div>

      {/* ── Modal: Preview de estoque ──────────────────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPreview(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Preview — Aplicar ao estoque</h3>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">Os produtos abaixo serão adicionados ao módulo de insumos</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="rounded-lg p-1.5 hover:bg-[var(--surface-soft)] text-[var(--text-muted)]">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-4">
              {items.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  <AlertTriangle size={15} />
                  Esta nota não possui itens registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="ag-table w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Produto</th>
                        <th className="text-left">NCM</th>
                        <th className="text-left">Categoria</th>
                        <th className="text-right">Qtd</th>
                        <th className="text-right">Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(it => (
                        <tr key={it.id}>
                          <td className="max-w-[200px] truncate">{it.descricao ?? "—"}</td>
                          <td className="font-mono text-xs text-[var(--text-muted)]">{it.ncm ?? "—"}</td>
                          <td>
                            <span className="ag-badge">{ncmToCategory(it.ncm)}</span>
                          </td>
                          <td className="text-right tabular-nums">{Number(it.quantidade ?? 0).toLocaleString("pt-BR")} {it.unidade ?? ""}</td>
                          <td className="text-right tabular-nums font-medium">
                            R${Number(it.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
              <button onClick={() => setShowPreview(false)} className="ag-button-secondary">Cancelar</button>
              <button onClick={handleApply} disabled={applying} className="ag-button-primary flex items-center gap-2 disabled:opacity-60">
                {applying ? <><Loader2 size={14} className="animate-spin" />Aplicando…</> : "Confirmar aplicação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar exclusão ──────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-2 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Excluir nota fiscal</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Tem certeza? Esta ação não pode ser desfeita. A nota, seus itens e todos os alertas serão removidos permanentemente.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button onClick={() => setShowDelete(false)} className="ag-button-secondary" disabled={deleting}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60">
                {deleting ? <><Loader2 size={14} className="animate-spin" />Excluindo…</> : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
