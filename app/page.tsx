import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicShell from "@/app/components/ui/PublicShell";
import ScoresSection from "@/app/components/landing/ScoresSection";
import PortosSection from "@/app/components/landing/PortosSection";
import FSJBECaseSection from "@/app/components/landing/FSJBECaseSection";
import OperationalSection from "@/app/components/landing/OperationalSection";
import HowItWorksSection from "@/app/components/landing/HowItWorksSection";
import FAQSection from "@/app/components/landing/FAQSection";
import BrazilAgroSection from "@/app/components/landing/BrazilAgroSection";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/app/components/ui/Motion";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import {
  Fingerprint,
  BarChart2,
  Wheat,
  ShoppingBag,
  MapPin,
  ArrowRight,
  CheckCircle2,
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

const IMG = {
  hero:     "/images/lp/rebanho-nelore.png",
  colheita: "/images/lp/Maquina-agricola-colheita.jpg",
};

export const revalidate = 300;

async function fetchLandingData() {
  const db = createSupabaseServiceClient();
  const { data: listings } = await db
    .from("marketplace_listings")
    .select("id, title, listing_type, price_per_unit, unit, location_city, location_state, halal_certified, score_agraas")
    .eq("status", "ativo")
    .order("created_at", { ascending: false })
    .limit(6);

  return {
    mkItems: (listings ?? []) as ListingRow[],
  };
}

const CAPABILITIES = [
  {
    Icon: Fingerprint,
    title: "Identidade e Rastreio",
    p1: "Passaporte digital individual para cada animal e cada talhão. ID único vitalício, histórico completo, QR público verificável por qualquer comprador no mundo.",
    p2: "Trilíngue em português, inglês e árabe com suporte RTL nativo. Construído para o mercado Halal.",
  },
  {
    Icon: BarChart2,
    title: "Score e Inteligência",
    p1: "Algoritmo proprietário em 5 dimensões recalculado em tempo real a cada evento. O mesmo número no passaporte público, no dashboard e no marketplace.",
    p2: "Nenhum concorrente calcula score individual por animal. É o diferencial que transforma dado operacional em valor de mercado.",
    href: "#score",
  },
  {
    Icon: Wheat,
    title: "Grain ID",
    p1: "Soja, milho, trigo, cana e café rastreados do talhão ao navio em 7 etapas documentadas. BL, certificado fitossanitário e laudo de qualidade incluídos.",
    p2: "Conformidade com o Regulamento Europeu sobre Desmatamento (EUDR) e com os requisitos da SFDA — os dois maiores mercados de destino do agro brasileiro.",
  },
  {
    Icon: ShoppingBag,
    title: "Marketplace Integrado",
    p1: "Compre e venda animais, safras e insumos com score verificado, vendedor rastreado e NF-e automática no fechamento. Sem intermediário, sem burocracia.",
    p2: "O único marketplace do agro onde o histórico do animal e da fazenda acompanha o anúncio. Qualidade comprovada antes de fechar.",
    href: "/marketplace",
  },
];

