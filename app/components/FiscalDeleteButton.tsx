"use client";

/**
 * Botão de excluir nota na lista /fiscal.
 *
 * Antes de 14/09/2026: invisível até o hover (não existe hover no toque) e
 * ignorava a resposta da API — "sucesso" mesmo quando nada era apagado.
 * Agora: sempre visível, lê a resposta e mostra o erro na própria linha.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function FiscalDeleteButton({ noteId, numero }: { noteId: string; numero?: string }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    if (!confirm(`Excluir a nota ${numero ?? ""}? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/fiscal/delete", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ note_id: noteId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setErro(json.error ?? `Falha ao excluir (HTTP ${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {erro && <span className="text-[11px] text-red-700 max-w-[220px] truncate" title={erro}>{erro}</span>}
      <button
        onClick={handleClick}
        disabled={loading}
        title="Excluir nota"
        aria-label={`Excluir nota ${numero ?? ""}`}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        Excluir
      </button>
    </span>
  );
}
