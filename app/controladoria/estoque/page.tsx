import { Boxes } from "lucide-react";
import StubInConstruction from "@/app/components/controladoria/StubInConstruction";

export const dynamic = "force-dynamic";

export default function EstoquePage() {
  return (
    <StubInConstruction
      badge="Controladoria · Estoque"
      title="Estoque integrado a NF-e"
      description="Controle de insumos com entrada automática a partir de NF-e revisadas e baixa por aplicação no rebanho."
      icon={Boxes}
      bullets={[
        "Entrada por NF-e revisada (sem digitação dupla).",
        "Baixa automática quando uma aplicação sanitária é registrada.",
        "Alerta de estoque mínimo por insumo crítico.",
      ]}
    />
  );
}
