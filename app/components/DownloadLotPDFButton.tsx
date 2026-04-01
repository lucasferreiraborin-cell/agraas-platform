"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface Props {
  lotId: string;
  lotName: string;
}

/**
 * Chama POST /api/export/lot-pdf, recebe o blob e dispara download automático.
 * Exibe spinner durante a geração.
 */
export default function DownloadLotPDFButton({ lotId, lotName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/export/lot-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `lot-certificate-${lotName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          loading
            ? "border-white/15 bg-white/5 text-white/40 cursor-not-allowed"
            : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/60"
        }`}
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" />Generating PDF…</>
          : <><FileDown size={14} />Download Certificate PDF</>
        }
      </button>
      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
}
