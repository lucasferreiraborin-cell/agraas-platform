import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse a plataforma Agraas — passaporte digital, scores em tempo real e marketplace.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
