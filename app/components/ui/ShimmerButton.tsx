"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ShimmerButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export default function ShimmerButton({
  href,
  onClick,
  children,
  variant = "primary",
  className = "",
}: ShimmerButtonProps) {
  const baseCls =
    variant === "primary"
      ? "group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[var(--primary)] px-7 py-[14px] text-[.9375rem] font-semibold text-white shadow-[0_14px_40px_rgba(93,156,68,.35)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_20px_50px_rgba(93,156,68,.5)]"
      : "group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-white/40 px-7 py-[14px] text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5";

  const content = (
    <>
      {/* Shimmer overlay */}
      {variant === "primary" && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut",
          }}
          style={{
            background:
              "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
          }}
        />
      )}
      <span className="relative flex items-center gap-2">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseCls} ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${baseCls} ${className}`}>
      {content}
    </button>
  );
}
