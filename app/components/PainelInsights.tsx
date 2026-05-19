"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

type Stats = {
  totalAnimals: number;
  totalScoreAverage: number;
  totalArrobas: number;
  totalProperties: number;
  withdrawals7d: number;
  noPesagem30d: number;
  shipmentsStale: number;
  lotsUpcoming: number;
  totalActiveAlerts: number;
  expiredCertsCount: number;
  estimatedValue: string;
  topAnimal: { code: string; score: number } | null;
  isFsjbePilot: boolean;
};

type Insights = {
  destaque: string;
  risco: string;
  acao: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30min — insights são caros, não precisam recalcular a cada refresh

export default function PainelInsights(props: Stats) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `painel-insights:${JSON.stringify(props)}`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const { ts, data } = JSON.parse(raw) as { ts: number; data: Insights };
        if (Date.now() - ts < CACHE_TTL_MS) {
          setInsights(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* cache corrompido — ignora */
    }

    const ctrl = new AbortController();
    fetch("/api/painel-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(props),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? `Erro ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (data.ok && data.insights) {
          setInsights(data.insights);
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ ts: Date.now(), data: data.insights }),
            );
          } catch {
            /* storage cheio — ignora */
          }
        } else {
          throw new Error("Resposta inválida");
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message ?? "Insights indisponíveis");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [props]);

  return (
    <section className="ag-card-strong overflow-hidden p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
            <Sparkles size={18} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="ag-section-title">Insights Agraas</h2>
            <p className="ag-section-subtitle">
              Leitura executiva do estado do rebanho · gerada por IA sobre os dados atuais.
            </p>
          </div>
        </div>
      </div>

      {loading && <InsightsSkeleton />}
      {error && !loading && (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
          Insights indisponíveis no momento. Os dados do painel continuam atualizados normalmente.
        </div>
      )}
      {insights && !loading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard
            icon={TrendingUp}
            tone="positive"
            label="Destaque"
            body={insights.destaque}
          />
          <InsightCard
            icon={AlertTriangle}
            tone="warning"
            label="Risco operacional"
            body={insights.risco}
          />
          <InsightCard
            icon={ArrowRight}
            tone="action"
            label="Ação sugerida"
            body={insights.acao}
          />
        </div>
      )}
    </section>
  );
}

function InsightsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
        >
          <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--border)]" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--border)]" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--border)]" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--border)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightCard({
  icon: Icon,
  tone,
  label,
  body,
}: {
  icon: typeof TrendingUp;
  tone: "positive" | "warning" | "action";
  label: string;
  body: string;
}) {
  const tones = {
    positive: {
      border: "border-emerald-200",
      bg: "bg-emerald-50/60",
      iconBg: "bg-emerald-100",
      iconCl: "text-emerald-700",
      labelCl: "text-emerald-800",
    },
    warning: {
      border: "border-amber-200",
      bg: "bg-amber-50/60",
      iconBg: "bg-amber-100",
      iconCl: "text-amber-700",
      labelCl: "text-amber-800",
    },
    action: {
      border: "border-[var(--border)]",
      bg: "bg-[var(--surface-soft)]",
      iconBg: "bg-[var(--primary-soft)]",
      iconCl: "text-[var(--primary)]",
      labelCl: "text-[var(--text-primary)]",
    },
  }[tone];

  return (
    <div className={`rounded-3xl border ${tones.border} ${tones.bg} p-5`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${tones.iconBg}`}>
          <Icon size={14} className={tones.iconCl} />
        </span>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${tones.labelCl}`}>
          {label}
        </p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{body}</p>
    </div>
  );
}
