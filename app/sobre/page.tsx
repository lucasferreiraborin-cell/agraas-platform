import Link from "next/link";
import PublicNav from "@/app/components/PublicNav";

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />

      {/* ── ORIGEM ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-gray-900">Por que a Agraas existe</h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-gray-600">
          <p>
            O Brasil é o maior exportador de carne bovina certificada Halal do mundo e responde
            por 44% das importações de proteína animal da Arábia Saudita. Apesar disso, nenhuma
            das cadeias que sustentam esse fluxo comercial oferece rastreabilidade individual verificável.
          </p>
          <p>
            A Agraas nasceu para fechar essa lacuna. Construída no Brasil por brasileiros que
            entendem o campo, a plataforma transforma dados operacionais de fazendas em
            infraestrutura de confiança — para exportadores, compradores institucionais
            e para o próprio produtor rural.
          </p>
        </div>
      </section>

      {/* ── PRINCÍPIOS ──────────────────────────────────────────────────────── */}
      <section className="bg-[#EAF2EA] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-gray-900">No que acreditamos</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: "Transparência radical", text: "Dados do campo são ativos. O fazendeiro que documenta sua operação tem vantagem competitiva real — no preço, no acesso a mercados e no crédito rural." },
              { title: "O campo merece tecnologia de ponta", text: "A complexidade do agronegócio brasileiro exige ferramentas à altura. Não aceitamos que a tecnologia disponível para o produtor rural seja inferior à disponível para qualquer outro setor." },
              { title: "Dados geram soberania", text: "Quando o Brasil documenta sua cadeia produtiva, ele negocia em posição de força. Rastreabilidade não é custo — é poder de barganha." },
            ].map(p => (
              <div key={p.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">{p.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSÃO ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#3B5E2B] px-6 py-16 text-center">
        <p className="mx-auto max-w-2xl text-2xl font-bold leading-10 text-white">
          &ldquo;Ser a infraestrutura digital do agronegócio brasileiro — da fazenda à mesa, do Brasil ao mundo.&rdquo;
        </p>
      </section>

      {/* ── A EMPRESA ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-gray-900">A empresa</h2>
        <div className="mt-6 space-y-4 text-base leading-8 text-gray-600">
          <p>Fundada em 2025 em São Paulo, a Agraas é uma agritech brasileira focada em rastreabilidade e inteligência para o agronegócio.</p>
          <p>Nosso primeiro cliente ativo — Fazenda São João da Boa Esperança, em Jandaia, Goiás — opera com 2.300 cabeças Nelore e já tem lote certificado Halal para exportação à Arábia Saudita.</p>
          <p>A plataforma está em operação com 78 páginas, 56 tabelas de dados, 4 score engines nativos e cobertura completa de pecuária, agricultura, fiscal e exportação.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/cadastro" className="rounded-2xl bg-[#3B5E2B] px-8 py-3 text-sm font-bold text-white hover:bg-[#2d4a21] transition">
            Criar conta
          </Link>
          <a href="mailto:contato@agraas.com.br" className="rounded-2xl border border-gray-200 px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            Fale com a gente
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/marketplace" className="hover:text-gray-900">Marketplace</Link>
            <Link href="/planos" className="hover:text-gray-900">Planos</Link>
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <Link href="/login" className="hover:text-gray-900">Login</Link>
          </div>
          <p className="text-xs text-gray-400">© 2026 Agraas Agritech. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
