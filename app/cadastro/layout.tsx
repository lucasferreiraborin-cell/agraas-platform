import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Cadastre-se na Agraas em 2 minutos. Suas notas viram custo por animal e FUNRURAL apurado, com o rebanho rastreado.",
};

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
