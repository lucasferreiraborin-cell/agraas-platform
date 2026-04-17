import Link from "next/link";

export default function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(90deg,#3d762c_0%,#294f1d_100%)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-[1.6rem] font-semibold tracking-[-0.06em] text-white">Agraas</span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/40 sm:inline">Platform</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/marketplace" className="text-[14px] font-medium text-white/70 hover:text-white transition">Marketplace</Link>
          <Link href="/planos" className="text-[14px] font-medium text-white/70 hover:text-white transition">Planos</Link>
          <Link href="/sobre" className="text-[14px] font-medium text-white/70 hover:text-white transition">Sobre</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login"
            className="rounded-xl border border-white/30 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-white/10 transition">
            Entrar
          </Link>
          <Link href="/cadastro"
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] transition">
            Criar conta
          </Link>
        </div>
      </div>
    </nav>
  );
}
