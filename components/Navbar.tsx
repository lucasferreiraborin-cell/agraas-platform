export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <span className="text-lg font-bold text-emerald-300">A</span>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">
              Agraas
            </p>
            <p className="text-sm font-medium text-white">Agro Intelligence Platform</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#dashboard" className="text-sm text-white/70 transition hover:text-white">
            Dashboard
          </a>
          <a href="#animais" className="text-sm text-white/70 transition hover:text-white">
            Rebanho
          </a>
          <a href="#modulos" className="text-sm text-white/70 transition hover:text-white">
            Módulos
          </a>
          <a href="#graficos" className="text-sm text-white/70 transition hover:text-white">
            Indicadores
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/5 md:inline-flex">
            Entrar
          </button>
          <button className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300">
            Solicitar demo
          </button>
        </div>
      </div>
    </header>
  );
}