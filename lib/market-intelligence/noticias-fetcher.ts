/**
 * Fetcher Notícias Agrícolas + ABIEC + Embrapa via RSS público.
 *
 * RSS é a forma mais estável de coletar notícias agro sem bloqueio Cloudflare.
 * - Notícias Agrícolas: rss/noticias.xml (pecuária)
 * - Embrapa: notícias institucionais via API CKAN
 * - MAPA: feed.rss (gov.br)
 *
 * Parser XML simples sem libs (não temos xml2js no projeto — fast-xml-parser
 * é overkill). Regex pra extrair <item>, <title>, <link>, <description>, <pubDate>.
 */

import type { MarketFetcher, FetcherResult, MarketSignal, Persona } from "./types";

type RssItem = {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
};

function parseRss(xml: string, max = 5): RssItem[] {
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
  const items: RssItem[] = [];
  let m;
  while ((m = itemRe.exec(xml)) && items.length < max) {
    const block = m[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");
    if (title && link) items.push({ title, link, description, pubDate });
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  return (m[1] ?? m[2] ?? "").trim()
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .slice(0, 500);
}

async function fetchRss(url: string, timeoutMs = 10_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Agraas/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const SOURCES = [
  {
    name: "noticias-agricolas",
    url: "https://www.noticiasagricolas.com.br/rss/noticias/pecuaria.xml",
    affects: ["produtor","frigorifico","banco"] as Persona[],
    kind: "noticia" as const,
    priority: 3 as const,
  },
  {
    name: "embrapa",
    url: "https://www.embrapa.br/rss/noticias",
    affects: ["produtor","frigorifico"] as Persona[],
    kind: "publicacao" as const,
    priority: 2 as const,
  },
  {
    name: "mapa",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/noticias/rss.xml",
    affects: ["produtor","frigorifico","banco"] as Persona[],
    kind: "regulacao" as const,
    priority: 2 as const,
  },
];

export const noticiasFetcher: MarketFetcher = {
  name: "noticias",
  async fetch(): Promise<FetcherResult> {
    const signals: MarketSignal[] = [];
    const errors: string[] = [];

    for (const src of SOURCES) {
      const xml = await fetchRss(src.url);
      if (!xml) {
        errors.push(`${src.name}: fetch falhou (${src.url})`);
        continue;
      }
      const items = parseRss(xml, 5);
      if (items.length === 0) {
        errors.push(`${src.name}: RSS parseado mas sem items`);
        continue;
      }
      for (const it of items) {
        const published = it.pubDate ? new Date(it.pubDate) : new Date();
        const validDate = isNaN(published.getTime()) ? new Date() : published;
        signals.push({
          source: src.name,
          kind: src.kind,
          title: it.title,
          summary: it.description ?? "",
          url: it.link,
          priority: src.priority,
          affects_persona: src.affects,
          published_at: validDate.toISOString(),
          metadata: { rss_url: src.url },
        });
      }
    }

    return {
      fetcher: "noticias",
      ok: signals.length > 0,
      signals,
      errors,
    };
  },
};
