"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

export default function HerdPdfButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/export/herd-pdf", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-rebanho-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao gerar relatório PDF.");
    }
    setLoading(false);
  }

  return (
    <button onClick={handleExport} disabled={loading}
      className="ag-button-secondary flex items-center gap-2 disabled:opacity-60">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
      {loading ? "Gerando PDF..." : "Exportar PDF do Rebanho"}
    </button>
  );
}
