import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicNav from "@/app/components/PublicNav";
import CounterAnimation from "@/app/components/CounterAnimation";
import ScrollReveal from "@/app/components/ScrollReveal";
import JourneySection from "@/app/components/JourneySection";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";
import { FileText, BarChart2, Wheat, ShoppingBag, MapPin, ArrowRight, Anchor, Ship, ChevronRight, Shield, CheckCircle } from "lucide-react";

type ListingRow = { id: string; title: string; listing_type: string; price_per_unit: number; unit: string; location_city: string | null; location_state: string | null; halal_certified: boolean; score_agraas: number | null };
const TYPE_LABEL: Record<string, string> = { animal: "Animal", safra: "Safra", insumo: "Insumo", maquinario: "Maquinário", equipamento: "Equipamento" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

const IMG = {
  hero: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1920&q=85&auto=format",
  nelore: "/images/lp/nelore-close.jpg",
  pasto: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1600&q=80&auto=format",
  soja: "/images/lp/silos-milho.jpg",
  porto: "https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=900&q=80&auto=format",
  aereo: "/images/lp/colheita-sunset.jpg",
};

export default async function LandingPage() {
  const db = createSupabaseServiceClient();
  const { data: listings } = await db.from("marketplace_listings").select("id, title, listing_type, price_per_unit, unit, location_city, location_state, halal_certified, score_agraas").eq("status", "ativo").order("created_at", { ascending: false }).limit(6);
  const mkItems = (listings ?? []) as ListingRow[];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PublicNav />

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative isolate min-h-[92vh] overflow-hidden">
        <img src={IMG.hero} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(to right, var(--sidebar-2) 0%, rgba(41,79,29,.75) 50%, rgba(41,79,29,.25) 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[var(--bg)] to-transparent" />

        <div className="mx-auto flex min-h-[92vh] max-w-[1200px] items-center px-6 lg:px-10">
          <div className="w-full max-w-[640px] py-24">
            <div className="ag-badge ag-badge-white">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,.8)]" />
              Plataforma em operação
            </div>

            <h1 className="ag-page-title !mt-6 !text-[clamp(2.6rem,6vw,4.6rem)] !text-white !leading-[.94]">
              Do pasto brasileiro<br />à mesa do mundo.
            </h1>

            <p className="mt-7 max-w-[490px] text-[1.05rem] leading-[1.8] text-white/55">
              Rastreabilidade individual, certificação Halal verificada e o marketplace que conecta quem produz a quem compra — com dados, não promessas.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/marketplace" className="ag-button-primary !rounded-xl !px-7 !py-[14px] !text-[.9375rem] !shadow-[0_14px_40px_rgba(93,156,68,.35)]">
                Explorar Marketplace
              </Link>
              <Link href="/login"
                className="rounded-xl border border-white/40 px-7 py-[14px] text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5">
                Acessar plataforma
              </Link>
            </div>

            <div className="mt-20 flex flex-wrap gap-12 border-t border-white/[.1] pt-8">
              {[
                { end: 2300, s: "", l: "cabeças rastreadas" },
                { end: 100, s: "%", l: "certificação Halal" },
                { end: 78, s: "", l: "módulos ativos" },
              ].map((c, i) => (
                <div key={i}>
                  <p className="ag-kpi-value !text-white !text-[2rem]"><CounterAnimation end={c.end} suffix={c.s} /></p>
                  <p className="mt-1.5 text-[.75rem] font-medium text-white/35">{c.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═══════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] lg:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-24 lg:pr-20 lg:py-32">
            <ScrollReveal>
              <div className="ag-badge ag-badge-green">O que construímos</div>
              <h2 className="ag-page-title !text-[clamp(1.7rem,3vw,2.4rem)]">
                Cada animal tem identidade.<br />Cada safra tem origem.
              </h2>
              <p className="ag-section-subtitle !mt-5 max-w-[460px]">
                Passaporte digital individual, score em 5 dimensões, certificação Halal verificada e rastreabilidade completa — do nascimento ao embarque.
              </p>
            </ScrollReveal>

            <div className="mt-12 space-y-4">
              {[
                { Icon: FileText, t: "Passaporte Digital", s: "ID único por animal com todo o histórico sanitário, produtivo e de conformidade." },
                { Icon: BarChart2, t: "Score Agraas", s: "Algoritmo proprietário em 5 dimensões. O score precifica o animal no marketplace." },
                { Icon: Wheat, t: "Grain ID", s: "Rastreabilidade de soja, milho e trigo da fazenda ao navio em 7 etapas." },
                { Icon: ShoppingBag, t: "Marketplace", s: "Compre e venda animais, safras e insumos com dados verificados e NF-e automática." },
              ].map((c, i) => (
                <ScrollReveal key={c.t} delay={i * 70}>
                  <div className="group flex gap-4 rounded-2xl p-4 -ml-4 transition hover:bg-[var(--surface-soft)]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                      <c.Icon size={19} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-[.9375rem] font-semibold text-[var(--text-primary)]">{c.t}</p>
                      <p className="mt-1 text-[.8125rem] leading-[1.7] text-[var(--text-muted)]">{c.s}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          <div className="relative hidden min-h-[600px] overflow-hidden lg:block">
            <img src={IMG.nelore} alt="Gado Nelore" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* ═══ IMPACT QUOTE ═══════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <img src={IMG.pasto} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(135deg, var(--sidebar) 0%, var(--sidebar-2) 100%)", opacity: .82 }} />

        <div className="mx-auto max-w-[880px] px-6 py-28 text-center lg:py-40">
          <ScrollReveal>
            <HalalBadgeSVG size={64} />
            <p className="mt-8 text-[clamp(1.3rem,3vw,2.1rem)] font-medium leading-[1.4] tracking-[-.015em] text-white">
              O Brasil exporta mais proteína Halal do que qualquer outro país do mundo. A Agraas é a infraestrutura que prova a origem — animal por animal, etapa por etapa.
            </p>
            <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-4 text-[.8125rem] text-white/40">
              <span>Jussara, Goiás</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>2.300 cabeças</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Lote Halal Q2 2026</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ JOURNEY (scrollytelling dark) ═══════════════════════════════════ */}
      <JourneySection />

      {/* ═══ CAMPO → MUNDO ══════════════════════════════════════════════════ */}
      <section className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
          <ScrollReveal>
            <div className="ag-badge ag-badge-green">Origem e destino</div>
            <h2 className="ag-page-title !text-[clamp(1.7rem,3vw,2.4rem)]">
              Da fazenda em Goiás ao comprador em Jeddah.
            </h2>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { img: IMG.pasto, badge: "Origem", Icon: MapPin, loc: "Jussara, Goiás", title: "Fazenda São João da Boa Esperança", desc: "2.300 cabeças Nelore com passaporte digital, certificação MAPA e GTA ativas." },
              { img: IMG.porto, badge: "Embarque", Icon: Anchor, loc: "Porto de Santos, SP", title: "7 checkpoints de rastreio", desc: "Fazenda → concentração → transporte → porto → navio → destino → entrega." },
              { img: null, badge: "Destino", Icon: Ship, loc: "Jeddah, Arábia Saudita", title: "Conformidade Halal verificável", desc: "O comprador acessa o passaporte por QR e verifica origem, score e cada certificação." },
            ].map((c, i) => (
              <ScrollReveal key={c.badge} delay={i * 100}>
                <div className="ag-card group overflow-hidden !rounded-2xl !p-0">
                  <div className="relative h-52 overflow-hidden">
                    {c.img ? (
                      <img src={c.img} alt={c.badge} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" style={{ background: "linear-gradient(135deg, var(--sidebar) 0%, var(--sidebar-2) 100%)" }}>
                        <HalalBadgeSVG size={80} />
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3">
                      <span className="ag-badge ag-badge-green !shadow-md">{c.badge}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-1.5 text-[.75rem] text-[var(--text-muted)]"><c.Icon size={12} /> {c.loc}</div>
                    <h3 className="mt-2 text-[1rem] font-semibold text-[var(--text-primary)]">{c.title}</h3>
                    <p className="mt-2 text-[.8125rem] leading-[1.75] text-[var(--text-muted)]">{c.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={350}>
            <div className="mx-auto mt-12 flex max-w-[550px] items-center gap-2.5 rounded-full border border-[var(--border)] bg-white px-6 py-3.5 shadow-[var(--shadow-soft)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
              <span className="text-[.8125rem] font-semibold text-[var(--text-primary)]">Goiás</span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/20" />
              <span className="text-[.8125rem] text-[var(--text-muted)]">Santos</span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--primary)]/20 via-[var(--primary)]/40 to-[var(--primary)]" />
              <span className="text-[.8125rem] font-semibold text-[var(--text-primary)]">Jeddah</span>
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ AGRICULTURA ════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] lg:grid-cols-2">
          <div className="relative hidden min-h-[500px] overflow-hidden lg:block">
            <img src={IMG.soja} alt="Silos e lavoura de milho" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-center px-6 py-24 lg:pl-20 lg:py-32">
            <ScrollReveal>
              <div className="ag-badge ag-badge-green">Agricultura</div>
              <h2 className="ag-page-title !text-[clamp(1.7rem,3vw,2.4rem)]">
                Soja, milho, trigo, cana e café — rastreados do talhão ao navio.
              </h2>
              <p className="ag-section-subtitle !mt-5 max-w-[460px]">
                Cada talhão georeferenciado com CAR verificado. Cada embarque com BL, certificado fitossanitário e laudo de qualidade.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Grain ID", "Laudo de qualidade", "BL verificado", "CAR ativo", "EUDR ready"].map(b => (
                  <span key={b} className="ag-badge ag-badge-green">{b}</span>
                ))}
              </div>
              <Link href="/cadastro" className="group mt-8 inline-flex items-center gap-2 text-[.9375rem] font-semibold text-[var(--primary)] hover:underline">
                Rastrear minha produção <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ MARKETPLACE ════════════════════════════════════════════════════ */}
      {mkItems.length > 0 && (
        <section className="bg-[var(--bg)]">
          <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-28">
            <ScrollReveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="ag-badge ag-badge-green">Marketplace</div>
                  <h2 className="ag-page-title !text-[clamp(1.7rem,3vw,2.4rem)]">Anúncios ativos agora.</h2>
                </div>
                <Link href="/marketplace" className="ag-button-secondary !text-[.875rem]">
                  Ver todos <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>
            </ScrollReveal>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mkItems.map((l, i) => (
                <ScrollReveal key={l.id} delay={i * 60}>
                  <Link href="/marketplace" className="ag-card group block !p-6 transition-transform duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                      <span className="ag-badge">{TYPE_LABEL[l.listing_type] ?? l.listing_type}</span>
                      <div className="flex items-center gap-2">
                        {l.halal_certified && <HalalBadgeSVG size={20} />}
                        {l.score_agraas != null && <span className="ag-badge ag-badge-green text-[.6875rem]">{l.score_agraas}</span>}
                      </div>
                    </div>
                    <h4 className="mt-4 text-[.9375rem] font-semibold leading-snug text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)]">{l.title}</h4>
                    <p className="mt-3 ag-kpi-value !text-[1.125rem] !text-[var(--primary)]">
                      {fmt(l.price_per_unit)}<span className="ml-1 text-[.75rem] font-normal text-[var(--text-muted)]">/{l.unit}</span>
                    </p>
                    {l.location_city && (
                      <div className="mt-2 flex items-center gap-1.5 text-[.75rem] text-[var(--text-muted)]">
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

      {/* ═══ SOCIAL PROOF ══════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-24">
          <ScrollReveal>
            <div className="ag-card-strong overflow-hidden !p-0">
              <div className="grid lg:grid-cols-[1.1fr_.9fr]">
                <div className="p-8 lg:p-12">
                  <div className="ag-badge ag-badge-green">Cliente ativo</div>
                  <h3 className="mt-5 text-[1.5rem] font-semibold tracking-[-.02em] text-[var(--text-primary)]">Fazenda São João da Boa Esperança</h3>
                  <div className="mt-2 flex items-center gap-2 text-[.875rem] text-[var(--text-muted)]"><MapPin size={13} />Jussara, Goiás</div>
                  <p className="mt-5 ag-section-subtitle">
                    Primeira fazenda com Passaporte Agraas ativo e lote de exportação certificado Halal confirmado para a Arábia Saudita — segundo trimestre de 2026.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["MAPA ✓", "GTA ✓", "Halal ✓", "Nelore PO"].map(b => (
                      <span key={b} className="ag-badge ag-badge-green">{b}</span>
                    ))}
                  </div>
                </div>
                <div className="ag-hero-panel grid grid-cols-2">
                  {[
                    { v: "2.300", l: "cabeças", Icon: Shield },
                    { v: "Nelore", l: "raça", Icon: CheckCircle },
                    { v: "Q2 2026", l: "embarque", Icon: Ship },
                    { v: "Score 78", l: "média", Icon: BarChart2 },
                  ].map(m => (
                    <div key={m.l} className="ag-kpi-card !rounded-none !border-0 !shadow-none flex flex-col items-center justify-center !p-6 text-center border-b border-l border-[var(--border)]">
                      <m.Icon size={18} className="text-[var(--primary)]" />
                      <p className="mt-3 text-[1.2rem] font-semibold text-[var(--text-primary)]">{m.v}</p>
                      <p className="mt-1 ag-kpi-label">{m.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <img src={IMG.aereo} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(135deg, #1E5E26 0%, #0f3517 100%)", opacity: .92 }} />

        <div className="mx-auto max-w-[800px] px-6 py-28 text-center lg:py-40">
          <ScrollReveal>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.08] tracking-[-.04em] text-white">
              Faça parte do ecossistema.
            </h2>
            <p className="mx-auto mt-5 max-w-[440px] text-[1rem] leading-[1.75] text-white/85">
              Fazendeiro, comprador, fornecedor ou parceiro — a infraestrutura do agronegócio brasileiro está aqui.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/cadastro" className="ag-button-primary !rounded-xl !px-8 !py-4 !text-[.9375rem] !shadow-[0_14px_40px_rgba(93,156,68,.4)]">
                Criar conta gratuitamente
              </Link>
              <a href="mailto:contato@agraas.com.br"
                className="rounded-xl border border-white/40 px-8 py-4 text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5">
                Fale com a gente
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer style={{ background: "linear-gradient(180deg, #1E5E26 0%, #0f3517 100%)" }}>
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 sm:grid-cols-4 lg:px-10">
          <div>
            <p className="text-[1.25rem] font-semibold tracking-[-.04em] text-white">Agraas</p>
            <p className="mt-3 text-[.8125rem] leading-[1.75] text-white/70">Infraestrutura digital do agronegócio brasileiro.</p>
          </div>
          <div>
            <p className="text-[.6875rem] font-semibold uppercase tracking-[.15em] text-white/60">Plataforma</p>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/marketplace" className="text-[.875rem] text-white transition hover:text-white/80">Marketplace</Link>
              <Link href="/planos" className="text-[.875rem] text-white transition hover:text-white/80">Planos</Link>
              <Link href="/login" className="text-[.875rem] text-white transition hover:text-white/80">Login</Link>
            </div>
          </div>
          <div>
            <p className="text-[.6875rem] font-semibold uppercase tracking-[.15em] text-white/60">Empresa</p>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/sobre" className="text-[.875rem] text-white transition hover:text-white/80">Sobre</Link>
              <a href="mailto:contato@agraas.com.br" className="text-[.875rem] text-white transition hover:text-white/80">Contato</a>
            </div>
          </div>
          <div>
            <p className="text-[.6875rem] font-semibold uppercase tracking-[.15em] text-white/60">Legal</p>
            <div className="mt-4 flex flex-col gap-3">
              <span className="text-[.875rem] text-white/70">Privacidade</span>
              <span className="text-[.875rem] text-white/70">Termos</span>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1200px] border-t border-white/[.12] px-6 py-6">
          <p className="text-[.75rem] text-white/55">© 2026 Agraas Agritech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
