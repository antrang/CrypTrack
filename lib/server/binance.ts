// Server-only Binance REST helper (klines) with a small TTL cache.
// Mirrors the caching shape of lib/server/cg.ts.
import { LruCache } from "@/lib/cache";

const BINANCE_BASE = "https://api.binance.com/api/v3";

// Raw kline tuple: [openTime, open, high, low, close, volume, closeTime, ...]
type RawKline = [number, string, string, string, string, string, number, ...unknown[]];

export interface Kline {
  t: number; // open time, unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
}

const cache = new LruCache<Kline[]>(128, 30_000);

export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number,
  ttlMs = 30_000,
): Promise<Kline[]> {
  const path = `/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const hit = cache.get(path);
  if (hit !== undefined) return hit;

  const res = await fetch(`${BINANCE_BASE}${path}`, {
    next: { revalidate: Math.floor(ttlMs / 1000) },
  });
  if (!res.ok) {
    const stale = cache.getStale(path);
    if (stale !== undefined) return stale;
    throw new Error(`Binance ${res.status}`);
  }
  const raw = (await res.json()) as RawKline[];
  const data: Kline[] = raw.map((k) => ({
    t: Math.floor(k[0] / 1000),
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
  }));
  cache.set(path, data, ttlMs);
  return data;
}

// --- Binance Futures Public API (Zero Auth) ---
const BINANCE_FUTURES_BASE = "https://fapi.binance.com/fapi/v1";

export interface PremiumIndexItem {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
  time: number;
}

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingRateAnnualizedPct: number;
  markPrice: number;
}

const futuresCache = new LruCache<unknown>(32, 60_000);

export async function fetchFundingRates(ttlMs = 60_000): Promise<FundingRateData[]> {
  const cacheKey = "funding_rates";
  const hit = futuresCache.get(cacheKey);
  if (hit !== undefined) return hit as FundingRateData[];

  try {
    const res = await fetch(`${BINANCE_FUTURES_BASE}/premiumIndex`, {
      next: { revalidate: Math.floor(ttlMs / 1000) },
    });
    if (!res.ok) {
      const stale = futuresCache.getStale(cacheKey);
      if (stale !== undefined) return stale as FundingRateData[];
      throw new Error(`Binance Futures ${res.status}`);
    }
    const raw = (await res.json()) as PremiumIndexItem[];
    const data: FundingRateData[] = (Array.isArray(raw) ? raw : [raw])
      .filter((r) => r.symbol && r.symbol.endsWith("USDT"))
      .map((r) => {
        const rate = parseFloat(r.lastFundingRate) || 0;
        // 3 funding intervals per day * 365 = 1095 funding periods per year
        const annualized = rate * 3 * 365 * 100;
        return {
          symbol: r.symbol,
          fundingRate: rate,
          fundingRateAnnualizedPct: Math.round(annualized * 100) / 100,
          markPrice: parseFloat(r.markPrice) || 0,
        };
      });

    futuresCache.set(cacheKey, data, ttlMs);
    return data;
  } catch {
    const stale = futuresCache.getStale(cacheKey);
    if (stale !== undefined) return stale as FundingRateData[];
    return [];
  }
}

export async function fetchOpenInterest(symbol: string, ttlMs = 60_000): Promise<number | null> {
  const cacheKey = `oi_${symbol}`;
  const hit = futuresCache.get(cacheKey);
  if (hit !== undefined) return hit as number;

  try {
    const res = await fetch(`${BINANCE_FUTURES_BASE}/openInterest?symbol=${symbol}`, {
      next: { revalidate: Math.floor(ttlMs / 1000) },
    });
    if (!res.ok) {
      const stale = futuresCache.getStale(cacheKey);
      if (stale !== undefined) return stale as number;
      return null;
    }
    const raw = (await res.json()) as { openInterest: string };
    const oi = parseFloat(raw.openInterest) || 0;
    futuresCache.set(cacheKey, oi, ttlMs);
    return oi;
  } catch {
    const stale = futuresCache.getStale(cacheKey);
    return stale !== undefined ? (stale as number) : null;
  }
}
