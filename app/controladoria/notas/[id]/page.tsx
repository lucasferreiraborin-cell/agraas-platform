import { Receipt } from "lucide-react";
import StubInConstruction from "@/app/components/controladoria/StubInConstruction";

export const dynamic = "force-dynamic";

export default async function NotaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StubInConstruction
      badge={`Controladoria · Nota ${id.slice(0, 8)}`}
      title="Revisão de NF-e"
      description="Tela de revisão lado a lado: extração feita pela IA à esquerda, confirmação humana à direita. Cada campo precisa ser aprovado antes de aplicar ao estoque e gerar lançamento contábil."
      icon={Receipt}
      bullets={[
        "Campos extraídos com nível de confiança da IA por linha.",
        "Diff visual entre o XML/PDF original e a estrutura proposta.",
        "Botões aprovar · ajustar · rejeitar (com motivo).",
      ]}
    />
  );
}
