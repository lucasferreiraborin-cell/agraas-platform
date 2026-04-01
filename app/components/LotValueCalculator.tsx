"use client";

import { useMemo } from "react";
import { TrendingUp, AlertTriangle, Award, Star } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const KG_PER_ARROBA = 15;

const ARABIC_DESTINATIONS = [
  "emirados", "uae", "arábia saudita", "saudi", "qatar", "kuwait",
  "bahrein", "bahrain", "omã", "oman", "egito", "egypt", "jordânia",
  "jordan", "iraque", "iraq", "líbano", "lebanon", "marrocos", "morocco",
  "tunísia", "tunisia", "argélia", "algeria", "síria", "yemen", "iêmen",
];

function isArabicDestination(pais: string | null): boolean {
  if (!pais) return false;
  const lower = pais.toLowerCase();
  return ARABIC_DESTINATIONS.some((d) => lower.includes(d));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type WeightRow = { animal_id: string; weight: number; weighing_date: string | null };

interface Props {
  animals: { id: string }[];
  weightByAnimal: Map<string, WeightRow[]>;
  scoreByAnimal: Map<string, number>;
  certsByAnimal: Map<string, string[]>;
  activeCarenciasByAnimal: Map<string, string[]>;
  lot: { pais_destino: string | null; certificacoes_exigidas: string[] | null };
  cotacaoArroba: number;
}

// ── Formatter ─────────────────────────────────────────────────────────────────

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LotValueCalculator({
  animals,
  weightByAnimal,
  scoreByAnimal,
  certsByAnimal,
  activeCarenciasByAnimal,
  lot,
  cotacaoArroba,
}: Props) {
  const calc = useMemo(() => {
    if (animals.length === 0) return null;

    const requiresHalal = lot.certificacoes_exigidas?.some((c) =>
      c.toLowerCase().includes("halal")
    ) ?? false;
    const arabicDest = isArabicDestination(lot.pais_destino);

    let valorBase = 0;
    let bonusScoreTotal = 0;
    let penalCarenciaTotal = 0;
    let countBonusScore = 0;
    let countCarencia = 0;
    let countComPeso = 0;
    let halalCount = 0;

    for (const animal of animals) {
      const aw = weightByAnimal.get(animal.id) ?? [];
      const latestWeight = aw[0] ? Number(aw[0].weight) : null;
      if (!latestWeight) continue;

      countComPeso++;
      const arrobas = latestWeight / KG_PER_ARROBA;
      const animalBase = arrobas * cotacaoArroba;
      valorBase += animalBase;

      const score = scoreByAnimal.get(animal.id) ?? 0;
      if (score >= 75) {
        bonusScoreTotal += animalBase * 0.03;
        countBonusScore++;
      }

      const carencias = activeCarenciasByAnimal.get(animal.id) ?? [];
      if (carencias.length > 0) {
        penalCarenciaTotal += animalBase * 0.05;
        countCarencia++;
      }

      const certs = certsByAnimal.get(animal.id) ?? [];
      if (certs.some((c) => c.toLowerCase().includes("halal"))) {
        halalCount++;
      }
    }

    const allHalal = countComPeso > 0 && halalCount === countComPeso;
    const bonusHalal = (requiresHalal || allHalal) && allHalal ? valorBase * 0.05 : 0;
    const bonusExport = arabicDest ? valorBase * 0.08 : 0;

    const valorFinal = valorBase + bonusScoreTotal + bonusHalal + bonusExport - penalCarenciaTotal;
    const valorMinimo = valorBase;
    const valorMaximo = valorBase * (1 + 0.05 + 0.08) + (valorBase / (countComPeso || 1)) * countComPeso * 0.03;

    const totalBonuses = bonusScoreTotal + bonusHalal + bonusExport;
    const rangeWidth = valorMaximo - valorMinimo;
    const finalPct = rangeWidth > 0 ? Math.round(((valorFinal - valorMinimo) / rangeWidth) * 100) : 50;

    return {
      valorBase,
      bonusScoreTotal,
      bonusHalal,
      bonusExport,
      penalCarenciaTotal,
      totalBonuses,
      valorFinal,
      valorMinimo,
      valorMaximo,
      finalPct: Math.max(0, Math.min(100, finalPct)),
      countBonusScore,
      countCarencia,
      countComPeso,
      arabicDest,
      allHalal,
      requiresHalal,
    };
  }, [animals, weightByAnimal, scoreByAnimal, certsByAnimal, activeCarenciasByAnimal, lot, cotacaoArroba]);

  if (!calc || calc.countComPeso === 0) {
    return (
      <section className="ag-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={15} className="text-emerald-400" />
          <h2 className="ag-section-title mb-0">Calculadora de Valor do Lote</h2>
        </div>
        <p className="text-sm text-white/40">
          Nenhum animal com peso registrado. Registre pesagens para calcular o valor estimado do lote.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(93,156,68,0.08)_0%,rgba(15,15,26,0.95)_60%)] shadow-sm">
      <div className="p-6 lg:p-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <h2 className="ag-section-title mb-0">Calculadora de Valor do Lote</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>Cotação: <strong className="text-white/70">R$ {cotacaoArroba.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/@</strong></span>
            <span>·</span>
            <span>{calc.countComPeso}/{animals.length} animais com peso</span>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Valor Base</p>
            <p className="mt-1.5 text-xl font-semibold text-white">{fmtBRL(calc.valorBase)}</p>
            <p className="text-[10px] text-white/35">sem bônus</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70">Com Bônus</p>
            <p className="mt-1.5 text-xl font-semibold text-emerald-400">+{fmtBRL(calc.totalBonuses)}</p>
            <p className="text-[10px] text-white/35">{calc.countBonusScore} animais score ≥ 75</p>
          </div>
          <div className={`rounded-2xl border p-4 text-center ${calc.countCarencia > 0 ? "border-red-500/20 bg-red-500/8" : "border-white/8 bg-white/4"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${calc.countCarencia > 0 ? "text-red-400/70" : "text-white/40"}`}>Penalidades</p>
            <p className={`mt-1.5 text-xl font-semibold ${calc.countCarencia > 0 ? "text-red-400" : "text-white/50"}`}>
              {calc.countCarencia > 0 ? `-${fmtBRL(calc.penalCarenciaTotal)}` : "—"}
            </p>
            <p className="text-[10px] text-white/35">{calc.countCarencia} em carência</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mb-6 space-y-2 rounded-2xl border border-white/8 bg-white/3 p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/35">Composição do valor</p>

          <BreakdownRow
            icon={<span className="text-white/50">⚖</span>}
            label={`Valor base — ${calc.countComPeso} animais × ${(calc.valorBase / calc.countComPeso / cotacaoArroba).toFixed(1)}@ × R$${cotacaoArroba}/@`}
            value={calc.valorBase}
            color="text-white/80"
          />

          {calc.countBonusScore > 0 && (
            <BreakdownRow
              icon={<Star size={11} className="text-amber-400" />}
              label={`Bônus score ≥ 75 — ${calc.countBonusScore} animais × +3%`}
              value={calc.bonusScoreTotal}
              positive
            />
          )}

          {calc.bonusHalal > 0 && (
            <BreakdownRow
              icon={<Award size={11} className="text-emerald-400" />}
              label="Bônus Halal — lote 100% certificado · +5%"
              value={calc.bonusHalal}
              positive
            />
          )}

          {calc.bonusExport > 0 && (
            <BreakdownRow
              icon={<span className="text-blue-400 text-[11px]">🌍</span>}
              label={`Bônus exportação árabe — ${lot.pais_destino} · +8%`}
              value={calc.bonusExport}
              positive
            />
          )}

          {calc.penalCarenciaTotal > 0 && (
            <BreakdownRow
              icon={<AlertTriangle size={11} className="text-red-400" />}
              label={`Penalidade carência — ${calc.countCarencia} animais × -5%`}
              value={calc.penalCarenciaTotal}
              negative
            />
          )}

          {/* Divider + total */}
          <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/60">Valor estimado final</span>
            <span className="text-2xl font-semibold text-emerald-400 tracking-tight">{fmtBRL(calc.valorFinal)}</span>
          </div>
        </div>

        {/* Negotiation range */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">Faixa de negociação</p>
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs text-white/40">{fmtBRL(calc.valorMinimo)}</span>
            <div className="relative flex-1 h-2.5 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-gradient-to-r from-white/20 to-emerald-500 transition-all"
                style={{ width: `${calc.finalPct}%` }} />
              {/* Current value marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-emerald-400 shadow"
                style={{ left: `calc(${calc.finalPct}% - 2px)` }}
              />
            </div>
            <span className="shrink-0 text-xs text-white/40">{fmtBRL(calc.valorMaximo)}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-white/25">
            <span>Sem bônus</span>
            <span className="text-emerald-400/60">▲ Valor atual: {fmtBRL(calc.valorFinal)}</span>
            <span>Todos os bônus</span>
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function BreakdownRow({
  icon, label, value, positive, negative, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  color?: string;
}) {
  const valueColor = positive ? "text-emerald-400" : negative ? "text-red-400" : color ?? "text-white/70";
  const prefix = positive ? "+" : negative ? "-" : "";
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2 text-xs text-white/55">
        <span className="flex w-4 justify-center shrink-0">{icon}</span>
        {label}
      </div>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${valueColor}`}>
        {prefix}{fmtBRL(value)}
      </span>
    </div>
  );
}
