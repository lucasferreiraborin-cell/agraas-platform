"use client";

import { useEffect, useState, useCallback } from "react";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";

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

const RISK_META = {
  low:    { label: "Low Risk",    bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400" },
  medium: { label: "Medium Risk", bg: "bg-amber-500/15",   border: "border-amber-500/30",   text: "text-amber-300",   dot: "bg-amber-400"   },
  high:   { label: "High Risk",   bg: "bg-red-500/15",     border: "border-red-500/30",     text: "text-red-300",     dot: "bg-red-400"     },
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
      // silently ignore — show generate button
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  useEffect(() => { fetchCache(); }, [fetchCache]);

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
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setGenerating(false);
    }
  }

  const meta = prediction ? RISK_META[prediction.risk_level] : null;

  return (
    <section className="ag-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <h3 className="ag-section-title mb-0">AI Predictive Analysis</h3>
        </div>
        {prediction && (
          <button
            onClick={() => generate(true)}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating
              ? <><Loader2 size={11} className="animate-spin" />Analyzing…</>
              : <><RefreshCw size={11} />Refresh</>
            }
          </button>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Loader2 size={14} className="animate-spin" />
          Loading analysis…
        </div>
      )}

      {!loading && !prediction && !generating && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/50">
            No AI analysis yet. Generate one to get risk alerts and recommendations based on this animal&apos;s full history.
          </p>
          <button
            onClick={() => generate(false)}
            className="flex w-fit items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/25 hover:border-violet-500/60"
          >
            <Brain size={14} />
            Generate AI Analysis
          </button>
        </div>
      )}

      {!loading && generating && !prediction && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 size={14} className="animate-spin text-violet-400" />
          Claude is analyzing this animal's history…
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {prediction && meta && (
        <>
          {/* Risk badge + score */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.border} ${meta.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              <TrendingUp size={11} />
              Score in 30d: <strong className="text-white ml-1">{prediction.predicted_score_30d}</strong>
            </span>
          </div>

          {/* Alerts */}
          {prediction.alerts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Alerts</p>
              {prediction.alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-sm text-amber-200">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                  {alert}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {prediction.recommendations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Recommendations</p>
              {prediction.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-200">
                  <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                  {rec}
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-[10px] text-white/30">
            Generated {new Date(prediction.created_at).toLocaleString("pt-BR")} · valid 24h
          </p>
        </>
      )}
    </section>
  );
}
