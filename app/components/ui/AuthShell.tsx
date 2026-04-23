"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  sidebarTitle?: string;
  sidebarMessage: string;
  sidebarBadges?: string[];
  sidebarFooter?: ReactNode;
  step?: { current: number; total: number };
}

export default function AuthShell({
  children,
  sidebarTitle = "Agraas",
  sidebarMessage,
  sidebarBadges,
  sidebarFooter,
  step,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <aside
        className="relative hidden w-[420px] shrink-0 overflow-hidden lg:block"
        style={{
          background:
            "linear-gradient(180deg, var(--sidebar) 0%, var(--sidebar-2) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsla(0,0%,100%,.04) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,.04) 1px, transparent 1px)",
            backgroundSize: "3rem 3rem",
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full opacity-[.08]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex h-full flex-col px-12 py-16">
          <Link href="/" className="block">
            <p className="text-[2rem] font-semibold tracking-[-0.06em] text-white">
              {sidebarTitle}
            </p>
            <p className="mt-1 text-[.8125rem] text-white/50">
              Plataforma do agro
            </p>
          </Link>

          <div className="mt-16 flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={sidebarMessage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                className="text-[1.4rem] font-medium leading-[1.4] tracking-[-.02em] text-white"
              >
                {sidebarMessage}
              </motion.p>
            </AnimatePresence>

            {sidebarBadges && sidebarBadges.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {sidebarBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-md border border-white/[.12] bg-white/[.06] px-3 py-1.5 font-mono text-[.6875rem] uppercase tracking-[.14em] text-white/70"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto">
            {step && (
              <div className="mb-6 flex items-center gap-2">
                {Array.from({ length: step.total }).map((_, i) => {
                  const n = i + 1;
                  const active = step.current >= n;
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                          active
                            ? "bg-white text-[var(--sidebar-2)]"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {n}
                      </span>
                      {n < step.total && (
                        <div
                          className={`h-px w-8 transition-colors ${
                            step.current > n ? "bg-white/50" : "bg-white/15"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {sidebarFooter}
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link
            href="/"
            className="text-[1.25rem] font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
          >
            Agraas
          </Link>
          {step && (
            <span className="font-mono text-[.6875rem] uppercase tracking-[.14em] text-[var(--text-muted)]">
              {step.current} de {step.total}
            </span>
          )}
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-16 lg:py-16">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
