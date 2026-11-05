import type { MetadataRoute } from "next";

const SITE_URL = "https://www.agraas.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const paginas: { rota: string; prioridade: number; frequencia: "daily" | "monthly" }[] = [
    { rota: "", prioridade: 1, frequencia: "daily" },
    { rota: "/sobre", prioridade: 0.7, frequencia: "monthly" },
    { rota: "/marketplace", prioridade: 0.6, frequencia: "monthly" },
    { rota: "/privacidade", prioridade: 0.3, frequencia: "monthly" },
    { rota: "/termos", prioridade: 0.3, frequencia: "monthly" },
  ];

  return paginas.map(({ rota, prioridade, frequencia }) => ({
    url: `${SITE_URL}${rota}`,
    lastModified: new Date(),
    changeFrequency: frequencia,
    priority: prioridade,
  }));
}
