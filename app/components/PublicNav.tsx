import Link from "next/link";

export default function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#3B5E2B]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-[-0.04em] text-white">
          Agraas
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link href="/marketplace" className="text-sm font-medium text-white/75 hover:text-white transition">
            Marketplace
          </Link>
          <Link href="/sobre" className="text-sm font-medium text-white/75 hover:text-white transition">
            Sobre
          </Link>
          <Link href="/planos" className="text-sm font-medium text-white/75 hover:text-white transition">
            Planos
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login"
            className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">
            Entrar
          </Link>
          <Link href="/cadastro"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#3B5E2B] hover:bg-white/90 transition">
            Criar conta
          </Link>
        </div>
      </div>
    </nav>
  );
}
