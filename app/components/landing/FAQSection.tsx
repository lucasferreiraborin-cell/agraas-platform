"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FadeIn } from "@/app/components/ui/Motion";

const FAQ = [
  {
    q: "A Agraas substitui meu ERP agrícola ou complementa?",
    a: "Substitui. A plataforma cobre toda a cadeia — rastreabilidade, operacional, financeiro (DRE, fluxo, balanço), fiscal (NF-e automática), estoque com carência MAPA, custo por animal e ROI. Quem migra reduz de 3-4 softwares para 1.",
  },
  {
    q: "Quanto tempo leva para uma fazenda começar a usar?",
    a: "Onboarding em até 72 horas para operações médias. Importação via CSV com template padronizado, cadastro de rebanho e talhões, primeiros scores calculados no mesmo dia. No Enterprise, o time Agraas faz a importação assistida.",
  },
  {
    q: "Meus dados ficam seguros e são realmente meus?",
    a: "Sim. Arquitetura em Supabase com Row Level Security — cada cliente só enxerga os próprios dados, isolamento forçado pelo banco. Backups diários. Conformidade LGPD. Exportação completa dos seus dados disponível a qualquer momento, sem amarra.",
  },
  {
    q: "Funciona offline no campo?",
    a: "Sim, via app Agraas Campo (React Native). Registros ficam localmente até a conexão voltar, quando sincronizam automaticamente. Integra com leitura RFID bolus, brincos e dispositivos de campo.",
  },
  {
    q: "O Score Agraas é auditável?",
    a: "Sim. O algoritmo avalia 5 dimensões (produtiva, sanitária, operacional, continuidade, rastreabilidade) com pesos fixos e fórmula transparente. Cada evento registrado recalcula o score em tempo real. O comprador enxerga o mesmo número que você vê.",
  },
  {
    q: "Posso integrar com sistemas que já uso?",
    a: "CSV via template em todos os planos. Integrações diretas (TOTVS, SAP, ERPs regionais, APIs proprietárias) disponíveis no Enterprise sob demanda. Webhooks nativos para receber eventos da plataforma em tempo real.",
  },
  {
    q: "Como funciona a cobrança do marketplace?",
    a: "Publicar anúncios é gratuito em todos os planos. A transação acontece direto entre comprador e vendedor com NF-e gerada automaticamente. Taxa de sucesso de 2% sobre transações fechadas pelo marketplace (pago pelo vendedor, sem surpresa no checkout).",
  },
  {
    q: "A Agraas vai além da pecuária bovina?",
    a: "O foco operacional atual é 100% bovino — onde está o piloto, o aprendizado e o time. O motor de dados foi desenhado para escalar para soja, milho, cana e demais cadeias quando o sinal de mercado pedir. Talhões georreferenciados e estrutura para documentação de embarque já estão na fundação da plataforma.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-[960px] px-6 py-24 lg:py-28">
        <div className="max-w-[720px]">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Perguntas frequentes
            </h2>
          </FadeIn>
        </div>

        <div className="mt-14 space-y-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <FadeIn key={item.q} delay={i * 0.04}>
                <div
                  className={`overflow-hidden rounded-2xl border transition-colors ${
                    isOpen
                      ? "border-[var(--primary)]/30 bg-[var(--primary)]/[.02]"
                      : "border-[var(--border)] bg-white hover:border-[var(--border-strong)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition-colors"
                  >
                    <p className="text-[1rem] font-semibold leading-[1.45] text-[var(--text-primary)] md:text-[1.0625rem]">
                      {item.q}
                    </p>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isOpen
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
                      }`}
                    >
                      <ChevronDown size={16} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-0">
                          <div className="h-px w-full bg-[var(--border)]" />
                          <p className="mt-4 text-[.9375rem] leading-[1.75] text-[var(--text-secondary)]">
                            {item.a}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn delay={0.3}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-[var(--surface-soft)] px-6 py-5 text-center">
            <span className="text-[.875rem] text-[var(--text-secondary)]">
              Ficou com mais alguma dúvida?
            </span>
            <a
              href="mailto:contato@agraas.com.br"
              className="text-[.875rem] font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
            >
              contato@agraas.com.br
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
