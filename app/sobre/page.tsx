import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/app/components/ui/PublicShell";
import HeroParallaxImage from "@/app/components/ui/HeroParallaxImage";
import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";
import { Shield, Zap, Globe, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre nós",
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
        <HeroParallaxImage src={IMG.hero} alt="" intensity={0.2} />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(110deg, var(--sidebar-2) 0%, rgba(15,53,23,.82) 45%, rgba(15,53,23,.35) 100%)",
          }}
        />

        <div className="mx-auto max-w-[1200px] px-6 py-28 lg:px-10 lg:py-36">
          <FadeIn>
            <h1 className="max-w-[880px] text-[clamp(2.2rem,5.2vw,4rem)] font-medium leading-[1] tracking-[-.03em] text-white">
              A empresa que está construindo a infraestrutura digital do agro brasileiro.
            </h1>
          </FadeIn>
        </div>
      </section>

      {/* ═══ POR QUE EXISTIMOS ══════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[760px] px-6 py-24 lg:py-32">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
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
            <h2 className="mx-auto max-w-[720px] text-center text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
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
        <Image
          src={IMG.manifest}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          quality={78}
          className="absolute inset-0 -z-10 object-cover"
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
            <p className="mx-auto max-w-[720px] text-[clamp(1.4rem,3vw,2.2rem)] font-medium leading-[1.35] tracking-[-.015em] text-white">
              &ldquo;Ser a infraestrutura digital do agronegócio brasileiro — da fazenda à mesa, do Brasil ao mundo.&rdquo;
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══ A EMPRESA ══════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[760px] px-6 py-24 lg:py-32">
          <FadeIn>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
              Fundada em 2025. Em operação no campo.
            </h2>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-8 space-y-5 text-[1.0625rem] leading-[1.85] text-[var(--text-secondary)]">
              <p>
                A Agraas foi fundada em 2025 em São Paulo por um time com raízes no mercado financeiro e no agronegócio goiano. A plataforma foi construída do zero e está em operação como piloto em Jussara, Goiás — uma fazenda de cria com rebanho Nelore sendo digitalmente rastreada com passaporte individual, score em tempo real e infraestrutura de exportação ativa.
              </p>
              <p>Estamos em processo de captação para escalar a operação em todo o Brasil.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ A PLATAFORMA EM NÚMEROS ═══════════════════════════════════════ */}
      <section className="border-y border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-16 lg:px-10 lg:py-20">
          <FadeIn>
            <h2 className="text-[clamp(1.4rem,2.8vw,1.8rem)] font-medium leading-[1.2] tracking-[-.015em] text-[var(--text-primary)]">
              A plataforma em números
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "82",  label: "módulos operacionais" },
              { value: "104", label: "migrations aplicadas" },
              { value: "56",  label: "tabelas no banco" },
              { value: "0",   label: "bugs críticos abertos" },
            ].map((m, i) => (
              <FadeIn key={m.label} delay={0.1 + i * 0.06}>
                <div>
                  <p className="text-[2.2rem] font-semibold leading-none tracking-[-.025em] text-[var(--text-primary)]">
                    {m.value}
                  </p>
                  <p className="mt-3 text-[.875rem] text-[var(--text-muted)]">
                    {m.label}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TIME — 5 fundadores reais ═══════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
          <div className="max-w-[720px]">
            <FadeIn>
              <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                Quem está construindo a Agraas.
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-5 max-w-[620px] text-[1rem] leading-[1.75] text-[var(--text-secondary)]">
                Cinco co-founders com background em mercado financeiro, engenharia de software, agronegócio goiano, comércio exterior e genética bovina.
              </p>
            </FadeIn>
          </div>

          <StaggerContainer
            className="mt-12 grid gap-5 md:grid-cols-3"
            staggerChildren={0.08}
          >
            {[
              { name: "Lucas Ferreira Borin", initials: "LF", role: "CEO e Co-founder" },
              { name: "Eduardo de Paola",     initials: "EP", role: "Co-founder" },
              { name: "Pedro Salim",          initials: "PS", role: "Co-founder" },
              { name: "Pedro Maluli",         initials: "PM", role: "Co-founder" },
              { name: "Frederico Maluli",     initials: "FM", role: "Co-founder" },
            ].map((p) => (
              <StaggerItem key={p.name}>
                <div className="flex h-full items-center gap-5 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--primary)]/25">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, var(--sidebar-2) 100%)",
                    }}
                  >
                    <span className="text-[1rem] font-semibold tracking-[-.01em]">
                      {p.initials}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[1rem] font-semibold leading-[1.25] tracking-[-.01em] text-[var(--text-primary)]">
                      {p.name}
                    </p>
                    <p className="mt-1.5 text-[.8125rem] text-[var(--text-muted)]">
                      {p.role}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══ CTA FINAL ══════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[760px] px-6 py-20 lg:py-24">
          <FadeIn>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1.15] tracking-[-.02em] text-[var(--text-primary)]">
              Vamos construir junto.
            </h2>
            <p className="mt-4 max-w-[520px] text-[1rem] leading-[1.75] text-[var(--text-muted)]">
              Fazendeiro, comprador, fornecedor, parceiro ou investidor — a porta está aberta.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/cadastro"
                className="group inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-[14px] text-[.9375rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)]"
              >
                Criar conta
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="mailto:contato@agraas.com.br"
                className="rounded-xl border border-[var(--border-strong)] bg-white px-7 py-[14px] text-[.9375rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
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
