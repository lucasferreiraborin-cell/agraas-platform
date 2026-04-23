import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicShell from "@/app/components/ui/PublicShell";
import JourneySection from "@/app/components/JourneySection";
import ScoresSection from "@/app/components/landing/ScoresSection";
import PortosSection from "@/app/components/landing/PortosSection";
import FSJBECaseSection from "@/app/components/landing/FSJBECaseSection";
import OperationalSection from "@/app/components/landing/OperationalSection";
import HowItWorksSection from "@/app/components/landing/HowItWorksSection";
import FAQSection from "@/app/components/landing/FAQSection";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  CounterAnimation,
} from "@/app/components/ui/Motion";
import HeroParallaxImage from "@/app/components/ui/HeroParallaxImage";
import AuroraGlow from "@/app/components/ui/AuroraGlow";
import ShimmerButton from "@/app/components/ui/ShimmerButton";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import {
  FileText,
  BarChart2,
  Wheat,
  ShoppingBag,
  MapPin,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "O agro do Brasil, auditável em tempo real.",
  description:
    "Pecuária, grãos e exportação sobre uma única camada de dados verificáveis. Do pasto ao porto, do talhão ao comprador institucional.",
  alternates: { canonical: "/" },
};

type ListingRow = {
  id: string;
  title: string;
  listing_type: string;
  price_per_unit: number;
  unit: string;
  location_city: string | null;
  location_state: string | null;
  halal_certified: boolean;
  score_agraas: number | null;
};

