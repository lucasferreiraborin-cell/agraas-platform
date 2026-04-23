"use client";

import Link from "next/link";
import {
  FileText,
  Receipt,
  Boxes,
  Wallet,
  TrendingUp,
  ArrowRight,
  Layers,
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

const PILLARS = [
  {
    Icon: Wallet,
    title: "Financeiro completo",
    text: "DRE, fluxo de caixa e balanço patrimonial integrados ao dia a dia. Receitas, custos e margens por operação, propriedade e lote.",
    bullets: ["DRE mensal automática", "Fluxo de caixa consolidado", "Balanço patrimonial"],
  },
  {
    Icon: Receipt,
    title: "Fiscal integrado",
    text: "NF-e de entrada e saída validadas automaticamente. Upload de documentos, OCR para extração, conformidade com SEFAZ.",
    bullets: ["Entrada + saída", "OCR automático", "Aderência SEFAZ"],
  },
  {
    Icon: Boxes,
    title: "Estoque total",
    text: "Insumos, medicamentos, ração e equipamentos com controle por lote, validade e carência. Débito automático ao registrar aplicação.",
    bullets: ["Lote + validade", "Carência MAPA", "Débito automático"],
  },
  {
    Icon: TrendingUp,
    title: "Custo & ROI por animal",
    text: "Cada animal carrega seu próprio custo acumulado. ROI projetado calculado com cotação da arroba em tempo real.",
    bullets: ["Custo rastreado", "ROI projetado", "Cotação @ ao vivo"],
  },
];

export default function OperationalSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(46,139,62,0.05) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(46,139,62,0.05) 0%, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[820px] text-center">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Cadeia inteira · ERP nativo
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h2 className="mt-5 text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.08] tracking-[-.025em] text-[var(--text-primary)]">
              Mais que rastreio.
              <br />
              <span className="text-[var(--primary)]">Contábil, fiscal e estoque no mesmo lugar.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="mx-auto mt-6 max-w-[600px] text-[1.0625rem] leading-[1.75] text-[var(--text-secondary)]">
              O fazendeiro não precisa de três softwares para administrar uma operação. A Agraas cobre tudo que a cadeia exige — do registro sanitário ao balanço patrimonial — numa camada só, auditável ponta a ponta.
            </p>
          </FadeIn>
        </div>

        <StaggerContainer
          className="mt-16 grid gap-5 md:grid-cols-2"
          staggerChildren={0.08}
        >
          {PILLARS.map((p) => (
            <StaggerItem key={p.title}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)]/25 hover:shadow-[var(--shadow-card)]">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(46,139,62,0.12) 0%, transparent 70%)",
                  }}
                />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                    <p.Icon size={22} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="mt-5 text-[1.125rem] font-semibold leading-[1.3] tracking-[-.01em] text-[var(--text-primary)]">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-[.9375rem] leading-[1.7] text-[var(--text-muted)]">
                    {p.text}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.bullets.map((b) => (
                      <span
                        key={b}
                        className="rounded-md border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-2.5 py-1 text-[.6875rem] font-semibold text-[var(--primary)]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Full-chain visualization */}
        <FadeIn delay={0.4}>
          <div className="relative mt-20 overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[#0f3517] to-[#1E5E26] p-8 lg:p-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(hsla(0,0%,100%,.035) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.035) 1px, transparent 1px)",
                backgroundSize: "3rem 3rem",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-white/60">
                <Layers size={14} />
                <span className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em]">
                  A cadeia inteira, em uma única plataforma
                </span>
              </div>

              <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02] md:grid-cols-6">
                {[
                  { label: "Operacional",  sub: "Manejo e sanitário" },
                  { label: "Estoque",      sub: "Insumos + carência" },
                  { label: "Financeiro",   sub: "DRE + fluxo" },
                  { label: "Fiscal",       sub: "NF-e automática" },
                  { label: "Comercial",    sub: "Vendas + marketplace" },
                  { label: "Exportação",   sub: "Lotes + rastreio" },
                ].map((col, i) => (
                  <div
                    key={col.label}
                    className="flex flex-col justify-between border-white/[.08] bg-[rgba(7,26,14,0.6)] p-5"
                    style={{
                      borderRightWidth: i < 5 ? 1 : 0,
                    }}
                  >
                    <div>
                      <span className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[var(--primary)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-3 text-[.9375rem] font-semibold text-white">
                        {col.label}
                      </p>
                      <p className="mt-1 text-[.75rem] leading-[1.55] text-white/50">
                        {col.sub}
                      </p>
                    </div>
                    <div className="mt-5 flex items-center gap-1 text-[.6875rem] text-white/45">
                      <FileText size={10} />
                      <span>Integrado</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-[460px] text-[.8125rem] leading-[1.7] text-white/55">
                  Todos os módulos se conversam. Uma aplicação sanitária debita estoque, gera custo e alimenta o score — sem digitar duas vezes.
                </p>
                <Link
                  href="/cadastro"
                  className="group inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/[.04] px-5 py-2.5 text-[.8125rem] font-semibold text-white transition-all hover:border-white/60 hover:bg-white/[.08]"
                >
                  Ver a plataforma completa
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
