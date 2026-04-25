"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ArrowRight, ChevronDown, Loader2, Leaf, Zap, Crown, Star, MapPin, ShieldCheck, Activity } from "lucide-react";
import ScoreRing from "@/app/components/ui/ScoreRing";
import type { LucideIcon } from "lucide-react";
import PublicShell from "@/app/components/ui/PublicShell";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

type Plan = {
  id: string;
  name: string;
  persona: string;
  monthlyPrice: number | null;
  Icon: LucideIcon;
  accent: string;
  popular?: boolean;
  bullets: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    persona: "Para o fazendeiro que quer começar a rastrear seu rebanho e ter o passaporte digital ativo.",
    monthlyPrice: 299,
    Icon: Leaf,
    accent: "text-emerald-600",
    bullets: [
      "Até 300 animais",
      "1 propriedade",
      "Passaporte digital por animal",
      "Score Agraas em tempo real",
      "Pesagens e aplicações sanitárias",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    persona: "Para operações médias com foco em conformidade sanitária, fiscal e acesso ao marketplace.",
    monthlyPrice: 699,
    Icon: Zap,
    accent: "text-[var(--primary)]",
    popular: true,
    bullets: [
      "Até 2.000 animais",
      "3 propriedades",
      "Tudo do Starter",
      "Calendário sanitário + metas de peso",
      "Custo de produção + ROI",
      "Relatórios em PDF",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    persona: "Para exportadores e fazendas grandes que precisam de rastreio completo e portal para compradores institucionais.",
    monthlyPrice: 1499,
    Icon: Crown,
    accent: "text-indigo-600",
    bullets: [
      "Animais ilimitados",
      "Propriedades ilimitadas",
      "Tudo do Pro",
      "Portal do comprador (acesso dedicado)",
      "Exportação + rastreio de embarques",
      "IA preditiva + alertas",
      "Fornecedores + NF-e automática",
      "Suporte prioritário",
    ],
  },
  {
    id: "pilot",
    name: "Pilot",
    persona: "Para cooperativas, grupos de fazendas e operações que querem testar antes de escalar.",
    monthlyPrice: null,
    Icon: Star,
    accent: "text-amber-600",
    bullets: [
      "Tudo do Enterprise",
      "Onboarding dedicado",
      "Importação assistida",
      "Período de avaliação",
      "Sem cobrança inicial",
    ],
  },
];

type CellValue = boolean | string | "em-breve";

const COMPARISON_ROWS: { label: string; values: CellValue[] }[] = [
  { label: "Animais incluídos",             values: ["300",  "2.000", "Ilimitado", "Ilimitado"] },
  { label: "Passaporte digital PT/EN/AR",   values: [true,   true,    true,        true] },
  { label: "Score Agraas em tempo real",    values: [true,   true,    true,        true] },
  { label: "App mobile Agraas Campo",       values: ["em-breve", true, true,       true] },
  { label: "Módulo fiscal NF-e",            values: [false,  true,    true,        true] },
  { label: "Grain ID (grãos)",              values: [false,  true,    true,        true] },
  { label: "Portal comprador institucional",values: [false,  false,   true,        true] },
  { label: "API pública",                   values: [false,  false,   "em-breve",  "em-breve"] },
  { label: "Suporte dedicado",              values: [false,  false,   true,        true] },
];

const FAQ = [
  {
    q: "Posso trocar de plano a qualquer momento?",
    a: "Sim. Upgrade é instantâneo, com cobrança proporcional ao ciclo atual. Downgrade passa a valer no próximo mês — você não perde o acesso até o fim do ciclo pago.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "Starter, Pro e Enterprise têm 14 dias para cancelar sem custo. No Pilot, o período de avaliação é combinado caso a caso — sem cobrança inicial e onboarding dedicado para provar valor antes de comprometer orçamento.",
  },
  {
    q: "A migração dos meus dados é gratuita?",
    a: "Sim. Importação via CSV com template padronizado está inclusa em todos os planos. No Enterprise, o time Agraas faz a importação assistida. Integrações diretas com TOTVS, SAP ou sistemas proprietários são orçadas sob demanda.",
  },
  {
    q: "O marketplace está incluído em todos os planos?",
    a: "Sim. Publicar e negociar no marketplace é grátis em todos os planos. A plataforma cobra uma taxa de 2% apenas sobre transações fechadas, paga pelo vendedor — sem surpresa no checkout.",
  },
  {
    q: "Como funciona a cobrança?",
    a: "Cobrança mensal recorrente via Stripe (cartão de crédito ou boleto). O plano anual tem 20% de desconto e é cobrado de uma vez por 12 meses. NF-e da assinatura emitida automaticamente a cada ciclo.",
  },
  {
    q: "Tem desconto para cooperativas?",
    a: "Sim. Cooperativas e grupos de 5+ fazendas entram pelo plano Pilot com condições comerciais específicas. Entre em contato para avaliar volume e necessidades.",
  },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export default function PlanosPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"mensal" | "anual">("mensal");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  async function handleSubscribe(planId: string) {
    if (planId === "pilot") {
      window.location.href = "mailto:contato@agraas.com.br?subject=Interesse no plano Pilot";
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billing,
          successUrl: `${window.location.origin}/configuracoes/assinatura?success=1`,
          cancelUrl: `${window.location.origin}/planos`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.requiresAuth) {
        window.location.href = "/login?next=/planos";
      } else {
        alert(data.error ?? "Erro ao iniciar pagamento.");
      }
    } catch {
      alert("Erro de conexão.");
    }
    setLoading(null);
  }

  return (
    <PublicShell>
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[var(--bg)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(46,139,62,0.08) 0%, transparent 60%)",
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-6 pt-24 pb-12 text-center lg:px-10 lg:pt-32">
          <FadeIn>
            <h1 className="mx-auto max-w-[820px] text-[clamp(2.2rem,5vw,3.6rem)] font-medium leading-[1] tracking-[-.03em] text-[var(--text-primary)]">
              Planos que escalam com sua operação.
            </h1>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mx-auto mt-6 max-w-[580px] text-[1.0625rem] leading-[1.75] text-[var(--text-secondary)]">
              Do fazendeiro que começa a rastrear ao exportador com múltiplas fazendas.
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="mx-auto mt-10 inline-flex rounded-2xl border border-[var(--border)] bg-white p-1 shadow-[var(--shadow-soft)]">
              <button
                type="button"
                onClick={() => setBilling("mensal")}
                className={`px-6 py-2.5 text-[.875rem] font-semibold rounded-xl transition ${
                  billing === "mensal"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBilling("anual")}
                className={`relative px-6 py-2.5 text-[.875rem] font-semibold rounded-xl transition ${
                  billing === "anual"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Anual
                <span className="ml-2 inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  −20%
                </span>
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ PLAN CARDS ═════════════════════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 pb-24 lg:px-10">
          <StaggerContainer
            className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
            staggerChildren={0.08}
          >
            {PLANS.map((plan) => {
              const discounted =
                plan.monthlyPrice != null ? Math.round(plan.monthlyPrice * 0.8) : null;
              const isAnual = billing === "anual" && plan.monthlyPrice != null;
              return (
                <StaggerItem key={plan.id}>
                  <div
                    className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-all ${
                      plan.popular
                        ? "border-[var(--primary)] shadow-[0_20px_50px_rgba(46,139,62,.15)] ring-1 ring-[var(--primary)]/20"
                        : "border-[var(--border)] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)]"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-4 py-1 font-mono text-[.6875rem] font-bold uppercase tracking-[.12em] text-white shadow-[var(--shadow-green)]">
                        Mais escolhido
                      </span>
                    )}
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                      <plan.Icon size={22} className={plan.accent} />
                    </div>
                    <h3 className="mt-5 text-[1.25rem] font-semibold tracking-[-.01em] text-[var(--text-primary)]">
                      {plan.name}
                    </h3>
                    <p className="mt-2 min-h-[4.5em] text-[.8125rem] leading-[1.55] text-[var(--text-muted)]">
                      {plan.persona}
                    </p>

                    <div className="mt-5 min-h-[100px]">
                      <AnimatePresence mode="wait">
                        {plan.monthlyPrice == null ? (
                          <motion.div
                            key="pilot"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                          >
                            <span className="text-[1.8rem] font-semibold text-[var(--text-primary)]">
                              Sob consulta
                            </span>
                          </motion.div>
                        ) : isAnual ? (
                          <motion.div
                            key="anual"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="text-[.8125rem] text-[var(--text-muted)] line-through">
                                {fmtBRL(plan.monthlyPrice)}
                              </span>
                              <span className="text-[2rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
                                {fmtBRL(discounted!)}
                              </span>
                              <span className="text-[.8125rem] text-[var(--text-muted)]">
                                /mês
                              </span>
                            </div>
                            <p className="mt-1 text-[.75rem] text-[var(--text-secondary)]">
                              {fmtBRL(discounted! * 12)} pago 1× por ano
                            </p>
                            <p className="mt-0.5 text-[.6875rem] font-semibold text-emerald-600">
                              economize {fmtBRL((plan.monthlyPrice - discounted!) * 12)} vs plano mensal
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="mensal"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                          >
                            <div className="flex items-baseline gap-1">
                              <span className="text-[2rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">
                                {fmtBRL(plan.monthlyPrice)}
                              </span>
                              <span className="text-[.875rem] text-[var(--text-muted)]">
                                /mês
                              </span>
                            </div>
                            <p className="mt-1 text-[.75rem] text-[var(--text-secondary)]">
                              ou {fmtBRL(Math.round(plan.monthlyPrice * 0.8) * 12)} no anual (−20%)
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <ul className="mt-4 flex-1 space-y-2.5">
                      {plan.bullets.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-[.8125rem] leading-[1.55] text-[var(--text-secondary)]"
                        >
                          <Check
                            size={14}
                            className="mt-0.5 shrink-0 text-[var(--primary)]"
                          />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading === plan.id}
                      className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[.875rem] font-semibold transition disabled:opacity-60 ${
                        plan.popular
                          ? "bg-[var(--primary)] text-white shadow-[var(--shadow-green)] hover:bg-[var(--primary-hover)]"
                          : "border border-[var(--border-strong)] bg-white text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                      }`}
                    >
                      {loading === plan.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Redirecionando
                        </>
                      ) : plan.id === "pilot" ? (
                        <>
                          Fale com a gente
                          <ArrowRight size={14} />
                        </>
                      ) : (
                        <>
                          Assinar {plan.name}
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══ COMPARISON TABLE ═══════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Comparação completa entre planos
            </h2>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-12 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                    <th className="px-6 py-4 text-[.75rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
                      Recurso
                    </th>
                    {PLANS.map((p) => (
                      <th
                        key={p.id}
                        className={`px-4 py-4 text-center text-[.8125rem] font-semibold ${
                          p.popular ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr
                      key={row.label}
                      className="border-t border-[var(--border)] transition-colors hover:bg-[var(--surface-soft)]/50"
                    >
                      <td className="px-6 py-3.5 text-[.875rem] font-medium text-[var(--text-secondary)]">
                        {row.label}
                      </td>
                      {row.values.map((v, i) => (
                        <td
                          key={i}
                          className={`px-4 py-3.5 text-center text-[.8125rem] ${
                            PLANS[i].popular ? "bg-[var(--primary)]/[.03]" : ""
                          }`}
                        >
                          {v === "em-breve" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[.625rem] font-bold uppercase tracking-wide text-amber-700">
                              Em breve
                            </span>
                          ) : typeof v === "boolean" ? (
                            v ? (
                              <Check
                                size={16}
                                className="inline text-[var(--primary)]"
                              />
                            ) : (
                              <span className="text-[var(--border-strong)]">—</span>
                            )
                          ) : (
                            <span className="font-semibold text-[var(--text-primary)]">
                              {v}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FAQ ════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[820px] px-6 py-24 lg:py-28">
          <FadeIn>
            <h2 className="text-center text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Perguntas frequentes
            </h2>
          </FadeIn>

          <div className="mt-14 space-y-3">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <FadeIn key={item.q} delay={i * 0.05}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-6 py-5 text-left shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--primary)]/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">
                        {item.q}
                      </p>
                      <motion.div
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <ChevronDown
                          size={18}
                          className="shrink-0 text-[var(--text-muted)]"
                        />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="mt-3 text-[.875rem] leading-[1.75] text-[var(--text-muted)]">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF (case + métricas) ═══════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center lg:gap-16">
            {/* Case FSJBE resumido */}
            <div>
              <FadeIn>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2.5 py-1 text-[.6875rem] font-semibold uppercase tracking-[.08em] text-[var(--primary)]">
                  <ShieldCheck size={11} />
                  Cliente ativo
                </div>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h3 className="mt-4 text-[clamp(1.5rem,3vw,2rem)] font-medium leading-[1.15] tracking-[-.02em] text-[var(--text-primary)]">
                  Fazenda São João da Boa Esperança
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[.8125rem] text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} />
                    Jussara, Goiás
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                  <span>Rebanho Nelore · Cliente ativo</span>
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="mt-6 max-w-[520px] text-[.9375rem] leading-[1.8] text-[var(--text-secondary)]">
                  Opera no Agraas com passaporte digital individual, score em tempo real e lote de exportação ativo para Jeddah. Comprador institucional vinculado via portal dedicado.
                </p>
              </FadeIn>

              {/* Métricas de produto */}
              <FadeIn delay={0.3}>
                <div className="mt-8 grid gap-6 border-t border-[var(--border)] pt-8 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)]">
                      <Activity size={17} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">
                        Plataforma em produção desde 2025
                      </p>
                      <p className="mt-1 text-[.75rem] leading-[1.55] text-[var(--text-muted)]">
                        Operação contínua · 82 módulos ativos · deploys múltiplos por semana
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)]">
                      <ShieldCheck size={17} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">
                        0 bugs críticos em aberto
                      </p>
                      <p className="mt-1 text-[.75rem] leading-[1.55] text-[var(--text-muted)]">
                        Sentry monitorando tempo real · typecheck limpo em cada deploy
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Score demo */}
            <FadeIn delay={0.15}>
              <div
                className="relative overflow-hidden rounded-3xl p-10"
                style={{
                  background:
                    "linear-gradient(135deg, #0f3517 0%, #1E5E26 100%)",
                }}
              >
                <div className="relative flex flex-col items-center">
                  <p className="text-[.8125rem] font-medium text-white/75">
                    Score médio do rebanho FSJBE
                  </p>
                  <div className="mt-6">
                    <ScoreRing score={78} size="lg" variant="dark" />
                  </div>
                  <p className="mt-6 max-w-[260px] text-center text-[.75rem] leading-[1.6] text-white/50">
                    O mesmo número aparece no passaporte público, marketplace e dashboard operacional.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, var(--sidebar) 0%, var(--sidebar-2) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[.5]"
          style={{
            backgroundImage:
              "linear-gradient(hsla(0,0%,100%,.03) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.03) 1px, transparent 1px)",
            backgroundSize: "4rem 4rem",
          }}
        />

        <div className="mx-auto max-w-[820px] px-6 py-28 text-center">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.15] tracking-[-.03em] text-white">
              Não sabe por onde começar?
            </h2>
            <p className="mx-auto mt-5 max-w-[540px] text-[1rem] leading-[1.7] text-white/70">
              Agende uma demo de 30 minutos — o time te mostra a plataforma com dados reais e ajuda a escolher o plano certo.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/cadastro"
                className="rounded-xl bg-white px-8 py-4 text-[.9375rem] font-semibold text-[var(--sidebar-2)] shadow-[0_14px_40px_rgba(0,0,0,.2)] transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]"
              >
                Criar conta gratuita
              </Link>
              <a
                href="mailto:contato@agraas.com.br"
                className="rounded-xl border border-white/60 px-8 py-4 text-[.9375rem] font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Agendar demo
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </PublicShell>
  );
}