export default async function LandingPage() {
  const { mkItems } = await fetchLandingData();

  return (
    <PublicShell>
      {/* ═══ [2] HERO — headline + CTAs + Nelore close ═══════════════════ */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={IMG.hero}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          className="absolute inset-0 -z-10 object-cover"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(110deg, var(--sidebar-2) 0%, rgba(15,53,23,.85) 40%, rgba(15,53,23,.55) 75%, rgba(15,53,23,.35) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[var(--bg)] to-transparent" />

        <div className="relative mx-auto max-w-[1280px] px-6 pt-14 pb-16 lg:px-10 lg:pt-20 lg:pb-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-center lg:gap-10">
            {/* Left: content */}
            <div>
              <FadeIn>
                <h1 className="text-[clamp(2.4rem,5.8vw,4.6rem)] font-medium leading-[1] tracking-[-.035em] text-white">
                  A plataforma do agro brasileiro.
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p className="mt-7 max-w-[520px] text-[1.0625rem] leading-[1.75] text-white/65">
                  Pecuária, grãos e exportação sobre uma única camada de dados verificáveis. Do pasto ao porto, do talhão ao comprador institucional.
                </p>
              </FadeIn>

              <FadeIn delay={0.35}>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-[14px] text-[.9375rem] font-semibold text-white shadow-[0_10px_30px_rgba(46,139,62,.25)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_14px_40px_rgba(46,139,62,.35)]"
                  >
                    Explorar marketplace
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl border border-white/60 px-7 py-[14px] text-[.9375rem] font-semibold text-white transition hover:border-white hover:bg-white/10"
                  >
                    Ver a plataforma
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right: Nelore close-up */}
            <FadeIn delay={0.3}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl shadow-[0_30px_80px_rgba(0,0,0,.35)] ring-1 ring-white/10">
                <Image
                  src="https://images.unsplash.com/photo-1605185189100-4d7c8fffbad1?w=1600&q=85&auto=format"
                  alt="Close de boi Nelore"
                  fill
                  sizes="(max-width: 1024px) 100vw, 540px"
                  className="object-cover"
                  priority
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ [3] COMO FUNCIONA ═════════════════════════════════════════════ */}
      <HowItWorksSection />

      {/* ═══ [4] SCORE AGRAAS — única ocorrência de score na LP ═══════════ */}
      <div id="score">
        <ScoresSection />
      </div>

      {/* ═══ [5] CAPABILITIES — narrativa 2x2 ═════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
          <div className="max-w-[820px]">
            <FadeIn>
              <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
                Uma plataforma. A cadeia inteira do agro.
              </h2>
            </FadeIn>
            <FadeIn delay={0.12}>
              <p className="mt-5 max-w-[720px] text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
                Cada módulo foi construído para conversar com os outros. Uma aplicação sanitária debita estoque, gera custo no animal, alimenta o score e aparece no relatório do contador — sem digitar duas vezes.
              </p>
            </FadeIn>
          </div>

          <StaggerContainer
            className="mt-14 grid gap-6 md:grid-cols-2"
            staggerChildren={0.08}
          >
            {CAPABILITIES.map((c) => {
              const inner = (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                    <c.Icon size={22} className="text-[var(--primary)]" />
                  </div>
                  <h3 className="mt-6 text-[1.125rem] font-semibold tracking-[-.01em] text-[var(--text-primary)]">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-[.9375rem] leading-[1.75] text-[var(--text-muted)]">
                    {c.p1}
                  </p>
                  <p className="mt-3 text-[.9375rem] leading-[1.75] text-[var(--text-muted)]">
                    {c.p2}
                  </p>
                </>
              );
              const cls =
                "group relative h-full rounded-2xl border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-white p-8 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]";
              return (
                <StaggerItem key={c.title}>
                  {c.href ? (
                    <Link href={c.href} className={`block ${cls}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══ [6] PORTOS BR → MUNDO ═════════════════════════════════════════ */}
      <PortosSection />

      {/* ═══ [7] BRASIL LÍDER MUNDIAL DO AGRO ══════════════════════════════ */}
      <BrazilAgroSection />

      {/* ═══ [8] FINANCEIRO / FISCAL / ESTOQUE ═════════════════════════════ */}
      <OperationalSection />

      {/* ═══ [9] MARKETPLACE PREVIEW ═══════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
          <FadeIn>
            <div className="max-w-[720px]">
              <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium leading-[1.08] tracking-[-.02em] text-[var(--text-primary)]">
                O marketplace do agronegócio
              </h2>
            </div>
          </FadeIn>

          {/* 4 pills exclusivas — Só na Agraas */}
          <FadeIn delay={0.12}>
            <div className="mt-10 flex flex-wrap items-center gap-3 border-y border-[var(--border)] py-6">
              <span className="text-[.75rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
                Só na Agraas:
              </span>
              {[
                "Score em todo anúncio",
                "Histórico do animal no listing",
                "NF-e automática no fechamento",
                "Vendedor com passaporte ativo",
              ].map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-3.5 py-1.5 text-[.8125rem] font-semibold text-[var(--primary)]"
                >
                  <CheckCircle2 size={13} />
                  {p}
                </span>
              ))}
            </div>
          </FadeIn>

          {/* Grid 3×2 (6 cards fixos) */}
          <StaggerContainer
            className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            staggerChildren={0.05}
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const l = mkItems[i];
              if (l) {
                return (
                  <StaggerItem key={l.id}>
                    <Link
                      href={`/marketplace/${l.id}`}
                      className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-[.6875rem] font-semibold uppercase tracking-[.06em] text-[var(--text-secondary)]">
                          {TYPE_LABEL[l.listing_type] ?? l.listing_type}
                        </span>
                        <div className="flex items-center gap-2">
                          {l.halal_certified && <HalalBadgeSVG size={22} />}
                          {l.score_agraas != null && (
                            <span className="rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-[.6875rem] font-bold text-[var(--primary)]">
                              Score {l.score_agraas}
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
                        <div className="mt-auto pt-3 flex items-center gap-1.5 text-[.75rem] text-[var(--text-muted)]">
                          <MapPin size={11} />
                          {l.location_city}-{l.location_state}
                        </div>
                      )}
                    </Link>
                  </StaggerItem>
                );
              }
              return (
                <StaggerItem key={`placeholder-${i}`}>
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/60 p-6 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-soft)]">
                      <ShoppingBag size={18} className="text-[var(--text-muted)]" />
                    </div>
                    <span className="mt-4 rounded-full border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-3 py-0.5 text-[.6875rem] font-semibold text-[var(--primary)]">
                      Em breve
                    </span>
                    <p className="mt-3 text-[.8125rem] leading-[1.55] text-[var(--text-muted)]">
                      Novo anúncio sendo preparado por um vendedor verificado.
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          <FadeIn delay={0.3}>
            <div className="mt-12 flex justify-center">
              <Link
                href="/marketplace"
                className="group inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-3.5 text-[.9375rem] font-semibold text-white shadow-[0_10px_30px_rgba(46,139,62,.25)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_14px_40px_rgba(46,139,62,.35)]"
              >
                Ver todos os anúncios
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ [10] FSJBE ════════════════════════════════════════════════════ */}
      <FSJBECaseSection />

      {/* ═══ [11] FAQ ══════════════════════════════════════════════════════ */}
      <FAQSection />

      {/* ═══ [12] CTA FINAL ═══════════════════════════════════════════════ */}
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
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-[.9375rem] font-semibold text-[var(--sidebar-2)] shadow-[0_14px_40px_rgba(0,0,0,.2)] transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]"
              >
                Criar conta gratuita
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="mailto:contato@agraas.com.br"
                className="rounded-xl border border-white/60 px-8 py-4 text-[.9375rem] font-semibold text-white transition hover:border-white hover:bg-white/10"
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
