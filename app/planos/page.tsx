"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ArrowRight, ChevronDown, Loader2, Leaf, Zap, Crown, Star } from "lucide-react";
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
    persona: "Fazendeiro começando a rastrear",
    monthlyPrice: 299,
    Icon: Leaf,
    accent: "text-emerald-600",
    bullets: [
      "Até 500 animais",
      "1 propriedade",
      "Passaporte digital por animal",
      "Score Agraas em tempo real",
      "Pesagens e aplicações sanitárias",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    persona: "Operação média com exportação",
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
    persona: "Frigorífico, exportador ou grupo",
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
    persona: "Cooperativas e projetos-piloto",
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

const COMPARISON_ROWS: { category: string; rows: { label: string; values: (boolean | string)[] }[] }[] = [
  {
    category: "Pecuária",
    rows: [
      { label: "Animais incluídos",            values: ["500", "2.000", "Ilimitado", "Ilimitado"] },
      { label: "Passaporte digital",           values: [true, true, true, true] },
      { label: "Score Agraas + breakdown",     values: [true, true, true, true] },
      { label: "Calendário sanitário",         values: [false, true, true, true] },
      { label: "Metas de peso + GMD",          values: [false, true, true, true] },
      { label: "Módulo reprodutivo",           values: [false, true, true, true] },
    ],
  },
  {
    category: "Agricultura",
    rows: [
      { label: "Talhões georreferenciados",    values: [true, true, true, true] },
      { label: "Grain ID (7 etapas)",          values: [false, true, true, true] },
      { label: "Laudo de qualidade + BL",      values: [false, false, true, true] },
    ],
  },
  {
    category: "Operação",
    rows: [
      { label: "Propriedades",                 values: ["1", "3", "Ilimitado", "Ilimitado"] },
      { label: "Fornecedores + NF-e",          values: [false, true, true, true] },
      { label: "Custo de produção + ROI",      values: [false, true, true, true] },
      { label: "Portal do comprador",          values: [false, false, true, true] },
    ],
  },
  {
    category: "Inteligência",
    rows: [
      { label: "Marketplace Agro",             values: [true, true, true, true] },
      { label: "IA preditiva + alertas",       values: [false, false, true, true] },
      { label: "Relatórios em PDF",            values: [false, true, true, true] },
      { label: "Suporte prioritário",          values: [false, false, true, true] },
    ],
  },
];

const FAQ = [
  {
    q: "Posso trocar de plano a qualquer momento?",
    a: "Sim. Upgrade é instantâneo e o valor é proporcional. Downgrade passa a valer no próximo ciclo.",
  },
  {
    q: "Há contrato mínimo?",
    a: "Não. Mensal é mensal. O plano anual tem 20% de desconto e é cobrado de uma vez por 12 meses.",
  },
  {
    q: "Como funciona o Pilot?",
    a: "É um período de avaliação com onboarding dedicado, sem cobrança inicial. Indicado para cooperativas, grupos e projetos de pesquisa que precisam provar valor antes de comprometer orçamento.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Tudo armazenado em PostgreSQL com RLS (Row Level Security) — seus dados nunca são visíveis a outros clientes. Backups diários. Conformidade LGPD.",
  },
  {
    q: "Integra com meu ERP ou software atual?",
    a: "Oferecemos importação via CSV com template padronizado. Integrações diretas (TOTVS, SAP, sistemas proprietários) estão disponíveis no Enterprise sob demanda.",
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
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Planos Agraas
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h1 className="mx-auto mt-5 max-w-[820px] text-[clamp(2.2rem,5.5vw,4rem)] font-medium leading-[.98] tracking-[-.035em] text-[var(--text-primary)]">
              Planos que escalam
              <br />
              com sua operação.
            </h1>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="mx-auto mt-6 max-w-[560px] text-[1.0625rem] leading-[1.75] text-[var(--text-secondary)]">
              Rastreabilidade, inteligência e conformidade — do produtor iniciante ao exportador institucional.
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
                    <p className="mt-1 text-[.75rem] leading-snug text-[var(--text-muted)]">
                      {plan.persona}
                    </p>

                    <div className="mt-5 min-h-[76px]">
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
                            <p className="mt-1 text-[.6875rem] font-semibold text-emerald-600">
                              cobrado anualmente · economize 20%
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
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Comparação completa
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Tudo que está em cada plano.
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
                  {COMPARISON_ROWS.map((section) => (
                    <Fragment key={section.category}>
                      <tr className="bg-[var(--bg)]">
                        <td
                          colSpan={5}
                          className="px-6 py-2.5 font-mono text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[var(--primary)]"
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.rows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-t border-[var(--border)] transition-colors hover:bg-[var(--surface-soft)]/50"
                        >
                          <td className="px-6 py-3.5 text-[.875rem] text-[var(--text-secondary)]">
                            {row.label}
                          </td>
                          {row.values.map((v, i) => (
                            <td
                              key={i}
                              className={`px-4 py-3.5 text-center text-[.8125rem] ${
                                PLANS[i].popular ? "bg-[var(--primary)]/[.03]" : ""
                              }`}
                            >
                              {typeof v === "boolean" ? (
                                v ? (
                                  <Check
                                    size={16}
                                    className="inline text-[var(--primary)]"
                                  />
                                ) : (
                                  <span className="text-[var(--border-strong)]">—</span>
                                )
                              ) : (
                                <span className="font-mono font-semibold text-[var(--text-primary)]">
                                  {v}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
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
            <p className="text-center font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Perguntas frequentes
            </p>
            <h2 className="mt-4 text-center text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Dúvidas comuns.
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
                className="rounded-xl border border-white/40 px-8 py-4 text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5"
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
