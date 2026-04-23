import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/app/components/ui/PublicShell";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";
import { Shield, Zap, Globe, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre a Agraas",
  description:
    "Fundada em 2025 em São Paulo. A Agraas é a infraestrutura digital do agronegócio brasileiro — do pasto ao porto, com o primeiro cliente ativo em Jussara, Goiás.",
};

const IMG = {
  hero:     "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1920&q=85&auto=format",
  manifest: "/images/lp/Maquina-agricola-colheita.jpg",
};

const BELIEFS = [
  {
    Icon: Shield,
    title: "Transparência é vantagem competitiva",
    text: "O fazendeiro que documenta sua operação acessa mercados melhores, negocia preços maiores e obtém crédito rural com menos burocracia. Dados não são custo — são ativo.",
  },
  {
    Icon: Zap,
    title: "O campo merece tecnologia de primeiro nível",
    text: "A complexidade do agronegócio brasileiro exige ferramentas à altura. A Agraas foi construída com a mesma atenção técnica de qualquer produto de tecnologia de ponta.",
  },
  {
    Icon: Globe,
    title: "Dados geram soberania",
    text: "Quando o Brasil documenta sua cadeia produtiva, ele negocia em posição de força com compradores institucionais de qualquer parte do mundo.",
  },
];

export default function SobrePage() {
  return (
    <PublicShell>
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <img
          src={IMG.hero}
          alt=""
          loading="eager"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(110deg, var(--sidebar-2) 0%, rgba(15,53,23,.82) 45%, rgba(15,53,23,.35) 100%)",
          }}
        />

        <div className="mx-auto max-w-[1200px] px-6 py-28 lg:px-10 lg:py-36">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-white/70">
              A empresa
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <h1 className="mt-5 max-w-[820px] text-[clamp(2.2rem,5.5vw,4.2rem)] font-medium leading-[.98] tracking-[-.035em] text-white">
              Infraestrutura que transforma dados do campo em confiança verificável.
            </h1>
          </FadeIn>
        </div>
      </section>

      {/* ═══ POR QUE EXISTIMOS ══════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[760px] px-6 py-24 lg:py-32">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Por que existimos
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              A lacuna que ninguém tinha fechado.
            </h2>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-10 space-y-6 text-[1.0625rem] leading-[1.85] text-[var(--text-secondary)]">
              <p>
                O Brasil produz e exporta mais carne bovina certificada Halal do que qualquer outro país do mundo. Ainda assim, quem compra essa carne em Riade, Dubai ou Abu Dhabi não consegue saber de qual fazenda ela veio, como o animal foi criado ou se o processo Halal foi respeitado em cada etapa.
              </p>
              <p>
                A mesma lacuna se repete na soja que vai para Xangai, no café que chega a Hamburgo, no milho que abastece Rotterdam. Não é um problema técnico. É uma escolha que ninguém tinha feito.
              </p>
              <p className="text-[var(--text-primary)]">
                A Agraas existe para fazer essa escolha — e entregar a infraestrutura que transforma dados operacionais de fazendas em confiança verificável.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ BELIEFS ════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-32">
          <FadeIn>
            <p className="text-center font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              Nossas crenças
            </p>
            <h2 className="mx-auto mt-4 max-w-[720px] text-center text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              No que acreditamos.
            </h2>
          </FadeIn>

          <StaggerContainer
            className="mt-16 grid gap-6 md:grid-cols-3"
            staggerChildren={0.1}
          >
            {BELIEFS.map((b) => (
              <StaggerItem key={b.title}>
                <div className="h-full rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                    <b.Icon size={20} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="mt-6 text-[1.0625rem] font-semibold leading-[1.3] text-[var(--text-primary)]">
                    {b.title}
                  </h3>
                  <p className="mt-4 text-[.9375rem] leading-[1.75] text-[var(--text-muted)]">
                    {b.text}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══ MANIFESTO ═════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <img
          src={IMG.manifest}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, var(--sidebar) 0%, var(--sidebar-2) 100%)",
            opacity: 0.92,
          }}
        />

        <div className="mx-auto max-w-[880px] px-6 py-28 text-center lg:py-36">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-white/60">
              Nossa visão
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mx-auto mt-6 max-w-[700px] text-[clamp(1.4rem,3vw,2.2rem)] font-medium leading-[1.35] tracking-[-.015em] text-white">
              &ldquo;Ser a infraestrutura digital do agronegócio brasileiro — da fazenda à mesa, do Brasil ao mundo.&rdquo;
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ A EMPRESA ══════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[760px] px-6 py-24 lg:py-32">
          <FadeIn>
            <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
              A empresa
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Fundada em 2025. Em operação no campo.
            </h2>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-8 space-y-5 text-[1.0625rem] leading-[1.85] text-[var(--text-secondary)]">
              <p>
                A Agraas foi fundada em 2025 em São Paulo por um time com raízes no mercado financeiro e no agronegócio goiano. A plataforma foi construída do zero e está em operação com o primeiro cliente ativo em Jussara, Goiás — 2.300 cabeças de Nelore com passaporte digital individual e lote Halal confirmado para embarque em Q2 2026.
              </p>
              <p>Estamos em processo de captação para escalar a operação em todo o Brasil.</p>
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/cadastro"
                className="group inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-[14px] text-[.9375rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_20px_50px_rgba(93,156,68,.5)]"
              >
                Criar conta
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="mailto:contato@agraas.com.br"
                className="rounded-xl border border-[var(--border-strong)] px-7 py-[14px] text-[.9375rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
              >
                contato@agraas.com.br
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </PublicShell>
  );
}
