"use client";

/**
 * Botões de ação para revisão de NF-e: Aprovar / Rejeitar.
 * Client component — chama API route para mudar status.
 */

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotaReviewActions({
  notaId,
  currentStatus,
}: {
  notaId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isReviewed = currentStatus === "reviewed";
  const isRejected = currentStatus === "rejected";
  const isDone = isReviewed || isRejected;

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      const res = await fetch(`/api/controladoria/notas/${notaId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error("Erro ao aprovar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (!reason.trim()) {
      setError("Informe o motivo da rejeição.");
      return;
    }
    setLoading("reject");
    setError(null);
    try {
      const res = await fetch(`/api/controladoria/notas/${notaId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      if (!res.ok) throw new Error("Erro ao rejeitar");
      setShowRejectInput(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(null);
    }
  }

  if (isDone) {
    return (
      <div className="flex items-center gap-2">
        {isReviewed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle size={13} /> Aprovada
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            <XCircle size={13} /> Rejeitada
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleReject}
          disabled={loading !== null}
          className="ag-button-secondary inline-flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
        >
          {loading === "reject" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <XCircle size={14} />
          )}
          {showRejectInput ? "Confirmar rejeição" : "Rejeitar"}
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={loading !== null}
          className="ag-button-primary inline-flex items-center gap-1.5"
        >
          {loading === "approve" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
          Aprovar revisão
        </button>
      </div>

      {showRejectInput && (
        <div className="flex items-center gap-2 w-full max-w-sm">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da rejeição..."
            className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => { setShowRejectInput(false); setReason(""); }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
