import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Planos Agraas para fazendeiros, frigoríficos, exportadores e cooperativas — do Starter ao Enterprise. Teste piloto sem cobrança inicial.",
};

export default function PlanosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
