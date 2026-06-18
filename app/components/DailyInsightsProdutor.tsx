"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";

type InsightBullet = {
  headline: string;
  reasoning: string;
  source_signal_ids?: string[];
  metric_used?: string;
  recommended_action?: string;
};

type ApiResponse = {
  bullets: InsightBullet[];
  generated_at?: string;
  cached?: boolean;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — endpoint já tem cache diário no banco

export default function DailyInsightsProdutor() {
  const [bullets, setBullets] = useState<InsightBullet[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = "daily-insights:produtor";
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const { ts, data } = JSON.parse(raw) as { ts: number; data: ApiResponse };
        if (Date.now() - ts < CACHE_TTL_MS) {
          setBullets(data.bullets ?? []);
          setGeneratedAt(data.generated_at ?? null);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* cache corrompido — ignora */
    }

    const ctrl = new AbortController();
    fetch("/api/insights/produtor", { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? `Erro ${r.status}`);
        }
        return (await r.json()) as ApiResponse;
      })
      .then((data) => {
        setBullets(data.bullets ?? []);
        setGeneratedAt(data.generated_at ?? null);
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ ts: Date.now(), data }),
          );
        } catch {
          /* storage cheio — ignora */
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message ?? "Indisponível");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, []);

  // Não renderiza se não houver bullets — silêncio é melhor que placebo.
  if (!loading && (error || !bullets || bullets.length === 0)) return null;

  const generatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : null;

  return (
    <section className="ag-card-strong overflow-hidden p-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
            <Sparkles size={18} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="ag-section-title">Leitura do dia</h2>
            <p className="ag-section-subtitle">
              Cruzamento de sinais de mercado e métricas do seu rebanho — produzido pela inteligência Agraas.
            </p>
          </div>
        </div>
        {generatedLabel && (
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Atualizado · {generatedLabel}
          </span>
        )}
      </div>

      {loading ? (
        <DailyInsightsSkeleton />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bullets!.slice(0, 6).map((b, i) => (
            <BulletCard key={i} bullet={b} index={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

function BulletCard({ bullet, index }: { bullet: InsightBullet; index: number }) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-[var(--border)] bg-white p-5 transition hover:border-[rgba(46,139,62,0.32)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary-hover)]">
          {index}
        </span>
        {bullet.metric_used && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {bullet.metric_used}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)]">
        {bullet.headline}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">
        {bullet.reasoning}
      </p>
      {bullet.recommended_action && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[var(--primary-soft)] bg-[var(--primary-soft)]/40 px-3 py-2.5">
          <ArrowUpRight
            size={14}
            className="mt-0.5 flex-shrink-0 text-[var(--primary-hover)]"
          />
          <p className="text-[13px] leading-5 text-[var(--primary-hover)]">
            {bullet.recommended_action}
          </p>
        </div>
      )}
    </article>
  );
}

function DailyInsightsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-white p-5"
        >
          <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--border)]" />
          <div className="mt-4 h-4 w-4/5 animate-pulse rounded-full bg-[var(--border)]" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--border)]" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--border)]" />
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-[var(--border)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
