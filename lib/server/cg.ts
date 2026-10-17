// Server-only CoinGecko fetch helper with a small in-memory TTL cache to stay
// under the public rate limit. Shared by route handlers.
import { LruCache } from "@/lib/cache";

const CG_BASE = "https://api.coingecko.com/api/v3";
const cache = new LruCache<unknown>(128, 30_000);

export async function cgFetch<T>(path: string, ttlMs = 30_000): Promise<T> {
  const hit = cache.get(path);
  if (hit !== undefined) return hit as T;

  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const res = await fetch(`${CG_BASE}${path}`, {
    headers,
    next: { revalidate: Math.floor(ttlMs / 1000) },
  });
  if (!res.ok) {
    // Serve stale data on upstream failure (e.g. rate limit) when we have it.
    const stale = cache.getStale(path);
    if (stale !== undefined) return stale as T;
    throw new Error(`CoinGecko ${res.status}`);
  }
  const data = (await res.json()) as T;
  cache.set(path, data, ttlMs);
  return data;
}

export interface GlobalMarketRaw {
  data?: {
    active_cryptocurrencies?: number;
    total_market_cap?: Record<string, number>;
    total_volume?: Record<string, number>;
    market_cap_percentage?: Record<string, number>;
    market_cap_change_percentage_24h_usd?: number;
  };
}

export async function fetchGlobalMarket(): Promise<{
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominancePct: number;
  ethDominancePct: number;
  marketCapChange24hPct: number;
  activeCryptos: number;
}> {
  try {
    const raw = await cgFetch<GlobalMarketRaw>("/global", 60_000);
    const d = raw.data || {};
    return {
      totalMarketCapUsd: d.total_market_cap?.usd ?? 0,
      totalVolume24hUsd: d.total_volume?.usd ?? 0,
      btcDominancePct: Math.round((d.market_cap_percentage?.btc ?? 0) * 10) / 10,
      ethDominancePct: Math.round((d.market_cap_percentage?.eth ?? 0) * 10) / 10,
      marketCapChange24hPct:
        Math.round((d.market_cap_change_percentage_24h_usd ?? 0) * 100) / 100,
      activeCryptos: d.active_cryptocurrencies ?? 0,
    };
  } catch {
    return {
      totalMarketCapUsd: 0,
      totalVolume24hUsd: 0,
      btcDominancePct: 0,
      ethDominancePct: 0,
      marketCapChange24hPct: 0,
      activeCryptos: 0,
    };
  }
}
