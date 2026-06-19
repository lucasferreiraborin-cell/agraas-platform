import { TrendingUp } from "lucide-react";
import StubInConstruction from "@/app/components/controladoria/StubInConstruction";

export const dynamic = "force-dynamic";

export default function CashFlowPage() {
  return (
    <StubInConstruction
      badge="Controladoria · Cash flow"
      title="Projeção de fluxo de caixa"
      description="Projeção de entradas e saídas por safra e ciclo produtivo, alimentada pelas NF-e revisadas e pelo plano de contas."
      icon={TrendingUp}
      bullets={[
        "Horizonte de 12 meses com cenários otimista, base e conservador.",
        "Sinalização de meses negativos e necessidade de crédito.",
        "Integração com o módulo de Banco para antecipação de recebíveis.",
      ]}
    />
  );
}
