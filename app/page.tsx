import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicNav from "@/app/components/PublicNav";
import CounterAnimation from "@/app/components/CounterAnimation";
import ScrollReveal from "@/app/components/ScrollReveal";
import JourneySection from "@/app/components/JourneySection";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import { FileText, BarChart2, Wheat, ShoppingBag, MapPin, ArrowRight, Anchor, Ship } from "lucide-react";

type ListingRow = { id: string; title: string; listing_type: string; price_per_unit: number; unit: string; location_city: string | null; location_state: string | null; halal_certified: boolean; score_agraas: number | null };
const TYPE_LABEL: Record<string, string> = { animal: "Animal", safra: "Safra", insumo: "Insumo", maquinario: "Maquinário", equipamento: "Equipamento" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Unsplash CDN — fotos reais de agro brasileiro (substituir por fotos FSJBE quando disponíveis)
const IMG = {
  hero: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1600&q=80&auto=format", // Nelore em pasto verde
  nelore: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1d?w=800&q=80&auto=format", // Close-up boi
  pasto: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80&auto=format", // Pasto ao pôr do sol
  soja: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80&auto=format", // Plantação soja
  porto: "https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=800&q=80&auto=format", // Navio cargueiro
};

export default async function LandingPage() {
  const db = createSupabaseServiceClient();
  const { data: listings } = await db.from("marketplace_listings").select("id, title, listing_type, price_per_unit, unit, location_city, location_state, halal_certified, score_agraas").eq("status", "ativo").order("created_at", { ascending: false }).limit(6);
  const mkItems = (listings ?? []) as ListingRow[];

  return (
    <div className="min-h-screen">
      <PublicNav />

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — foto fullscreen com overlay verde
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] overflow-hidden bg-[#1a3a12]">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={IMG.hero} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a3a12]/95 via-[#1a3a12]/80 to-[#1a3a12]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a3a12] via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[90vh] max-w-[1200px] items-center px-6">
          <div className="max-w-[640px] py-20">
            <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#7bc55e]">
              Plataforma Agraas
            </p>

            <h1 className="mt-6 text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[.96] tracking-[-.04em] text-white">
              Do pasto brasileiro à mesa do mundo.
            </h1>

            <p className="mt-8 max-w-[480px] text-[1.0625rem] leading-[1.8] text-white/60">
              Rastreabilidade individual verificada, certificação Halal e o maior marketplace de animais, safras e insumos do agronegócio brasileiro.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/marketplace"
                className="group flex items-center gap-2.5 rounded-lg bg-white px-7 py-4 text-[.9375rem] font-semibold text-[#1a3a12] shadow-[0_4px_24px_rgba(0,0,0,.15)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,.2)]">
                Explorar Marketplace <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/login"
                className="rounded-lg border border-white/20 px-7 py-4 text-[.9375rem] font-medium text-white/80 transition-all duration-200 hover:border-white/40 hover:text-white">
                Acessar plataforma
              </Link>
            </div>

            {/* Stats inline */}
            <div className="mt-16 flex flex-wrap gap-10">
              {[
                { end: 2300, s: "", l: "cabeças rastreadas" },
                { end: 100, s: "%", l: "certificação Halal" },
                { end: 4, s: "", l: "score engines" },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-[2rem] font-semibold leading-none text-white">
                    <CounterAnimation end={s.end} suffix={s.s} />
                  </p>
                  <p className="mt-1.5 text-[.75rem] text-white/40">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          WHAT WE DO — foto à direita, texto à esquerda
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-0 lg:grid-cols-2">
          {/* Text */}
          <div className="flex flex-col justify-center px-6 py-20 lg:pr-16 lg:py-28">
            <ScrollReveal>
              <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">A plataforma</p>
              <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.15] tracking-[-.03em] text-[#1a2e15]">
                Cada animal tem identidade.<br />Cada safra tem origem.
              </h2>
              <p className="mt-6 text-[.9375rem] leading-[1.85] text-[#4b5a47]">
                Passaporte digital, score de qualidade em 5 dimensões, certificação Halal verificada e rastreabilidade completa — do nascimento ao embarque, da fazenda ao comprador.
              </p>
            </ScrollReveal>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {[
                { Icon: FileText, t: "Passaporte Digital", s: "ID único por animal com histórico completo" },
                { Icon: BarChart2, t: "Score Agraas", s: "Algoritmo em 5 dimensões por animal" },
                { Icon: Wheat, t: "Grain ID", s: "Soja, milho e trigo rastreados por talhão" },
                { Icon: ShoppingBag, t: "Marketplace", s: "Compre e venda com dados verificados" },
              ].map((c, i) => (
                <ScrollReveal key={c.t} delay={i * 80}>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f4e2]">
                      <c.Icon size={18} className="text-[#5d9c44]" />
                    </div>
                    <div>
                      <p className="text-[.875rem] font-semibold text-[#1a2e15]">{c.t}</p>
                      <p className="mt-0.5 text-[.8125rem] leading-[1.6] text-[#788473]">{c.s}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative min-h-[400px] lg:min-h-0">
            <img src={IMG.nelore} alt="Gado Nelore no pasto" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          IMPACT QUOTE — fullscreen com foto de fundo
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.pasto} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#1a3a12]/85" />
        </div>
        <div className="relative mx-auto max-w-[900px] px-6 py-28 text-center lg:py-36">
          <ScrollReveal>
            <p className="text-[clamp(1.4rem,3.5vw,2.4rem)] font-medium leading-[1.35] tracking-[-.02em] text-white">
              &ldquo;O Brasil é o maior exportador de carne bovina certificada Halal do mundo. A Agraas é a infraestrutura que faltava para provar isso ao comprador.&rdquo;
            </p>
            <div className="mx-auto mt-8 h-px w-12 bg-[#5d9c44]" />
            <p className="mt-6 text-[.8125rem] font-medium text-white/50">
              2.300 cabeças rastreadas · Jandaia, Goiás · Lote Halal confirmado Q2 2026
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          JOURNEY (scrollytelling component)
      ══════════════════════════════════════════════════════════════════════ */}
      <JourneySection />

      {/* ══════════════════════════════════════════════════════════════════════
          DO CAMPO AO MUNDO — rota visual com fotos
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#f4f7f2]">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-28">
          <ScrollReveal>
            <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">Origem e destino</p>
            <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.15] tracking-[-.03em] text-[#1a2e15]">
              Do campo brasileiro ao comprador internacional.
            </h2>
          </ScrollReveal>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {/* Card 1 — Origem */}
            <ScrollReveal>
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="relative h-52 overflow-hidden">
                  <img src={IMG.pasto} alt="Fazenda em Goiás" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-md bg-white/90 px-3 py-1 text-[.6875rem] font-semibold text-[#1a3a12] backdrop-blur-sm">Origem</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-[.75rem] text-[#788473]"><MapPin size={12} /> Jandaia, Goiás</div>
                  <h3 className="mt-2 text-[1rem] font-semibold text-[#1a2e15]">Fazenda São João da Boa Esperança</h3>
                  <p className="mt-2 text-[.8125rem] leading-[1.7] text-[#788473]">2.300 cabeças Nelore. Passaporte digital ativo. Certificação MAPA, GTA e Halal verificadas por animal.</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 2 — Embarque */}
            <ScrollReveal delay={100}>
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="relative h-52 overflow-hidden">
                  <img src={IMG.porto} alt="Porto de Santos" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-md bg-white/90 px-3 py-1 text-[.6875rem] font-semibold text-[#1a3a12] backdrop-blur-sm">Embarque</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-[.75rem] text-[#788473]"><Anchor size={12} /> Porto de Santos, SP</div>
                  <h3 className="mt-2 text-[1rem] font-semibold text-[#1a2e15]">Rastreio em 7 checkpoints</h3>
                  <p className="mt-2 text-[.8125rem] leading-[1.7] text-[#788473]">Fazenda → concentração → transporte → porto origem → navio → porto destino → entrega. Cada etapa documentada.</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 3 — Destino */}
            <ScrollReveal delay={200}>
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <div className="relative h-52 overflow-hidden bg-[#1a3a12] flex items-center justify-center">
                  <HalalBadgeSVG size={100} />
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-md bg-white/90 px-3 py-1 text-[.6875rem] font-semibold text-[#1a3a12] backdrop-blur-sm">Destino</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-[.75rem] text-[#788473]"><Ship size={12} /> Jeddah, Arábia Saudita</div>
                  <h3 className="mt-2 text-[1rem] font-semibold text-[#1a2e15]">Conformidade Halal verificável</h3>
                  <p className="mt-2 text-[.8125rem] leading-[1.7] text-[#788473]">O comprador acessa o passaporte digital por QR code e verifica a origem, o score e cada certificação do animal.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Route line */}
          <ScrollReveal delay={300}>
            <div className="mx-auto mt-12 flex max-w-[600px] items-center gap-3">
              <span className="text-[.75rem] font-semibold text-[#5d9c44]">Goiás</span>
              <div className="h-px flex-1 bg-gradient-to-r from-[#5d9c44] to-[#5d9c44]/20" />
              <span className="text-[.75rem] text-[#788473]">Santos</span>
              <div className="h-px flex-1 bg-gradient-to-r from-[#5d9c44]/20 via-[#5d9c44]/40 to-[#5d9c44]" />
              <span className="text-[.75rem] font-semibold text-[#5d9c44]">Jeddah</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          AGRICULTURE — foto à esquerda
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-0 lg:grid-cols-2">
          <div className="relative min-h-[400px] lg:min-h-0">
            <img src={IMG.soja} alt="Plantação de soja" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-center px-6 py-20 lg:pl-16 lg:py-28">
            <ScrollReveal>
              <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">Agricultura</p>
              <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.15] tracking-[-.03em] text-[#1a2e15]">
                Soja, milho, trigo, cana e café — da fazenda ao navio.
              </h2>
              <p className="mt-6 text-[.9375rem] leading-[1.85] text-[#4b5a47]">
                Cada talhão georeferenciado com CAR verificado. Cada embarque documentado com BL, certificado fitossanitário e laudo de qualidade. Rastreabilidade em 7 etapas.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {["Grain ID", "Laudo de qualidade", "BL verificado", "CAR ativo", "EUDR ready"].map(b => (
                  <span key={b} className="rounded-md border border-[#d4e8c8] bg-[#e8f4e2] px-3 py-1.5 text-[.75rem] font-medium text-[#3d762c]">{b}</span>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          MARKETPLACE PREVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {mkItems.length > 0 && (
        <section className="bg-[#f4f7f2]">
          <div className="mx-auto max-w-[1200px] px-6 py-24">
            <ScrollReveal>
              <p className="font-mono text-[.6875rem] font-medium uppercase tracking-[.2em] text-[#5d9c44]">Marketplace</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.15] tracking-[-.03em] text-[#1a2e15]">
                  Anúncios ativos agora.
                </h2>
                <Link href="/marketplace" className="group flex items-center gap-2 text-[.875rem] font-medium text-[#5d9c44] hover:underline">
                  Ver todos <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </ScrollReveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mkItems.map((l, i) => (
                <ScrollReveal key={l.id} delay={i * 60}>
                  <Link href="/marketplace" className="group block rounded-xl border border-[#e2ead8] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-[#e8f4e2] px-2.5 py-1 text-[.6875rem] font-semibold text-[#3d762c]">
                        {TYPE_LABEL[l.listing_type] ?? l.listing_type}
                      </span>
                      <div className="flex items-center gap-2">
                        {l.halal_certified && <HalalBadgeSVG size={20} />}
                        {l.score_agraas != null && (
                          <span className="rounded-md bg-[#e8f4e2] px-2 py-0.5 text-[.6875rem] font-bold text-[#3d762c]">{l.score_agraas}</span>
                        )}
                      </div>
                    </div>
                    <h4 className="mt-4 text-[.9375rem] font-semibold leading-snug text-[#1a2e15] line-clamp-2 group-hover:text-[#3d762c]">{l.title}</h4>
                    <p className="mt-3 text-[1.125rem] font-semibold text-[#3d762c]">
                      {fmt(l.price_per_unit)}<span className="ml-1 text-[.75rem] font-normal text-[#788473]">/{l.unit}</span>
                    </p>
                    {l.location_city && (
                      <div className="mt-2 flex items-center gap-1.5 text-[.75rem] text-[#788473]">
                        <MapPin size={11} />{l.location_city}-{l.location_state}
                      </div>
                    )}
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CTA FINAL — foto de fundo
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.hero} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#1a3a12]/90" />
        </div>
        <div className="relative mx-auto max-w-[800px] px-6 py-28 text-center lg:py-36">
          <ScrollReveal>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.1] tracking-[-.03em] text-white">
              Faça parte do ecossistema.
            </h2>
            <p className="mx-auto mt-5 max-w-[440px] text-[1rem] leading-[1.75] text-white/50">
              Fazendeiro, comprador, fornecedor ou parceiro — a infraestrutura do agronegócio brasileiro está aqui.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/cadastro"
                className="group flex items-center gap-2.5 rounded-lg bg-white px-8 py-4 text-[.9375rem] font-semibold text-[#1a3a12] shadow-lg transition-all duration-300 hover:shadow-xl">
                Criar conta gratuitamente <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="mailto:contato@agraas.com.br"
                className="rounded-lg border border-white/20 px-8 py-4 text-[.9375rem] font-medium text-white/70 transition hover:border-white/40 hover:text-white">
                Fale com a gente
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#0a1a08]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 sm:grid-cols-4">
          <div>
            <p className="text-[1.1rem] font-semibold tracking-[-.03em] text-white">Agraas</p>
            <p className="mt-3 text-[.8125rem] leading-[1.7] text-white/25">Infraestrutura digital do agronegócio brasileiro.</p>
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
        <div className="mx-auto max-w-[1200px] border-t border-white/[.06] px-6 py-6">
          <p className="text-[.75rem] text-white/15">© 2026 Agraas Agritech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
