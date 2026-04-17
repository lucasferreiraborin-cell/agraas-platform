import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicNav from "@/app/components/PublicNav";
import CounterAnimation from "@/app/components/CounterAnimation";
import ScrollReveal from "@/app/components/ScrollReveal";
import JourneySection from "@/app/components/JourneySection";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import { FileText, BarChart2, Wheat, ShoppingBag, MapPin, ArrowRight } from "lucide-react";

type ListingRow = { id: string; title: string; listing_type: string; price_per_unit: number; unit: string; location_city: string | null; location_state: string | null; halal_certified: boolean; score_agraas: number | null };
const TYPE_LABEL: Record<string, string> = { animal: "Animal", safra: "Safra", insumo: "Insumo", maquinario: "Maquinário", equipamento: "Equipamento" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default async function LandingPage() {
  const db = createSupabaseServiceClient();
  const { data: listings } = await db.from("marketplace_listings").select("id, title, listing_type, price_per_unit, unit, location_city, location_state, halal_certified, score_agraas").eq("status", "ativo").order("created_at", { ascending: false }).limit(6);
  const mkItems = (listings ?? []) as ListingRow[];

  return (
    <div className="min-h-screen bg-[#071a0e]">
      <PublicNav />

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: "linear-gradient(hsla(0,0%,100%,.03) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.03) 1px, transparent 1px)",
          backgroundSize: "5rem 5rem",
        }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(93,156,68,.12),transparent)]" />

        <div className="relative mx-auto max-w-[1200px] px-6 pb-24 pt-[clamp(5rem,10vw,8rem)]">
          <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">
            Plataforma Agraas
          </p>

          <h1 className="mt-6 max-w-[900px] text-[clamp(2.5rem,6.5vw,5.2rem)] font-medium leading-[.94] tracking-[-.04em] text-white">
            Rastreabilidade do<br />campo ao mundo.
          </h1>

          <p className="mt-8 max-w-[500px] text-[1.0625rem] leading-[1.75] text-white/40">
            Certificação Halal verificada, score de qualidade por animal e o maior marketplace de animais, safras e insumos do Brasil.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/marketplace"
              className="group flex items-center gap-2.5 rounded-lg bg-white px-6 py-3.5 text-[.875rem] font-semibold text-[#071a0e] shadow-[0_4px_24px_rgba(255,255,255,.08)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(255,255,255,.12)]">
              Explorar Marketplace <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login"
              className="rounded-lg border border-white/[.15] px-6 py-3.5 text-[.875rem] font-medium text-white/70 transition-all duration-200 hover:border-white/30 hover:text-white">
              Acessar plataforma
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[.06] bg-white/[.06] sm:grid-cols-4">
            {[
              { end: 2300, label: "cabeças rastreadas", suffix: "" },
              { end: 78, label: "módulos da plataforma", suffix: "" },
              { end: 4, label: "score engines", suffix: "" },
              { end: 100, label: "certificação Halal", suffix: "%" },
            ].map((s, i) => (
              <div key={i} className="bg-[#071a0e] px-6 py-6">
                <p className="font-mono text-[1.75rem] font-medium leading-none text-white">
                  <CounterAnimation end={s.end} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-[.75rem] text-white/35">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CAPABILITIES ══════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/[.04] bg-[#091f10]">
        <div className="mx-auto max-w-[1200px] px-6 py-[clamp(5rem,10vw,8rem)]">
          <ScrollReveal>
            <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">A plataforma</p>
            <h2 className="mt-4 max-w-[700px] text-[clamp(1.6rem,3vw,2.4rem)] font-medium leading-[1.15] tracking-[-.03em] text-white">
              Quatro camadas de inteligência para o agronegócio brasileiro.
            </h2>
          </ScrollReveal>

          <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-white/[.06] bg-white/[.06] sm:grid-cols-2">
            {[
              { Icon: FileText, title: "Passaporte Digital", text: "ID único por animal com histórico sanitário, nutricional e de conformidade Halal." },
              { Icon: BarChart2, title: "Score Agraas", text: "Algoritmo em 5 dimensões. O score é a moeda de precificação no marketplace." },
              { Icon: Wheat, title: "Grain ID", text: "Soja, milho e trigo rastreados da fazenda ao navio em 7 etapas documentadas." },
              { Icon: ShoppingBag, title: "Marketplace", text: "Compre e venda com dados verificados. NF-e automática. Score integrado." },
            ].map((c, i) => (
              <ScrollReveal key={c.title} delay={i * 80}>
                <div className="group flex gap-5 bg-[#091f10] p-8 transition-colors duration-300 hover:bg-white/[.02]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.03]">
                    <c.Icon size={18} className="text-[#5d9c44]" />
                  </div>
                  <div>
                    <h3 className="text-[.9375rem] font-medium text-white">{c.title}</h3>
                    <p className="mt-2 text-[.8125rem] leading-[1.7] text-white/35">{c.text}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ JOURNEY ═══════════════════════════════════════════════════════════ */}
      <JourneySection />

      {/* ══ MARKETPLACE ═══════════════════════════════════════════════════════ */}
      {mkItems.length > 0 && (
        <section className="relative border-t border-white/[.04] bg-[#091f10]">
          <div className="mx-auto max-w-[1200px] px-6 py-[clamp(5rem,10vw,8rem)]">
            <ScrollReveal>
              <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">Marketplace</p>
              <h2 className="mt-4 max-w-[600px] text-[clamp(1.6rem,3vw,2.4rem)] font-medium leading-[1.15] tracking-[-.03em] text-white">
                Animais, safras e insumos com dados verificados.
              </h2>
            </ScrollReveal>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mkItems.map((l, i) => (
                <ScrollReveal key={l.id} delay={i * 60}>
                  <Link href="/marketplace" className="group block rounded-xl border border-white/[.06] bg-white/[.02] p-6 transition-all duration-300 hover:border-white/[.12] hover:bg-white/[.04]">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-[#5d9c44]/10 px-2.5 py-1 text-[.6875rem] font-semibold text-[#5d9c44]">
                        {TYPE_LABEL[l.listing_type] ?? l.listing_type}
                      </span>
                      <div className="flex items-center gap-2">
                        {l.halal_certified && <HalalBadgeSVG size={20} />}
                        {l.score_agraas != null && (
                          <span className="font-mono text-[.6875rem] font-semibold text-white/40">{l.score_agraas}</span>
                        )}
                      </div>
                    </div>
                    <h4 className="mt-4 text-[.9375rem] font-medium leading-snug text-white/80 line-clamp-2 transition-colors group-hover:text-white">{l.title}</h4>
                    <p className="mt-3 text-[1.125rem] font-semibold text-white">
                      {fmt(l.price_per_unit)}<span className="ml-1 text-[.75rem] font-normal text-white/30">/{l.unit}</span>
                    </p>
                    {l.location_city && (
                      <div className="mt-3 flex items-center gap-1.5 text-[.75rem] text-white/25">
                        <MapPin size={11} />{l.location_city}-{l.location_state}
                      </div>
                    )}
                  </Link>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={400}>
              <div className="mt-12 text-center">
                <Link href="/marketplace"
                  className="group inline-flex items-center gap-2 rounded-lg border border-white/[.12] px-6 py-3 text-[.875rem] font-medium text-white/60 transition-all duration-200 hover:border-white/25 hover:text-white">
                  Ver todos os anúncios <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ══ SOCIAL PROOF ══════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/[.04]">
        <div className="mx-auto max-w-[1200px] px-6 py-[clamp(5rem,10vw,8rem)]">
          <ScrollReveal>
            <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">Em operação</p>
            <h2 className="mt-4 max-w-[600px] text-[clamp(1.6rem,3vw,2.4rem)] font-medium leading-[1.15] tracking-[-.03em] text-white">
              Já no campo.
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="mt-12 rounded-xl border border-white/[.06] bg-white/[.02] p-8 lg:p-12">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-lg">
                  <h3 className="text-[1.25rem] font-medium text-white">Fazenda São João da Boa Esperança</h3>
                  <div className="mt-2 flex items-center gap-2 text-[.875rem] text-white/40">
                    <MapPin size={13} />Jandaia, Goiás
                  </div>
                  <p className="mt-5 text-[.9375rem] leading-[1.8] text-white/35">
                    Primeira fazenda com Passaporte Agraas ativo e lote certificado Halal para exportação à Arábia Saudita. Segundo trimestre de 2026.
                  </p>
                </div>
                <HalalBadgeSVG size={56} />
              </div>

              <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[.06] bg-white/[.06] sm:grid-cols-4">
                {[
                  { v: "2.300", l: "cabeças" }, { v: "Nelore", l: "raça" },
                  { v: "Halal", l: "certificado" }, { v: "Q2 2026", l: "embarque" },
                ].map(m => (
                  <div key={m.l} className="bg-[#071a0e] p-5 text-center">
                    <p className="text-[1.125rem] font-medium text-white">{m.v}</p>
                    <p className="mt-1 text-[.6875rem] text-white/30">{m.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-white/[.04]">
        <div className="mx-auto max-w-[1200px] px-6 py-[clamp(5rem,12vw,10rem)] text-center">
          <ScrollReveal>
            <h2 className="mx-auto max-w-[600px] text-[clamp(1.8rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-.03em] text-white">
              Faça parte do ecossistema.
            </h2>
            <p className="mx-auto mt-5 max-w-[400px] text-[1rem] leading-[1.7] text-white/35">
              Fazendeiro, comprador, fornecedor ou parceiro — há um lugar para você.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/cadastro"
                className="group flex items-center gap-2.5 rounded-lg bg-[#5d9c44] px-7 py-3.5 text-[.875rem] font-semibold text-white shadow-[0_4px_20px_rgba(93,156,68,.3)] transition-all duration-300 hover:bg-[#4f8a38] hover:shadow-[0_8px_32px_rgba(93,156,68,.4)]">
                Criar conta gratuitamente <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="mailto:contato@agraas.com.br"
                className="rounded-lg border border-white/[.12] px-7 py-3.5 text-[.875rem] font-medium text-white/50 transition-all duration-200 hover:border-white/25 hover:text-white">
                Fale com a gente
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[.04] bg-[#050f08]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 sm:grid-cols-4">
          <div>
            <p className="text-[1.1rem] font-semibold tracking-[-.03em] text-white">Agraas</p>
            <p className="mt-3 text-[.8125rem] leading-[1.7] text-white/25">
              Infraestrutura digital do agronegócio brasileiro.
            </p>
          </div>
          <div>
            <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.15em] text-white/20">Plataforma</p>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/marketplace" className="text-[.875rem] text-white/40 transition hover:text-white">Marketplace</Link>
              <Link href="/planos" className="text-[.875rem] text-white/40 transition hover:text-white">Planos</Link>
              <Link href="/login" className="text-[.875rem] text-white/40 transition hover:text-white">Login</Link>
            </div>
          </div>
          <div>
            <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.15em] text-white/20">Empresa</p>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/sobre" className="text-[.875rem] text-white/40 transition hover:text-white">Sobre</Link>
              <a href="mailto:contato@agraas.com.br" className="text-[.875rem] text-white/40 transition hover:text-white">Contato</a>
            </div>
          </div>
          <div>
            <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.15em] text-white/20">Legal</p>
            <div className="mt-4 flex flex-col gap-3">
              <span className="text-[.875rem] text-white/20">Privacidade</span>
              <span className="text-[.875rem] text-white/20">Termos</span>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1200px] border-t border-white/[.04] px-6 py-6">
          <p className="text-[.75rem] text-white/15">© 2026 Agraas Agritech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