const TYPE_LABEL: Record<string, string> = {
  animal: "Animal",
  safra: "Safra",
  insumo: "Insumo",
  maquinario: "Maquinário",
  equipamento: "Equipamento",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// ── 7 imagens distintas, zero repetição ──────────────────────────────────────
const IMG = {
  hero:       "/images/lp/rebanho-nelore.png",
  neloreClose: "https://images.unsplash.com/photo-1605185189100-4d7c8fffbad1?w=1600&q=85&auto=format",
  silos:      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1600&q=85&auto=format",
  colheita:   "/images/lp/Maquina-agricola-colheita.jpg",
  aereo:      "https://images.unsplash.com/photo-1594771804886-a933bb2d609b?w=1920&q=85&auto=format",
  porto:      "https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=1600&q=85&auto=format",
  fazenda:    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1600&q=85&auto=format",
};

export const revalidate = 300;

async function fetchLandingData() {
  const db = createSupabaseServiceClient();
  const [
    { data: listings },
    { count: animalsCount },
    { count: fieldsCount },
    { count: lotsCount },
  ] = await Promise.all([
    db
      .from("marketplace_listings")
      .select("id, title, listing_type, price_per_unit, unit, location_city, location_state, halal_certified, score_agraas")
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(6),
    db.from("animals").select("id", { count: "exact", head: true }),
    db.from("crop_fields").select("id", { count: "exact", head: true }),
    db.from("lots").select("id", { count: "exact", head: true }),
  ]);

  const mkItems = (listings ?? []) as ListingRow[];
  return {
    mkItems,
    animalsCount: animalsCount ?? 0,
    fieldsCount: fieldsCount ?? 0,
    lotsCount: lotsCount ?? 0,
  };
}

export default async function LandingPage() {
  const { mkItems, animalsCount, fieldsCount, lotsCount } = await fetchLandingData();

  return (
    <PublicShell>
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative isolate min-h-[94vh] overflow-hidden">
        <HeroParallaxImage src={IMG.hero} alt="" intensity={0.22} />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(110deg, var(--sidebar-2) 0%, rgba(15,53,23,.82) 45%, rgba(15,53,23,.35) 100%)",
          }}
        />
        <div className="absolute inset-0 -z-10 opacity-90">
          <AuroraGlow intensity="medium" />
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[var(--bg)] to-transparent" />

        <div className="mx-auto flex min-h-[94vh] max-w-[1200px] items-center px-6 lg:px-10">
          <div className="w-full max-w-[680px] py-24">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[.06] px-3.5 py-1.5 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.8)]" />
                <span className="font-mono text-[.6875rem] font-medium uppercase tracking-[.15em] text-white/80">
                  Plataforma em operação · Jussara-GO
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <h1 className="mt-7 text-[clamp(2.6rem,6.2vw,5rem)] font-medium leading-[.96] tracking-[-.04em] text-white">
                O agro do Brasil,
                <br />
                <span className="italic text-white/90">auditável em tempo real.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="mt-7 max-w-[520px] text-[1.0625rem] leading-[1.75] text-white/60">
                Pecuária, grãos e exportação sobre uma única camada de dados verificáveis. Do pasto ao porto, do talhão ao comprador institucional.
              </p>
            </FadeIn>

            <FadeIn delay={0.45}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <ShimmerButton href="/cadastro" variant="primary">
                  Começar agora
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </ShimmerButton>
                <Link
                  href="/marketplace"
                  className="rounded-xl border border-white/40 px-7 py-[14px] text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5"
                >
                  Ver marketplace
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.6}>
              <div className="mt-20 flex flex-wrap gap-12 border-t border-white/[.12] pt-8">
                {[
                  { end: animalsCount, s: "", l: "animais rastreados" },
                  { end: fieldsCount,  s: "", l: "talhões monitorados" },
                  { end: lotsCount,    s: "", l: "lotes de exportação" },
                ].map((c, i) => (
                  <div key={i}>
                    <p className="text-[2.2rem] font-semibold leading-none tracking-[-.02em] text-white">
                      <CounterAnimation value={c.end} />
                      {c.s}
                    </p>
                    <p className="mt-2 font-mono text-[.6875rem] font-medium uppercase tracking-[.14em] text-white/45">
                      {c.l}
                    </p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═══════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] lg:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-24 lg:py-32 lg:pr-20">
            <FadeIn>
              <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                O que construímos
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.08] tracking-[-.02em] text-[var(--text-primary)]">
                Cada animal tem identidade.
                <br />
                Cada safra tem origem.
              </h2>
              <p className="mt-5 max-w-[460px] text-[1rem] leading-[1.75] text-[var(--text-secondary)]">
                Passaporte digital individual, score em cinco dimensões, certificação verificada e rastreabilidade completa — do nascimento ao embarque.
              </p>
            </FadeIn>

            <StaggerContainer className="mt-12 space-y-1" staggerChildren={0.08}>
              {[
                { Icon: FileText,   t: "Passaporte Digital",  s: "ID único por animal e talhão com todo o histórico sanitário, produtivo e fiscal." },
                { Icon: BarChart2,  t: "Score Agraas",        s: "Algoritmo proprietário em 5 dimensões. Mesmo número em plataforma e passaporte público." },
                { Icon: Wheat,      t: "Grain ID",            s: "Rastreabilidade de soja, milho, trigo, cana e café do talhão ao navio em 7 etapas." },
                { Icon: ShoppingBag, t: "Marketplace Agro",   s: "Compre e venda animais, safras e insumos com dados verificados e NF-e automática." },
              ].map((c) => (
                <StaggerItem key={c.t}>
                  <div className="group flex gap-4 rounded-2xl p-4 transition hover:bg-[var(--surface-soft)]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] transition group-hover:bg-[var(--primary)]/15">
                      <c.Icon size={19} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">
                        {c.t}
                      </p>
                      <p className="mt-1 text-[.8125rem] leading-[1.7] text-[var(--text-muted)]">
                        {c.s}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          <div className="relative hidden min-h-[620px] overflow-hidden lg:block">
            <Image
              src={IMG.neloreClose}
              alt="Boiada Nelore em pasto brasileiro"
              fill
              loading="lazy"
              sizes="(min-width: 1024px) 50vw, 0px"
              quality={82}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/10" />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS (3 passos + scroll-linked progress) ══════════════ */}
      <HowItWorksSection />

      {/* ═══ SCORES (dark) ══════════════════════════════════════════════════ */}
      <ScoresSection />

      {/* ═══ JOURNEY (scrollytelling dark) ══════════════════════════════════ */}
      <JourneySection />

      {/* ═══ OPERATIONAL (cadeia inteira — contábil, fiscal, estoque) ═════ */}
      <OperationalSection />

      {/* ═══ PORTOS BRASILEIROS → MUNDO (dark) ══════════════════════════════ */}
      <PortosSection />

      {/* ═══ AGRICULTURA ════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] lg:grid-cols-2">
          <div className="relative hidden min-h-[520px] overflow-hidden lg:block">
            <Image
              src={IMG.silos}
              alt="Silos de armazenamento de grãos no Brasil"
              fill
              loading="lazy"
              sizes="(min-width: 1024px) 50vw, 0px"
              quality={82}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10" />
          </div>
          <div className="flex flex-col justify-center px-6 py-24 lg:py-32 lg:pl-20">
            <FadeIn>
              <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                Agricultura
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.08] tracking-[-.02em] text-[var(--text-primary)]">
                Soja, milho, trigo, cana e café —<br />rastreados do talhão ao navio.
              </h2>
              <p className="mt-5 max-w-[460px] text-[1rem] leading-[1.75] text-[var(--text-secondary)]">
                Cada talhão georreferenciado com CAR verificado. Cada embarque com Bill of Lading, certificado fitossanitário e laudo de qualidade.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Grain ID", "Laudo de qualidade", "BL verificado", "CAR ativo", "EUDR ready"].map(
                  (b) => (
                    <span
                      key={b}
                      className="rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-3 py-1.5 text-[.75rem] font-semibold text-[var(--primary)]"
                    >
                      {b}
                    </span>
                  ),
                )}
              </div>
              <Link
                href="/cadastro"
                className="group mt-8 inline-flex items-center gap-2 text-[.9375rem] font-semibold text-[var(--primary)] hover:underline"
              >
                Rastrear minha produção
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ MARKETPLACE LIVE ═══════════════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
          <FadeIn>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
                  Marketplace ao vivo
                </p>
                <h2 className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.08] tracking-[-.02em] text-[var(--text-primary)]">
                  Anúncios ativos agora.
                </h2>
              </div>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 text-[.875rem] font-semibold text-[var(--primary)] hover:underline"
              >
                Ver todos
                <ArrowRight size={14} />
              </Link>
            </div>
          </FadeIn>

          {mkItems.length > 0 ? (
            <StaggerContainer
              className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              staggerChildren={0.06}
            >
              {mkItems.map((l) => (
                <StaggerItem key={l.id}>
                  <Link
                    href="/marketplace"
                    className="group block rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 font-mono text-[.6875rem] uppercase tracking-[.12em] text-[var(--text-secondary)]">
                        {TYPE_LABEL[l.listing_type] ?? l.listing_type}
                      </span>
                      <div className="flex items-center gap-2">
                        {l.halal_certified && <HalalBadgeSVG size={22} />}
                        {l.score_agraas != null && (
                          <span className="rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-[.6875rem] font-bold text-[var(--primary)]">
                            {l.score_agraas}
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="mt-4 line-clamp-2 text-[.9375rem] font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
                      {l.title}
                    </h4>
                    <p className="mt-3 text-[1.25rem] font-semibold text-[var(--primary)]">
                      {fmt(l.price_per_unit)}
                      <span className="ml-1 text-[.75rem] font-normal text-[var(--text-muted)]">
                        /{l.unit}
                      </span>
                    </p>
                    {l.location_city && (
                      <div className="mt-2 flex items-center gap-1.5 text-[.75rem] text-[var(--text-muted)]">
                        <MapPin size={11} />
                        {l.location_city}-{l.location_state}
                      </div>
                    )}
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <FadeIn delay={0.2}>
              <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-white p-12 text-center">
                <ShoppingBag size={32} className="mx-auto text-[var(--text-muted)]" />
                <p className="mt-4 text-[.9375rem] font-medium text-[var(--text-primary)]">
                  Marketplace carregando ofertas
                </p>
                <p className="mt-2 text-[.8125rem] text-[var(--text-muted)]">
                  Os primeiros anúncios estão sendo curados pela equipe Agraas.
                </p>
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      {/* ═══ CASE FSJBE (expandido, timeline + score completo) ═══════════════ */}
      <FSJBECaseSection />

      {/* ═══ FAQ ════════════════════════════════════════════════════════════ */}
      <FAQSection />

      {/* ═══ CTA FINAL ══════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={IMG.colheita}
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
              "linear-gradient(135deg, #1E5E26 0%, #0f3517 100%)",
            opacity: 0.92,
          }}
        />

        <div className="absolute inset-0 -z-10 opacity-60">
          <AuroraGlow intensity="subtle" />
        </div>

        <div className="mx-auto max-w-[880px] px-6 py-28 text-center lg:py-40">
          <FadeIn>
            <h2 className="text-[clamp(2.2rem,5vw,3.6rem)] font-medium leading-[1.05] tracking-[-.035em] text-white">
              Faça parte da camada<br />de confiança do agro.
            </h2>
            <p className="mx-auto mt-6 max-w-[480px] text-[1.0625rem] leading-[1.75] text-white/75">
              Fazendeiro, comprador, fornecedor ou parceiro — a infraestrutura do agronegócio brasileiro está aqui.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/cadastro"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-8 py-4 text-[.9375rem] font-semibold text-[var(--sidebar-2)] shadow-[0_14px_40px_rgba(0,0,0,.2)] transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]"
              >
                <span className="relative flex items-center gap-2">
                  Criar conta gratuita
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <a
                href="mailto:contato@agraas.com.br"
                className="rounded-xl border border-white/40 px-8 py-4 text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5"
              >
                Fale com a gente
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </PublicShell>
  );
}
