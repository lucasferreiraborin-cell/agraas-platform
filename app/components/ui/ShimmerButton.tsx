import Link from "next/link";
import type { ReactNode } from "react";

interface ShimmerButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

// Kept the name for compatibility, but shimmer overlay removed — too "AI demo" look.
// Simple, solid primary/secondary button now.
export default function ShimmerButton({
  href,
  onClick,
  children,
  variant = "primary",
  className = "",
}: ShimmerButtonProps) {
  const baseCls =
    variant === "primary"
      ? "group inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-[14px] text-[.9375rem] font-semibold text-white shadow-[0_10px_30px_rgba(46,139,62,.25)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_14px_40px_rgba(46,139,62,.35)]"
      : "group inline-flex items-center gap-2 rounded-xl border border-white/40 px-7 py-[14px] text-[.9375rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/5";

  if (href) {
    return (
      <Link href={href} className={`${baseCls} ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${baseCls} ${className}`}>
      {children}
    </button>
  );
}
