"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

type Prediction = {
  id: string;
  risk_level: "low" | "medium" | "high";
  alerts: string[];
  recommendations: string[];
  predicted_score_30d: number;
  created_at: string;
};

interface Props {
  animalId: string;
}

// Tokens semânticos do design system (claro), consistente com o resto
// da plataforma. Cor escolhida por intenção, não estética.
const RISK_META: Record<
  Prediction["risk_level"],
  { label: string; cls: string; dot: string }
> = {
  low: {
    label: "Risco baixo",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Risco médio",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  high: {
    label: "Risco alto",
    cls: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

export default function PredictiveAlerts({ animalId }: Props) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCache = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/predict-score?animalId=${animalId}`);
      const json = await res.json();
      if (json.cached && json.prediction) {
        setPrediction(json.prediction);
      }
    } catch {
      // silencioso — botão de gerar fica disponível
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    fetchCache();
  }, [fetchCache]);

  async function generate(force = false) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/predict-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId, force }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.prediction) setPrediction(json.prediction);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setGenerating(false);
    }
  }

  const meta = prediction ? RISK_META[prediction.risk_level] : null;

  return (
    <section className="ag-card p-6 lg:p-8">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <Brain size={18} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="ag-section-title">Análise Preditiva IA</h2>
            <p className="ag-section-subtitle">
              Risco e recomendações com base no histórico completo do animal.
            </p>
          </div>
        </div>

        {prediction && (
          <button
            onClick={() => generate(true)}
            disabled={generating}
            className="ag-button-secondary inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analisando…
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Recalcular
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Loading state ─────────────────────────────────────── */}
      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" />
          Carregando análise…
        </div>
      )}

      {/* ── Empty state (sem análise) ─────────────────────────── */}
      {!loading && !prediction && !generating && (
        <div className="mt-6 flex flex-col items-start gap-4">
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Nenhuma análise gerada ainda. Gere uma análise preditiva pra
            receber alertas de risco e recomendações com base no histórico
            completo deste animal.
          </p>
          <button
            onClick={() => generate(false)}
            className="ag-button-primary inline-flex items-center gap-2 text-sm"
          >
            <Brain size={14} />
            Gerar análise preditiva
          </button>
        </div>
      )}

      {/* ── Generating in-progress (sem cache prévio) ─────────── */}
      {!loading && generating && !prediction && (
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2
            size={14}
            className="animate-spin text-[var(--primary)]"
          />
          Analisando histórico do animal…
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────── */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Resultado da análise ──────────────────────────────── */}
      {prediction && meta && (
        <div className="mt-6 space-y-5">
          {/* Risk badge + score previsto */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${meta.cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              <TrendingUp size={12} className="text-[var(--primary)]" />
              Score previsto em 30 dias:
              <strong className="ml-1 tabular-nums text-[var(--text-primary)]">
                {prediction.predicted_score_30d}
              </strong>
            </span>
          </div>

          {/* Alertas */}
          {prediction.alerts.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Alertas
              </p>
              <ul className="space-y-2">
                {prediction.alerts.map((alert, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
                  >
                    <AlertTriangle
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendações */}
          {prediction.recommendations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Recomendações
              </p>
              <ul className="space-y-2">
                {prediction.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
                  >
                    <CheckCircle
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer com timestamp */}
          <p className="text-xs text-[var(--text-muted)]">
            Gerado em{" "}
            {new Date(prediction.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · válido por 24h
          </p>
        </div>
      )}
    </section>
  );
}
