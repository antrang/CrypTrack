import { NextResponse } from "next/server";
import { cgFetch } from "@/lib/server/cg";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { ConceptCategory, TrendingCoin } from "@/lib/types";

interface TrendingResponse {
  coins: {
    item: {
      id: string;
      symbol: string;
      name: string;
      large?: string;
      thumb?: string;
      market_cap_rank: number | null;
      data?: { price_change_percentage_24h?: { usd?: number } };
    };
  }[];
}

interface CategoryResponse {
  id: string;
  name: string;
  market_cap: number | null;
  market_cap_change_24h: number | null;
  top_3_coins?: string[];
}

// Discovery feed: trending (most-searched) coins + narrative/concept categories
// gaining the most market cap over 24h.
export async function GET(req: Request) {
  const limit = rateLimit(getClientIp(req), { windowMs: 60_000, maxRequests: 120 });
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const [trendingRaw, categoriesRaw] = await Promise.all([
      cgFetch<TrendingResponse>("/search/trending", 120_000),
      cgFetch<CategoryResponse[]>(
        "/coins/categories?order=market_cap_change_24h_desc",
        300_000,
      ),
    ]);

    const trending: TrendingCoin[] = (trendingRaw.coins ?? [])
      .slice(0, 10)
      .map((c) => ({
        id: c.item.id,
        symbol: c.item.symbol,
        name: c.item.name,
        image: c.item.large ?? c.item.thumb ?? "",
        marketCapRank: c.item.market_cap_rank,
        priceChange24h: c.item.data?.price_change_percentage_24h?.usd ?? null,
      }));

    const categories: ConceptCategory[] = (categoriesRaw ?? [])
      .filter((c) => typeof c.market_cap_change_24h === "number" && (c.market_cap ?? 0) > 0)
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        name: c.name,
        change24h: c.market_cap_change_24h ?? 0,
        marketCap: c.market_cap ?? 0,
        top: c.top_3_coins ?? [], // image URLs of leading coins
      }));

    return NextResponse.json({ trending, categories });
  } catch {
    return NextResponse.json({ error: "Failed to load discover" }, { status: 502 });
  }
}
