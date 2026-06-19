import { BookOpen } from "lucide-react";
import StubInConstruction from "@/app/components/controladoria/StubInConstruction";

export const dynamic = "force-dynamic";

export default function ContasPage() {
  return (
    <StubInConstruction
      badge="Controladoria · Contas"
      title="Plano de contas"
      description="Plano de contas adaptado ao produtor rural e lançamentos contábeis manuais ou automáticos a partir de NF-e revisadas."
      icon={BookOpen}
      bullets={[
        "Plano de contas padrão Agraas com perfis para pecuária e grãos.",
        "Lançamentos automáticos disparados pela aprovação de uma NF-e.",
        "Conciliação bancária e exportação para o contador.",
      ]}
    />
  );
}
