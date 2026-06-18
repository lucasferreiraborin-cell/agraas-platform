/**
 * Tipos canônicos do sistema de Market Intelligence.
 *
 * Cada fonte (CEPEA, Embrapa, MAPA, ABIEC, notícias) implementa um Fetcher
 * que retorna sinais normalizados pra `market_signals`. A IA consome esses
 * sinais para gerar insights por persona via /api/insights/{persona}.
 */

export type MarketKind = "cotacao" | "noticia" | "regulacao" | "publicacao" | "indicador" | "alerta";
export type Persona = "produtor" | "frigorifico" | "banco";

export type MarketSignal = {
  source: string;
  kind: MarketKind;
  title: string;
  summary?: string;
  raw_value?: number;
  raw_unit?: string;
  url?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  affects_persona: Persona[];
  published_at: string; // ISO
  metadata?: Record<string, unknown>;
};

export type FetcherResult = {
  fetcher: string;
  ok: boolean;
  signals: MarketSignal[];
  errors: string[];
};

export interface MarketFetcher {
  name: string;
  fetch(): Promise<FetcherResult>;
}
