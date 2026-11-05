import type { MetadataRoute } from "next";

const SITE_URL = "https://www.agraas.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Rotas de API e administração: nada aqui é conteúdo pra indexar, e a
      // maioria exige login — crawlear só desperdiça orçamento de rastreio.
      disallow: ["/api/", "/admin/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
