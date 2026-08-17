"use client";

/**
 * HedgePanel — Inteligência de Hedge (trava de preço e margem).
 *
 * Cruza arrobas + custo/@ (de um lote OU do rebanho) com uma curva de futuros
 * do boi gordo (BGI/B3) de REFERÊNCIA e sinaliza o momento de travar preço e
 * garantir margem. Decisão-suporte — NÃO é recomendação de investimento
 * (hedge exige conta em corretora/B3). Sugestão do Mourão (JBS).
 *
 * Recebe primitivos (arrobas, custoTotal) — serve Server e Client Components.
 * A curva é derivada do spot × fatores realistas por mês-à-frente; com feed
 * de mercado ao vivo, basta substituir a curva.
 */

import { useMemo } from "react";
import { TrendingUp, ShieldCheck, Lock, Info } from "lucide-react";

const KG_PER_ARROBA = 30;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Fatores da curva de futuros BGI relativos ao spot (M0 = spot). Padrão com
// leve valorização até ~M+3 e acomodação depois — referência ilustrativa B3/CEPEA.
const FUT_FATOR = [1.0, 1.013, 1.028, 1.042, 1.037, 1.03, 1.022];

interface Props {
  arrobas: number;
  custoTotal: number;
  cotacaoSpot: number;
  pesoMedioKg?: number | null;
  gmdMedio?: number | null;
  pesoAlvoKg?: number | null;
  mesAtual: number; // 0-11, passado pelo pai (evita new Date no componente)
  escopo?: string; // "lote" | "rebanho"
  titulo?: string;
  subtitulo?: string;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtBRL2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function HedgePanel({
  arrobas,
  custoTotal,
  cotacaoSpot,
  pesoMedioKg,
  gmdMedio,
  pesoAlvoKg,
  mesAtual,
  escopo = "lote",
  titulo = "Trava de preço e margem",
  subtitulo = "Curva de futuros do boi gordo (BGI) sobre o custo real deste lote — quando travar para garantir a margem.",
}: Props) {
  const calc = useMemo(() => {
    if (!arrobas || arrobas <= 0) return null;

    const custoPorArroba = custoTotal > 0 ? custoTotal / arrobas : 0;
    const pesoMedio = pesoMedioKg && pesoMedioKg > 0 ? pesoMedioKg : null;

    // Mês estimado de venda (a partir do GMD → peso alvo), clamp 0..6
    let mesVenda = 3;
    if (gmdMedio && gmdMedio > 0 && pesoAlvoKg && pesoMedio && pesoAlvoKg > pesoMedio) {
      const dias = (pesoAlvoKg - pesoMedio) / gmdMedio;
      mesVenda = Math.max(0, Math.min(6, Math.round(dias / 30)));
    }

    const curva = FUT_FATOR.map((f, i) => {
      const preco = cotacaoSpot * f;
      const margemArroba = preco - custoPorArroba;
      return {
        i,
        label: MESES[(mesAtual + i) % 12],
        preco,
        margemArroba,
        margemTotal: margemArroba * arrobas,
        isVenda: i === mesVenda,
      };
    });

    const noVenda = curva[mesVenda];
    const janela = curva.slice(0, Math.min(curva.length, mesVenda + 2));
    const melhor = janela.reduce((best, c) => (c.preco > best.preco ? c : best), janela[0]);

    const margemSpotArroba = cotacaoSpot - custoPorArroba;
    const abrirJanela = noVenda.margemArroba > 0 && melhor.preco >= cotacaoSpot;

    const pisoArroba = cotacaoSpot * 0.97;
    const premioTotal = cotacaoSpot * 0.02 * arrobas;

    const maxPreco = Math.max(...curva.map((c) => c.preco));
    const minRef = Math.min(custoPorArroba, ...curva.map((c) => c.preco));

    return {
      custoPorArroba, mesVenda, curva, noVenda, melhor,
      margemSpotArroba, abrirJanela, pisoArroba, premioTotal, maxPreco, minRef,
    };
  }, [arrobas, custoTotal, cotacaoSpot, pesoMedioKg, gmdMedio, pesoAlvoKg, mesAtual]);

  if (!calc || calc.custoPorArroba <= 0) return null;

  const {
    custoPorArroba, curva, noVenda, melhor, margemSpotArroba,
    abrirJanela, pisoArroba, premioTotal, maxPreco, minRef,
  } = calc;

  const W = 640, H = 190, padX = 12, padTop = 24, padBottom = 30;
  const n = curva.length;
  const yMin = minRef * 0.985, yMax = maxPreco * 1.015, range = yMax - yMin || 1;
  const xAt = (i: number) => padX + (i / (n - 1)) * (W - 2 * padX);
  const yAt = (v: number) => padTop + (1 - (v - yMin) / range) * (H - padTop - padBottom);
  const beY = yAt(custoPorArroba);
  const linePath = curva.map((c, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(c.preco).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(n - 1).toFixed(1)},${H - padBottom} L${xAt(0).toFixed(1)},${H - padBottom} Z`;

  return (
    <section className="ag-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-5">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
            <ShieldCheck size={14} /> Inteligência de Hedge
          </div>
          <h2 className="mt-1.5 text-lg font-semibold text-[var(--text-primary)]">{titulo}</h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">{subtitulo}</p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)]">
          {arrobas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} @ no {escopo}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] md:grid-cols-4">
        {[
          { label: "Custo (break-even)", value: `${fmtBRL2(custoPorArroba)}/@`, tone: "muted" },
          { label: "Spot hoje", value: `${fmtBRL2(cotacaoSpot)}/@`, tone: "muted" },
          { label: "Margem no spot", value: `${fmtBRL2(margemSpotArroba)}/@`, tone: margemSpotArroba >= 0 ? "good" : "bad" },
          { label: `Trava ${melhor.label} (melhor)`, value: `${fmtBRL2(melhor.preco)}/@`, tone: "primary" },
        ].map((k) => (
          <div key={k.label} className="bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{k.label}</p>
            <p className={`mt-1.5 text-lg font-bold tabular-nums ${
              k.tone === "good" ? "text-[#166534]" : k.tone === "bad" ? "text-[var(--danger)]" :
              k.tone === "primary" ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
            }`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerta */}
      <div className="px-6 pt-5">
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${
          abrirJanela ? "border-[var(--primary)]/30 bg-[var(--primary-soft)]" : "border-amber-200 bg-amber-50"
        }`}>
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            abrirJanela ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-amber-100 text-amber-700"
          }`}>
            {abrirJanela ? <Lock size={16} /> : <Info size={16} />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${abrirJanela ? "text-[var(--primary-hover)]" : "text-amber-900"}`}>
              {abrirJanela ? "Janela de hedge aberta" : "Aguardar — margem apertada"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {abrirJanela ? (
                <>
                  Trave o contrato de <strong>{melhor.label}</strong> a{" "}
                  <strong>{fmtBRL2(melhor.preco)}/@</strong> e garanta{" "}
                  <strong>{fmtBRL(melhor.margemTotal)}</strong> de margem no {escopo}
                  {" "}(<strong>{fmtBRL2(melhor.margemArroba)}/@</strong>, +{((melhor.margemArroba / custoPorArroba) * 100).toFixed(0)}% sobre o custo).
                  Venda estimada em <strong>{noVenda.label}</strong>.
                </>
              ) : (
                <>
                  A curva de futuros não abre margem confortável sobre o custo de{" "}
                  {fmtBRL2(custoPorArroba)}/@ no horizonte. Reduza custo ou aguarde
                  melhora do BGI antes de travar.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico da curva de futuros */}
      <div className="px-6 pt-5">
        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Curva de futuros BGI · próximos {n - 1} meses
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Curva de futuros do boi gordo">
          <defs>
            <linearGradient id="hedge-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={padX} y1={beY} x2={W - padX} y2={beY} stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7" />
          <text x={W - padX} y={beY - 5} textAnchor="end" fontSize="10" fill="var(--danger)" fontFamily="inherit">
            break-even {fmtBRL2(custoPorArroba)}/@
          </text>
          <path d={areaPath} fill="url(#hedge-area)" />
          <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {curva.map((c, i) => (
            <g key={i}>
              {c.isVenda && (
                <line x1={xAt(i)} y1={padTop - 6} x2={xAt(i)} y2={H - padBottom} stroke="var(--primary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
              )}
              <circle cx={xAt(i)} cy={yAt(c.preco)} r={c.i === melhor.i ? 5.5 : 3.5}
                fill={c.i === melhor.i ? "var(--primary)" : "#fff"} stroke="var(--primary)" strokeWidth="2" />
              <text
                x={i === 0 ? padX : i === n - 1 ? W - padX : xAt(i)}
                y={H - padBottom + 16}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize="10"
                fill={c.isVenda ? "var(--primary)" : "var(--text-muted)"} fontWeight={c.isVenda ? 700 : 400} fontFamily="inherit">
                {c.label}{i === 0 ? " · spot" : ""}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Piso via put + como travar */}
      <div className="mt-4 grid gap-px border-t border-[var(--border)] bg-[var(--border)] md:grid-cols-2">
        <div className="flex items-start gap-3 bg-white p-5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Piso protegido (opção de venda)</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              Uma <em>put</em> garante um piso de <strong>{fmtBRL2(pisoArroba)}/@</strong> sem
              abrir mão da alta, por um prêmio estimado de <strong>{fmtBRL(premioTotal)}</strong> no {escopo}.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-white p-5">
          <TrendingUp size={18} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Como travar</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              O contrato futuro BGI (330 @/contrato) é operado na B3 via corretora.
              A Agraas sinaliza o momento; a execução é na sua conta.
            </p>
          </div>
        </div>
      </div>

      <p className="border-t border-[var(--border)] bg-[var(--surface-soft)] px-6 py-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
        Simulação de <strong>decisão-suporte</strong> com curva de futuros BGI de referência (B3/CEPEA) sobre o
        custo real. <strong>Não é recomendação de investimento</strong>; operações de hedge envolvem risco e
        exigem conta em corretora habilitada na B3.
      </p>
    </section>
  );
}
