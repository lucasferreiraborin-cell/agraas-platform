import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicNav from "@/app/components/PublicNav";
import CounterAnimation from "@/app/components/CounterAnimation";
import ScrollReveal from "@/app/components/ScrollReveal";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import { Tractor, Globe, Handshake, FileText, BarChart2, Wheat, ShoppingBag, MapPin, ChevronRight } from "lucide-react";

type ListingRow = { id: string; title: string; listing_type: string; price_per_unit: number; unit: string; location_city: string | null; location_state: string | null; halal_certified: boolean; score_agraas: number | null };

const TYPE_LABEL: Record<string, string> = { animal: "Animal", safra: "Safra", insumo: "Insumo", maquinario: "Maquinário", equipamento: "Equipamento", epi: "EPI", outro: "Outro" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default async function LandingPage() {
  const db = createSupabaseServiceClient();
  const { data: listings } = await db.from("marketplace_listings").select("id, title, listing_type, price_per_unit, unit, location_city, location_state, halal_certified, score_agraas").eq("status", "ativo").order("created_at", { ascending: false }).limit(6);
  const mkItems = (listings ?? []) as ListingRow[];

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* ════ HERO ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#3d762c_0%,#294f1d_60%,#1e3a1b_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_30%,rgba(93,156,68,0.15),transparent)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          {/* Left */}
          <div className="flex flex-col justify-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)]/70">Plataforma Agraas</p>
            <h1 className="mt-4 text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-white">
              O agronegócio brasileiro<br />em um único ecossistema.
            </h1>
            <p className="mt-6 max-w-lg text-[1.1rem] leading-8 text-emerald-100/70">
              Rastreabilidade verificada, certificação Halal e o maior marketplace de animais, safras e insumos do Brasil.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/marketplace"
                className="rounded-2xl bg-white px-8 py-4 text-[15px] font-bold text-[#294f1d] shadow-lg hover:bg-emerald-50 transition">
                Explorar o Marketplace
              </Link>
              <Link href="/login"
                className="rounded-2xl border-2 border-white/30 px-8 py-4 text-[15px] font-bold text-white hover:bg-white/10 transition">
                Acessar a plataforma
              </Link>
            </div>
          </div>

          {/* Right — stat cards */}
          <div className="grid grid-cols-2 gap-4 self-center">
            {[
              { value: 78, suffix: "", label: "páginas", sub: "Plataforma completa" },
              { value: 2300, suffix: "", label: "cabeças", sub: "Fazenda piloto ativa" },
              { value: 4, suffix: "", label: "engines", sub: "Score por animal" },
              { value: 100, suffix: "%", label: "Halal", sub: "Certificação verificada" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/15 bg-white/8 p-6 backdrop-blur-sm">
                <p className="text-[2.2rem] font-extrabold leading-none text-[var(--primary)]">
                  <CounterAnimation end={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-[13px] font-semibold text-white/80">{s.label}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ PARA QUEM É ═════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <ScrollReveal>
          <p className="text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Para quem é</p>
          <h2 className="mt-3 text-center text-[2rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">A Agraas foi construída para toda a cadeia</h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            { Icon: Tractor, title: "Para quem produz", text: "Gerencie o rebanho, emita passaportes digitais e certifique para exportação Halal. Venda direto para compradores verificados.", cta: "Começar a rastrear" },
            { Icon: Globe, title: "Para quem compra", text: "Acesse animais e safras com rastreabilidade individual, score de qualidade Agraas e certificação Halal do Brasil para o mundo.", cta: "Comprar com confiança" },
            { Icon: Handshake, title: "Para quem fornece", text: "Distribua insumos, maquinário e tecnologia para fazendas de todo o Brasil. Seu produto onde o agronegócio está.", cta: "Ser parceiro" },
          ].map((c, i) => (
            <ScrollReveal key={c.title} delay={i * 100}>
              <div className="group rounded-3xl border border-[var(--border)] bg-white p-8 transition hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-card)]">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                  <c.Icon size={22} className="text-[var(--primary)]" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">{c.title}</h3>
                <p className="mt-3 text-[14px] leading-7 text-[var(--text-secondary)]">{c.text}</p>
                <Link href="/cadastro" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--primary)] hover:underline">
                  {c.cta} <ChevronRight size={14} />
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ════ O QUE É ═════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--bg)] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">A plataforma</p>
            <h2 className="mt-3 text-[2rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">Infraestrutura digital para o agronegócio brasileiro</h2>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {[
              { Icon: FileText, title: "Passaporte Digital", text: "Cada animal recebe um ID Agraas com histórico completo — sanitário, nutricional, genético e de conformidade Halal." },
              { Icon: BarChart2, title: "Score Agraas", text: "Algoritmo em 5 dimensões que pontua cada animal. Score vira referência de precificação no marketplace." },
              { Icon: Wheat, title: "Grain ID", text: "Rastreabilidade de soja, milho e trigo da fazenda ao navio em 7 etapas documentadas." },
              { Icon: ShoppingBag, title: "Marketplace Integrado", text: "Compre, venda e encontre fornecedores com dados verificados. Transações seguras com NF-e automática." },
            ].map((b, i) => (
              <ScrollReveal key={b.title} delay={i * 80}>
                <div className="flex gap-5 rounded-2xl border-l-[3px] border-l-[var(--primary)] bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                    <b.Icon size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-[var(--text-primary)]">{b.title}</h4>
                    <p className="mt-1.5 text-[13px] leading-6 text-[var(--text-secondary)]">{b.text}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════ MARKETPLACE PREVIEW ═════════════════════════════════════════════ */}
      {mkItems.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-24">
          <ScrollReveal>
            <p className="text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Marketplace</p>
            <h2 className="mt-3 text-center text-[2rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">O marketplace do agronegócio</h2>
            <p className="mt-2 text-center text-[15px] text-[var(--text-secondary)]">Compre e venda animais, safras, insumos e equipamentos com dados verificados.</p>
          </ScrollReveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mkItems.map((l, i) => (
              <ScrollReveal key={l.id} delay={i * 60}>
                <Link href="/marketplace" className="group block rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[11px] font-bold text-[var(--primary)]">{TYPE_LABEL[l.listing_type] ?? l.listing_type}</span>
                    <div className="flex items-center gap-1.5">
                      {l.halal_certified && <HalalBadgeSVG size={22} />}
                      {l.score_agraas != null && <span className="text-[11px] font-bold text-[var(--primary)]">Score {l.score_agraas}</span>}
                    </div>
                  </div>
                  <h4 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--primary)]">{l.title}</h4>
                  <p className="mt-2 text-lg font-bold text-[var(--primary)]">{fmt(l.price_per_unit)}<span className="text-[12px] font-normal text-[var(--text-muted)]">/{l.unit}</span></p>
                  {l.location_city && (
                    <div className="mt-2 flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                      <MapPin size={11} />{l.location_city}-{l.location_state}
                    </div>
                  )}
                </Link>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/marketplace" className="rounded-2xl bg-[var(--primary)] px-8 py-3.5 text-[14px] font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] transition">
              Ver todos os anuncios
            </Link>
          </div>
        </section>
      )}

      {/* ════ CLIENTE PILOTO ══════════════════════════════════════════════════ */}
      <section className="bg-[linear-gradient(135deg,#3d762c_0%,#294f1d_100%)] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/50">Em operacao no campo</p>
            <h2 className="mt-3 text-[2rem] font-bold tracking-[-0.03em] text-white">Ja em operacao no campo</h2>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="mt-10 rounded-3xl border border-white/15 bg-white/8 p-8 backdrop-blur-sm lg:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-bold text-white">Fazenda Sao Joao da Boa Esperanca</p>
                  <div className="mt-1 flex items-center gap-2 text-[14px] text-white/60">
                    <MapPin size={13} />Jandaia, Goias
                  </div>
                  <p className="mt-4 max-w-lg text-[14px] leading-7 text-white/70">
                    Primeira fazenda com Passaporte Agraas ativo. Lote de exportacao confirmado para o segundo trimestre de 2026.
                  </p>
                </div>
                <HalalBadgeSVG size={56} />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { v: "2.300", l: "cabecas" }, { v: "Nelore", l: "raca" },
                  { v: "Halal", l: "certificado" }, { v: "Q2 2026", l: "embarque" },
                ].map(m => (
                  <div key={m.l} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-xl font-bold text-[var(--primary)]">{m.v}</p>
                    <p className="mt-1 text-[12px] text-white/50">{m.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ════ PARCEIROS ═══════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <ScrollReveal>
          <h2 className="text-center text-[1.5rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Parceiros e certificadoras</h2>
          <p className="mt-2 text-center text-[14px] text-[var(--text-muted)]">Em breve</p>
        </ScrollReveal>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex h-16 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-[13px] text-gray-300">
              Em breve
            </div>
          ))}
        </div>
      </section>

      {/* ════ CTA FINAL ══════════════════════════════════════════════════════ */}
      <section className="bg-[#1e3a1b] px-6 py-24 text-center">
        <ScrollReveal>
          <h2 className="text-[2.2rem] font-bold tracking-[-0.03em] text-white">Faca parte do ecossistema</h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] text-[var(--primary)]">
            Fazendeiro, comprador, fornecedor ou parceiro.
          </p>
          <Link href="/cadastro"
            className="mt-8 inline-block rounded-2xl bg-[var(--primary)] px-10 py-4 text-[15px] font-bold text-white shadow-lg hover:bg-[var(--primary-hover)] transition">
            Criar conta gratuitamente
          </Link>
        </ScrollReveal>
      </section>

      {/* ════ FOOTER ═════════════════════════════════════════════════════════ */}
      <footer className="bg-[#111827] px-6 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-4">
          <div>
            <p className="text-lg font-semibold text-white">Agraas</p>
            <p className="mt-2 text-[13px] leading-6 text-gray-500">Infraestrutura digital do agronegocio brasileiro.</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-500">Plataforma</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link href="/marketplace" className="text-[14px] text-gray-400 hover:text-white transition">Marketplace</Link>
              <Link href="/planos" className="text-[14px] text-gray-400 hover:text-white transition">Planos</Link>
              <Link href="/login" className="text-[14px] text-gray-400 hover:text-white transition">Login</Link>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-500">Empresa</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link href="/sobre" className="text-[14px] text-gray-400 hover:text-white transition">Sobre</Link>
              <a href="mailto:contato@agraas.com.br" className="text-[14px] text-gray-400 hover:text-white transition">Contato</a>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-500">Legal</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <span className="text-[14px] text-gray-500">Privacidade</span>
              <span className="text-[14px] text-gray-500">Termos</span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-gray-800 pt-6">
          <p className="text-[12px] text-gray-600">2026 Agraas Agritech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
