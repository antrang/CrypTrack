// Server-only DeFiLlama fetch helper (100% Free, Open, Zero Auth).
// Caches responses in-memory with TTL and serves stale on upstream errors.
import { LruCache } from "@/lib/cache";

const DEFILLAMA_BASE = "https://api.llama.fi";
const STABLECOINS_BASE = "https://stablecoins.llama.fi";

const cache = new LruCache<unknown>(32, 300_000);

export interface ProtocolData {
  id: string;
  name: string;
  symbol: string;
  category: string;
  tvl: number;
  change1d: number;
  change7d: number;
  mcap: number;
}

export interface StablecoinOverview {
  totalCirculatingUsd: number;
  change7dUsd: number;
  change7dPct: number;
  topCoins: { symbol: string; name: string; circulating: number }[];
}

export async function fetchTopProtocols(ttlMs = 300_000): Promise<ProtocolData[]> {
  const cacheKey = "defillama_protocols";
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit as ProtocolData[];

  try {
    const res = await fetch(`${DEFILLAMA_BASE}/protocols`, {
      next: { revalidate: Math.floor(ttlMs / 1000) },
    });
    if (!res.ok) {
      const stale = cache.getStale(cacheKey);
      if (stale !== undefined) return stale as ProtocolData[];
      throw new Error(`DeFiLlama ${res.status}`);
    }

    interface RawProtocol {
      id: string;
      name: string;
      symbol: string;
      category?: string;
      tvl?: number;
      change_1d?: number;
      change_7d?: number;
      mcap?: number;
    }

    const raw = (await res.json()) as RawProtocol[];
    const data: ProtocolData[] = (raw || [])
      .filter((p) => p.tvl && p.tvl > 10_000_000) // active protocols with >$10M TVL
      .slice(0, 100)
      .map((p) => ({
        id: p.id,
        name: p.name,
        symbol: p.symbol || "",
        category: p.category || "DeFi",
        tvl: p.tvl || 0,
        change1d: p.change_1d || 0,
        change7d: p.change_7d || 0,
        mcap: p.mcap || 0,
      }));

    cache.set(cacheKey, data, ttlMs);
    return data;
  } catch {
    const stale = cache.getStale(cacheKey);
    if (stale !== undefined) return stale as ProtocolData[];
    return [];
  }
}

export async function fetchStablecoinsOverview(ttlMs = 300_000): Promise<StablecoinOverview> {
  const cacheKey = "defillama_stablecoins";
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit as StablecoinOverview;

  try {
    const res = await fetch(`${STABLECOINS_BASE}/stablecoins?includePrices=true`, {
      next: { revalidate: Math.floor(ttlMs / 1000) },
    });
    if (!res.ok) {
      const stale = cache.getStale(cacheKey);
      if (stale !== undefined) return stale as StablecoinOverview;
      throw new Error(`DeFiLlama Stablecoins ${res.status}`);
    }

    interface PeggedAsset {
      symbol: string;
      name: string;
      circulating?: { peggedUSD?: number };
      circulatingPrevWeek?: { peggedUSD?: number };
    }

    const raw = (await res.json()) as { peggedAssets?: PeggedAsset[] };
    const assets = raw.peggedAssets || [];

    let totalCirculatingUsd = 0;
    let totalPrevWeekUsd = 0;

    const topCoins: { symbol: string; name: string; circulating: number }[] = [];

    for (const a of assets) {
      const circ = a.circulating?.peggedUSD || 0;
      const prev = a.circulatingPrevWeek?.peggedUSD || circ;
      totalCirculatingUsd += circ;
      totalPrevWeekUsd += prev;

      if (topCoins.length < 5 && circ > 100_000_000) {
        topCoins.push({
          symbol: a.symbol,
          name: a.name,
          circulating: circ,
        });
      }
    }

    const change7dUsd = totalCirculatingUsd - totalPrevWeekUsd;
    const change7dPct =
      totalPrevWeekUsd > 0 ? (change7dUsd / totalPrevWeekUsd) * 100 : 0;

    const data: StablecoinOverview = {
      totalCirculatingUsd,
      change7dUsd,
      change7dPct,
      topCoins,
    };

    cache.set(cacheKey, data, ttlMs);
    return data;
  } catch {
    const stale = cache.getStale(cacheKey);
    if (stale !== undefined) return stale as StablecoinOverview;
    return {
      totalCirculatingUsd: 180_000_000_000,
      change7dUsd: 0,
      change7dPct: 0,
      topCoins: [],
    };
  }
}
