"use client";

import { useState } from "react";

type Analise = {
  recomendacao: "Vender agora" | "Aguardar" | "Melhorar sanitário";
  prazo_dias: number | null;
  justificativa: string;
  risco: "baixo" | "médio" | "alto";
  ponto_forte: string;
  ponto_atencao: string;
};

type Meta = {
  score: number;
  lastWeight: number | null;
  arrobas: number | null;
  valorEstimado: number | null;
  cotacao: number;
  gmd: number | null;
};

const CORES: Record<Analise["recomendacao"], { bg: string; border: string; badge: string; icon: string }> = {
  "Vender agora": {
    bg: "bg-[rgba(93,156,68,0.07)]",
    border: "border-[rgba(93,156,68,0.30)]",
    badge: "bg-[var(--primary-soft)] text-[var(--primary-hover)]",
    icon: "💰",
  },
  "Aguardar": {
    bg: "bg-[rgba(217,163,67,0.07)]",
    border: "border-[rgba(217,163,67,0.30)]",
    badge: "bg-[rgba(217,163,67,0.14)] text-[var(--warning)]",
    icon: "⏳",
  },
  "Melhorar sanitário": {
    bg: "bg-[rgba(214,69,69,0.06)]",
    border: "border-[rgba(214,69,69,0.22)]",
    badge: "bg-[rgba(214,69,69,0.10)] text-[var(--danger)]",
    icon: "💉",
  },
};

const RISCO_COLOR: Record<Analise["risco"], string> = {
  baixo: "text-[var(--primary-hover)]",
  médio: "text-[var(--warning)]",
  alto: "text-[var(--danger)]",
};

export default function AnimalAnalysis({ animalId }: { animalId: string }) {
  const [loading, setLoading] = useState(false);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState("");

  async function analisar() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze-animal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId }),
      });
      const data = await res.json();
      if (!data.ok) { setError("Análise indisponível. Tente novamente."); setLoading(false); return; }
      setAnalise(data.analise as Analise);
      setMeta(data.meta as Meta);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  const cores = analise ? CORES[analise.recomendacao] : null;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Recomendação de manejo
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Sugestão de venda por IA
          </h3>
        </div>
        <button
          type="button"
          onClick={analisar}
          disabled={loading}
          className="shrink-0 rounded-2xl bg-[var(--primary-hover)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3B6B2E] disabled:opacity-60"
        >
          {loading ? "Analisando..." : analise ? "Reanalisar" : "Analisar agora"}
        </button>
      </div>

      {!analise && !loading && !error && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Clique em "Analisar agora" para receber uma recomendação baseada no score, peso, GMD, carências ativas e cotação atual do boi gordo.
        </p>
      )}

      {loading && (
        <div className="mt-5 space-y-3 animate-pulse">
          <div className="h-4 w-40 rounded-full bg-black/8" />
          <div className="h-3 w-full rounded-full bg-black/6" />
          <div className="h-3 w-4/5 rounded-full bg-black/6" />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {analise && cores && meta && (
        <div className={`mt-5 rounded-2xl border ${cores.border} ${cores.bg} p-5`}>
          {/* Cabeçalho da recomendação */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${cores.badge}`}>
              {cores.icon} {analise.recomendacao}
            </span>
            {analise.prazo_dias && (
              <span className="text-sm text-[var(--text-muted)]">em ~{analise.prazo_dias} dias</span>
            )}
            <span className={`ml-auto text-xs font-semibold uppercase tracking-[0.14em] ${RISCO_COLOR[analise.risco]}`}>
              risco {analise.risco}
            </span>
          </div>

          {/* Justificativa */}
          <p className="mt-4 text-sm leading-6 text-[var(--text-primary)]">{analise.justificativa}</p>

          {/* Pontos */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-hover)]">✓ Ponto forte</p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{analise.ponto_forte}</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--warning)]">⚠ Atenção</p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{analise.ponto_atencao}</p>
            </div>
          </div>

          {/* Métricas usadas na análise */}
          <div className="mt-4 flex flex-wrap gap-3 border-t border-black/6 pt-4">
            {meta.lastWeight && <Chip label="Peso" value={`${meta.lastWeight} kg`} />}
            {meta.arrobas && <Chip label="Arrobas" value={`${meta.arrobas.toFixed(1)} @`} />}
            {meta.valorEstimado && <Chip label="Valor" value={`R$ ${Math.round(meta.valorEstimado).toLocaleString("pt-BR")}`} />}
            {meta.gmd !== null && <Chip label="GMD" value={`${meta.gmd.toFixed(3)} kg/d`} />}
            <Chip label="Score" value={String(meta.score)} />
            <Chip label="Cotação" value={`R$ ${meta.cotacao.toFixed(2)}/@`} />
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-1.5 text-xs">
      <span className="text-[var(--text-muted)]">{label}: </span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
