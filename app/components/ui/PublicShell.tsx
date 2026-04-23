import type { ReactNode } from "react";
import PublicNav from "@/app/components/PublicNav";
import PublicFooter from "@/app/components/ui/PublicFooter";
import { ScrollProgress } from "@/app/components/ui/Motion";
import ScrollToTop from "@/app/components/ui/ScrollToTop";
import MotionProvider from "@/app/components/ui/MotionProvider";

interface PublicShellProps {
  children: ReactNode;
  showScrollProgress?: boolean;
  showFooter?: boolean;
  showScrollToTop?: boolean;
  className?: string;
}

export default function PublicShell({
  children,
  showScrollProgress = false,
  showFooter = true,
  showScrollToTop = true,
  className,
}: PublicShellProps) {
  return (
    <div className={className ?? "min-h-screen"}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-[.875rem] focus:font-semibold focus:text-white focus:shadow-[var(--shadow-green)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
      >
        Pular para o conteúdo
      </a>
      <MotionProvider>
        {showScrollProgress && <ScrollProgress />}
        <PublicNav />
        <div id="main-content">
          {children}
        </div>
        {showFooter && <PublicFooter />}
        {showScrollToTop && <ScrollToTop />}
      </MotionProvider>
    </div>
  );
}
