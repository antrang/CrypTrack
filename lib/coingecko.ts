// Client-side fetch helpers that hit our own proxy routes (avoids CORS and
// centralizes caching). All return typed data or throw.
import type { FearGreed, MarketCoin } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function fetchMarkets(): Promise<MarketCoin[]> {
  return getJson<MarketCoin[]>("/api/markets");
}

export function searchMarkets(query: string): Promise<MarketCoin[]> {
  return getJson<MarketCoin[]>(`/api/markets?search=${encodeURIComponent(query)}`);
}

export interface CoinChart {
  closes: number[];
  prices: [number, number][]; // [timestamp, price]
}

export function fetchCoinChart(coinId: string, days = 100): Promise<CoinChart> {
  return getJson<CoinChart>(`/api/coin/${coinId}?days=${days}`);
}

export function fetchFearGreed(): Promise<FearGreed> {
  return getJson<FearGreed>("/api/fear-greed");
}

// Direct simple-price poll through our markets proxy is heavy; expose a light
// price fallback for coins without a Binance stream.
export interface SimplePrice {
  [coinId: string]: { price: number; changePct24h: number };
}

export function fetchSimplePrices(coinIds: string[]): Promise<SimplePrice> {
  const ids = coinIds.join(",");
  return getJson<SimplePrice>(`/api/prices?ids=${encodeURIComponent(ids)}`);
}

// --- v2 helpers ---
import type {
  ChartData,
  ConceptCategory,
  Insight,
  NewsArticle,
  PeriodChange,
  TrendingCoin,
} from "./types";
import type { InsightContext } from "./server/ai";

export function fetchChart(coinId: string, period: string): Promise<ChartData> {
  return getJson<ChartData>(
    `/api/chart/${encodeURIComponent(coinId)}?period=${encodeURIComponent(period)}`,
  );
}

export function fetchChanges(coinId: string): Promise<Record<string, PeriodChange>> {
  return getJson<Record<string, PeriodChange>>(
    `/api/changes/${encodeURIComponent(coinId)}`,
  );
}

export function fetchNews(symbol: string): Promise<NewsArticle[]> {
  return getJson<NewsArticle[]>(`/api/news?symbol=${encodeURIComponent(symbol)}`);
}

export interface DiscoverData {
  trending: TrendingCoin[];
  categories: ConceptCategory[];
}

export function fetchDiscover(): Promise<DiscoverData> {
  return getJson<DiscoverData>("/api/discover");
}

export async function fetchInsight(ctx: InsightContext): Promise<Insight> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ctx),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Insight failed: ${res.status}`);
  }
  return (await res.json()) as Insight;
}

// --- v3 helpers ---
import type { SignalsData } from "./types";
import type { AnalyzeContext } from "./server/ai";

export function fetchSignals(coinId: string): Promise<SignalsData> {
  return getJson<SignalsData>(`/api/signals/${encodeURIComponent(coinId)}`);
}

export async function fetchAnalysis(
  coinId: string,
  ctx: AnalyzeContext,
): Promise<Insight> {
  const res = await fetch(`/api/analyze/${encodeURIComponent(coinId)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ctx),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Analysis failed: ${res.status}`);
  }
  return (await res.json()) as Insight;
}

// --- v4 helpers ---
import type { MacroIntelligenceData, RecommendationItem } from "./types";

export function fetchMacro(): Promise<MacroIntelligenceData> {
  return getJson<MacroIntelligenceData>("/api/macro");
}

export function fetchRecommendations(): Promise<RecommendationItem[]> {
  return getJson<RecommendationItem[]>("/api/recommendations");
}

export function fetchFearGreedHistory(limit = 30): Promise<FearGreed[]> {
  return getJson<FearGreed[]>(`/api/fear-greed?limit=${limit}`);
}

