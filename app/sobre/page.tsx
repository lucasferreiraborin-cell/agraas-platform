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
                A Agraas foi fundada em 2025 em São Paulo por um time com raízes no mercado financeiro e no agronegócio goiano. A plataforma foi construída do zero e está em operação como piloto em Jussara, Goiás — uma fazenda de cria com rebanho Nelore sendo digitalmente rastreada com passaporte individual, score em formação e roadmap de conformidade em execução.
              </p>
              <p>Estamos em processo de captação para escalar a operação em todo o Brasil.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ TIME (placeholder editorial enquanto fotos/bios não estão prontas) ══ */}
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
                Um time enxuto com background em mercado financeiro, engenharia de software, agronegócio goiano e comércio exterior. As fotos e bios completas chegam em breve — quer conhecer antes? Fale direto.
              </p>
            </FadeIn>
          </div>

          <StaggerContainer
            className="mt-14 grid gap-5 md:grid-cols-3"
            staggerChildren={0.08}
          >
            {[
              { role: "Fundação & produto",       focus: "Plataforma, engenharia, visão" },
              { role: "Operações & agronegócio",  focus: "Relacionamento com fazendas, compliance, cadeia" },
              { role: "Captação & estratégia",    focus: "Rodada, parceiros, expansão comercial" },
            ].map((slot, i) => (
              <StaggerItem key={slot.role}>
                <div className="h-full rounded-2xl border border-[var(--border)] bg-white p-7 shadow-[var(--shadow-soft)]">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                    style={{
                      background: [
                        "linear-gradient(135deg, #2E8B3E 0%, #1E5E26 100%)",
                        "linear-gradient(135deg, #3DA54C 0%, #2E8B3E 100%)",
                        "linear-gradient(135deg, #1E5E26 0%, #0f3517 100%)",
                      ][i],
                    }}
                  >
                    <span className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.14em] opacity-80">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-5 text-[1.0625rem] font-semibold text-[var(--text-primary)]">
                    {slot.role}
                  </p>
                  <p className="mt-2 text-[.875rem] leading-[1.7] text-[var(--text-muted)]">
                    {slot.focus}
                  </p>
                  <p className="mt-6 text-[.75rem] font-medium text-[var(--text-muted)]">
                    Bio em preparação
                  </p>
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
