import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0f3517] px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(hsla(0,0%,100%,.04) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.04) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(46,139,62,0.15) 0%, transparent 60%)",
        }}
      />

      <div className="relative">
        <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
          404 · página não encontrada
        </p>
        <h1 className="mt-6 text-[clamp(4rem,12vw,9rem)] font-medium leading-none tracking-[-.05em] text-white">
          404
        </h1>
        <p className="mx-auto mt-8 max-w-md text-[1.0625rem] leading-[1.7] text-white/60">
          Esta página não existe — ou foi movida junto com o rebanho.
          Volte ao início ou explore o marketplace.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-3.5 text-[.9375rem] font-semibold text-white shadow-[0_14px_40px_rgba(93,156,68,.35)] transition-all hover:bg-[var(--primary-hover)]"
          >
            <Home size={15} />
            Voltar ao início
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-[.9375rem] font-semibold text-white transition hover:border-white/60 hover:bg-white/5"
          >
            <ArrowLeft size={14} />
            Ver marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
