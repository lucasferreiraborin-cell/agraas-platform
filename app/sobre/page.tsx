import Link from "next/link";
import PublicNav from "@/app/components/PublicNav";
import ScrollReveal from "@/app/components/ScrollReveal";
import { Shield, Zap, Globe } from "lucide-react";

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <section className="mx-auto max-w-3xl px-6 py-24">
        <ScrollReveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">A empresa</p>
          <h1 className="mt-3 text-[2.5rem] font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">Por que a Agraas existe</h1>
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <div className="mt-10 space-y-6 text-[15px] leading-8 text-[var(--text-secondary)]">
            <p>O Brasil produz e exporta mais carne bovina certificada Halal do que qualquer outro pais do mundo. Ainda assim, quem compra essa carne em Riad, Dubai ou Abu Dhabi nao consegue saber de qual fazenda ela veio, como o animal foi criado ou se o processo Halal foi respeitado em cada etapa.</p>
            <p>Essa lacuna nao e tecnica. E uma escolha que ninguem havia feito ainda. A Agraas existe para fazer essa escolha — e entregar a infraestrutura que transforma dados operacionais de fazendas em confianca verificavel.</p>
          </div>
        </ScrollReveal>
      </section>

      <section className="bg-[var(--bg)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <h2 className="text-center text-[2rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">No que acreditamos</h2>
          </ScrollReveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { Icon: Shield, title: "Transparencia e vantagem competitiva", text: "O fazendeiro que documenta sua operacao acessa mercados melhores, negocia precos maiores e obtem credito rural com menos burocracia. Dados nao sao custo — sao ativo." },
              { Icon: Zap, title: "O campo merece tecnologia de primeiro nivel", text: "A complexidade do agronegocio brasileiro exige ferramentas a altura. A Agraas foi construida com a mesma atencao tecnica de qualquer produto de tecnologia de ponta." },
              { Icon: Globe, title: "Dados geram soberania", text: "Quando o Brasil documenta sua cadeia produtiva, ele negocia em posicao de forca com compradores institucionais de qualquer parte do mundo." },
            ].map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 100}>
                <div className="rounded-2xl border-l-[3px] border-l-[var(--primary)] bg-white p-6 shadow-sm">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                    <p.Icon size={18} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold text-[var(--text-primary)]">{p.title}</h3>
                  <p className="mt-3 text-[13px] leading-7 text-[var(--text-secondary)]">{p.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#3d762c_0%,#294f1d_100%)] px-6 py-20 text-center">
        <ScrollReveal>
          <p className="mx-auto max-w-2xl text-[1.6rem] font-bold leading-10 text-white">
            &ldquo;Ser a infraestrutura digital do agronegocio brasileiro — da fazenda a mesa, do Brasil ao mundo.&rdquo;
          </p>
        </ScrollReveal>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <ScrollReveal>
          <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">A empresa</h2>
          <div className="mt-8 space-y-5 text-[15px] leading-8 text-[var(--text-secondary)]">
            <p>A Agraas foi fundada em 2025 em Sao Paulo por um time com raizes no mercado financeiro e no agronegocio goiano. A plataforma foi construida do zero e esta em operacao com o primeiro cliente ativo em Jandaia, Goias.</p>
            <p>Estamos em processo de captacao para escalar a operacao em todo o Brasil.</p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/cadastro" className="rounded-2xl bg-[var(--primary)] px-8 py-3.5 text-[14px] font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] transition">Criar conta</Link>
            <a href="mailto:contato@agraas.com.br" className="rounded-2xl border border-[var(--border)] px-8 py-3.5 text-[14px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition">contato@agraas.com.br</a>
          </div>
        </ScrollReveal>
      </section>

      <footer className="bg-[#111827] px-6 py-14">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-[14px] text-gray-500">
            <Link href="/marketplace" className="hover:text-white transition">Marketplace</Link>
            <Link href="/planos" className="hover:text-white transition">Planos</Link>
            <Link href="/" className="hover:text-white transition">Home</Link>
          </div>
          <p className="text-[12px] text-gray-600">2026 Agraas Agritech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
