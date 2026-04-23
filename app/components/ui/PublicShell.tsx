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
  showScrollProgress = true,
  showFooter = true,
  showScrollToTop = true,
  className,
}: PublicShellProps) {
  return (
    <div className={className ?? "min-h-screen"}>
      <MotionProvider>
        {showScrollProgress && <ScrollProgress />}
        <PublicNav />
        {children}
        {showFooter && <PublicFooter />}
        {showScrollToTop && <ScrollToTop />}
      </MotionProvider>
    </div>
  );
}
