import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import PublicNav from "@/app/components/PublicNav";
import { HalalBadgeSVG } from "@/app/components/HalalBadgeSVG";

type ListingRow = { id: string; title: string; listing_type: string; price_per_unit: number; unit: string; location_city: string | null; location_state: string | null; halal_certified: boolean; score_agraas: number | null };

const TYPE_LABEL: Record<string, string> = { animal: "Animal", safra: "Safra", insumo: "Insumo", maquinario: "Maquinário", equipamento: "Equipamento", epi: "EPI", outro: "Outro" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export default async function LandingPage() {
  const db = createSupabaseServiceClient();
  const { data: listings } = await db.from("marketplace_listings").select("id, title, listing_type, price_per_unit, unit, location_city, location_state, halal_certified, score_agraas").eq("status", "ativo").order("created_at", { ascending: false }).limit(6);
  const mkItems = (listings ?? []) as ListingRow[];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#3B5E2B] px-6 py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.08),transparent)]" />
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            O agronegócio brasileiro<br />num único ecossistema.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-emerald-200/80">
            Rastreabilidade, certificação Halal, inteligência de mercado e o maior marketplace
            de insumos, animais e safras do Brasil.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="rounded-2xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition">
              Acessar a plataforma
            </Link>
            <Link href="/marketplace" className="rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#3B5E2B] hover:bg-emerald-50 transition shadow-lg">
              Explorar o Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* ── PARA QUEM É ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: "🐄", title: "Para quem produz", text: "Gerencie seu rebanho, emita passaportes digitais, certifique para exportação Halal e venda seus animais e safras diretamente para compradores verificados.", cta: "Quero rastrear minha fazenda →" },
            { icon: "🌍", title: "Para quem compra", text: "Acesse animais e safras com rastreabilidade individual verificada, score de qualidade Agraas e certificação Halal. Do Brasil para o mundo.", cta: "Quero comprar com rastreabilidade →" },
            { icon: "🤝", title: "Para quem fornece", text: "Distribua insumos, maquinário, tecnologia e equipamentos para milhares de fazendas. Seu produto onde o agronegócio está.", cta: "Quero ser parceiro Agraas →" },
          ].map(c => (
            <div key={c.title} className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm hover:shadow-md transition">
              <span className="text-4xl">{c.icon}</span>
              <h3 className="mt-4 text-xl font-bold text-gray-900">{c.title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">{c.text}</p>
              <Link href="/cadastro" className="mt-4 inline-block text-sm font-semibold text-[#3B5E2B] hover:underline">{c.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── O QUE É A AGRAAS ────────────────────────────────────────────────── */}
      <section className="bg-[#EAF2EA] px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-gray-900">Infraestrutura digital para o agronegócio brasileiro</h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "🛂", title: "Passaporte Digital", text: "Cada animal recebe um ID Agraas único com histórico completo — sanitário, nutricional, genético e de conformidade Halal." },
            { icon: "📊", title: "Score Agraas", text: "Algoritmo proprietário que pontua cada animal em 5 dimensões. Score vira moeda de precificação no marketplace." },
            { icon: "🌾", title: "Grain ID", text: "Rastreabilidade de soja, milho e trigo da fazenda ao navio em 7 etapas documentadas." },
            { icon: "🔗", title: "Marketplace Integrado", text: "Compre, venda e encontre fornecedores com dados verificados. Transações seguras com NF-e automática." },
          ].map(b => (
            <div key={b.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <span className="text-3xl">{b.icon}</span>
              <h4 className="mt-3 text-base font-bold text-gray-900">{b.title}</h4>
              <p className="mt-2 text-sm leading-6 text-gray-600">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MARKETPLACE PREVIEW ─────────────────────────────────────────────── */}
      {mkItems.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-gray-900">O marketplace do agronegócio</h2>
          <p className="mt-2 text-center text-base text-gray-500">Animais, safras, insumos, maquinário e muito mais.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mkItems.map(l => (
              <Link key={l.id} href="/marketplace" className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{TYPE_LABEL[l.listing_type] ?? l.listing_type}</span>
                  <div className="flex items-center gap-1.5">
                    {l.halal_certified && <HalalBadgeSVG size={24} />}
                    {l.score_agraas != null && <span className="text-xs font-bold text-emerald-700">Score {l.score_agraas}</span>}
                  </div>
                </div>
                <h4 className="mt-3 font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#3B5E2B]">{l.title}</h4>
                <p className="mt-2 text-lg font-bold text-[#3B5E2B]">{fmt(l.price_per_unit)}<span className="text-xs font-normal text-gray-400">/{l.unit}</span></p>
                {l.location_city && <p className="mt-1 text-xs text-gray-400">{l.location_city}-{l.location_state}</p>}
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/marketplace" className="rounded-2xl bg-[#3B5E2B] px-8 py-3 text-sm font-bold text-white hover:bg-[#2d4a21] transition">
              Ver todos os anúncios →
            </Link>
          </div>
        </section>
      )}

      {/* ── PROVA SOCIAL ────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-gray-900">Já em operação no campo</h2>
          <div className="mt-10 rounded-3xl border-2 border-emerald-200 bg-emerald-50/50 p-8 lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold text-gray-900">Fazenda São João da Boa Esperança</p>
                <p className="mt-1 text-sm text-gray-500">Jandaia, Goiás · 2.300 cabeças · Nelore</p>
                <p className="mt-3 max-w-lg text-sm leading-7 text-gray-600">
                  Primeira fazenda com Passaporte Agraas ativo e lote certificado Halal para exportação à Arábia Saudita.
                </p>
              </div>
              <HalalBadgeSVG size={56} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { v: "2.300", l: "cabeças" }, { v: "Score 78", l: "média" },
                { v: "Halal ✓", l: "certificado" }, { v: "Q2 2026", l: "embarque" },
              ].map(m => (
                <div key={m.l} className="rounded-2xl bg-white p-4 text-center shadow-sm">
                  <p className="text-xl font-bold text-[#3B5E2B]">{m.v}</p>
                  <p className="mt-1 text-xs text-gray-500">{m.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NÚMEROS ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#3B5E2B] px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-white">A plataforma em números</h2>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { v: "78", l: "páginas" }, { v: "56", l: "tabelas" },
            { v: "4", l: "score engines" }, { v: "100%", l: "rastreável" },
          ].map(n => (
            <div key={n.l} className="text-center">
              <p className="text-4xl font-extrabold text-white">{n.v}</p>
              <p className="mt-1 text-sm text-emerald-200/70">{n.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-gray-900">Faça parte do ecossistema</h2>
        <p className="mx-auto mt-3 max-w-md text-base text-gray-500">
          Fazendeiro, comprador, fornecedor ou parceiro — há um lugar para você na Agraas.
        </p>
        <Link href="/cadastro" className="mt-8 inline-block rounded-2xl bg-[#3B5E2B] px-10 py-4 text-base font-bold text-white shadow-lg hover:bg-[#2d4a21] transition">
          Criar conta gratuitamente
        </Link>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/marketplace" className="hover:text-gray-900">Marketplace</Link>
            <Link href="/planos" className="hover:text-gray-900">Planos</Link>
            <Link href="/sobre" className="hover:text-gray-900">Sobre</Link>
            <Link href="/login" className="hover:text-gray-900">Login</Link>
          </div>
          <p className="text-xs text-gray-400">© 2026 Agraas Agritech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
