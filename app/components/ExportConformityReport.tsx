"use client";

import { useState } from "react";

type AnimalStatus = { id: string; nome: string; sex: string | null; breed: string; score: number; peso: string; status: "apto" | "inapto" | "pendencias"; pendencias: string[]; certs: string[] };
type Relatorio = { parecer_geral_pt: string; parecer_geral_en: string; recomendacao_pt: string; recomendacao_en: string; documentos_necessarios: string[]; prazo_regularizacao: string; nivel_risco: "Baixo" | "Médio" | "Alto" };
type Resumo = { aptos: number; inaptos: number; pendencias: number; conformidadePct: number; total: number };

const RISCO_COLOR = { Baixo: "text-emerald-600 bg-emerald-50 border-emerald-200", Médio: "text-amber-600 bg-amber-50 border-amber-200", Alto: "text-red-600 bg-red-50 border-red-200" };
const STATUS_CONFIG = {
  apto:      { label: "Apto ✓",       bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400" },
  pendencias:{ label: "Pendências ⚠", bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-400" },
  inapto:    { label: "Inapto ✗",     bg: "bg-red-50",      border: "border-red-200",     text: "text-red-700",     dot: "bg-red-400" },
};

export default function ExportConformityReport({ lotId, lotName }: { lotId: string; lotName: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ relatorio: Relatorio; resumo: Resumo; animais: AnimalStatus[]; gerado_em: string; lote: any } | null>(null);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<"pt" | "en">("pt");

  async function gerar() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotId }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "Erro ao gerar relatório"); setLoading(false); return; }
      setData(json);
    } catch { setError("Erro de conexão. Tente novamente."); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Relatório de Conformidade</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Análise por IA — PT / EN</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-0.5">
              {(["pt","en"] as const).map(l => (
                <button key={l} type="button" onClick={() => setLang(l)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${lang === l ? "bg-white shadow text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                  {l === "pt" ? "🇧🇷 PT" : "🇬🇧 EN"}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={gerar} disabled={loading}
            className="rounded-2xl bg-[#1a1a2e] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16213e] disabled:opacity-60">
            {loading ? "Gerando..." : data ? "Regenerar" : "Gerar Relatório"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-[var(--surface-soft)]" />)}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="space-y-5">
          {/* Resumo numérico */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ConformidadeKPI label={lang === "pt" ? "Conformidade" : "Compliance"} value={`${data.resumo.conformidadePct}%`} color="emerald" big />
            <ConformidadeKPI label={lang === "pt" ? "Aptos" : "Eligible"} value={String(data.resumo.aptos)} color="emerald" />
            <ConformidadeKPI label={lang === "pt" ? "Pendências" : "Pending"} value={String(data.resumo.pendencias)} color="amber" />
            <ConformidadeKPI label={lang === "pt" ? "Inaptos" : "Ineligible"} value={String(data.resumo.inaptos)} color="red" />
          </div>

          {/* Barra de conformidade */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
              <span>{lang === "pt" ? "Conformidade do lote" : "Lot compliance"}</span>
              <span>{data.resumo.aptos}/{data.resumo.total}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                style={{ width: `${data.resumo.conformidadePct}%` }} />
            </div>
          </div>

          {/* Parecer + Risco */}
          <div className="rounded-3xl border border-[var(--border)] bg-[linear-gradient(135deg,#0f0f1a_0%,#1a1a2e_100%)] p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  {lang === "pt" ? "Parecer Executivo" : "Executive Assessment"}
                </p>
                <p className="mt-3 text-sm leading-7 text-white/85">
                  {lang === "pt" ? data.relatorio.parecer_geral_pt : data.relatorio.parecer_geral_en}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${RISCO_COLOR[data.relatorio.nivel_risco]}`}>
                {lang === "pt" ? `Risco ${data.relatorio.nivel_risco}` : `${data.relatorio.nivel_risco} Risk`}
              </span>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                {lang === "pt" ? "Recomendação" : "Recommendation"}
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {lang === "pt" ? data.relatorio.recomendacao_pt : data.relatorio.recomendacao_en}
              </p>
            </div>
          </div>

          {/* Documentos necessários */}
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {lang === "pt" ? "Documentação Necessária" : "Required Documentation"}
            </p>
            <ul className="mt-4 space-y-2">
              {data.relatorio.documentos_necessarios.map((doc, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[10px] font-bold text-[var(--primary-hover)]">{i + 1}</span>
                  {doc}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              {lang === "pt" ? `Prazo estimado para regularização: ${data.relatorio.prazo_regularizacao}` : `Estimated time to resolve: ${data.relatorio.prazo_regularizacao}`}
            </p>
          </div>

          {/* Tabela de animais */}
          <div className="rounded-3xl border border-[var(--border)] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {lang === "pt" ? "Status por Animal" : "Animal Status"}
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {data.animais.map(a => {
                const cfg = STATUS_CONFIG[a.status];
                return (
                  <div key={a.id} className={`flex items-start justify-between gap-4 px-6 py-4 ${cfg.bg}`}>
                    <div className="flex items-center gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{a.nome}</p>
                        <p className="text-xs text-[var(--text-muted)]">{a.breed} · {a.peso} · Score {a.score}</p>
                        {a.pendencias.length > 0 && (
                          <p className="mt-1 text-xs text-amber-700">{a.pendencias.join(" · ")}</p>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.border} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-right text-xs text-[var(--text-muted)]">
            {lang === "pt" ? `Relatório gerado em ${data.gerado_em} via Agraas Intelligence Layer` : `Report generated on ${data.gerado_em} via Agraas Intelligence Layer`}
          </p>
        </div>
      )}
    </div>
  );
}

function ConformidadeKPI({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  const colors: Record<string, string> = { emerald: "text-emerald-600", amber: "text-amber-600", red: "text-red-600" };
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 font-semibold tracking-tight ${big ? "text-3xl" : "text-2xl"} ${colors[color]}`}>{value}</p>
    </div>
  );
}
