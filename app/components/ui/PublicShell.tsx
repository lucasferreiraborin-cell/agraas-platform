import type { ReactNode } from "react";
import PublicNav from "@/app/components/PublicNav";
import PublicFooter from "@/app/components/ui/PublicFooter";
import { ScrollProgress } from "@/app/components/ui/Motion";

interface PublicShellProps {
  children: ReactNode;
  showScrollProgress?: boolean;
  showFooter?: boolean;
  className?: string;
}

export default function PublicShell({
  children,
  showScrollProgress = true,
  showFooter = true,
  className,
}: PublicShellProps) {
  return (
    <div className={className ?? "min-h-screen"}>
      {showScrollProgress && <ScrollProgress />}
      <PublicNav />
      {children}
      {showFooter && <PublicFooter />}
    </div>
  );
}
