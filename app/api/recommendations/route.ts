import { NextResponse } from "next/server";
import { cgFetch } from "@/lib/server/cg";
import { binanceSymbolFor } from "@/lib/coins";
import { fetchKlines } from "@/lib/server/binance";
import { fetchFundingRates } from "@/lib/server/binance";
import { fetchTopProtocols } from "@/lib/server/defillama";
import { computeIndicators } from "@/lib/indicators";
import { detectLevels } from "@/lib/levels";
import { evaluateRecommendation, type CandidateContext } from "@/lib/recommendations";
import { LruCache } from "@/lib/cache";
import type { MarketCoin, RecommendationItem, TimeframeKey, Indicators } from "@/lib/types";

const recsCache = new LruCache<RecommendationItem[]>(1, 60_000);

export async function GET() {
  const cached = recsCache.get("recommendations");
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // 1. Fetch top coins by market cap from CoinGecko
    const markets = await cgFetch<MarketCoin[]>(
      "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1&sparkline=true&price_change_percentage=24h",
      60_000,
    );

    // 2. Fetch parallel external macro / on-chain signals
    const [protocols, fundingRates, fngRes] = await Promise.all([
      fetchTopProtocols().catch(() => []),
      fetchFundingRates().catch(() => []),
      fetch("https://api.alternative.me/fng/?limit=1", { next: { revalidate: 600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const fearGreedValue = fngRes?.data?.[0]?.value ? parseInt(fngRes.data[0].value, 10) : 50;

    // Create fast lookup maps
    const protocolsBySymbol = new Map(
      protocols.map((p) => [p.symbol.toUpperCase(), p]),
    );
    const fundingBySymbol = new Map(
      fundingRates.map((f) => [f.symbol.toUpperCase(), f.fundingRate]),
    );

    // Filter out stablecoins (USDT, USDC, DAI, FDUSD, USDe, etc.)
    const STABLECOIN_SYMBOLS = new Set(["USDT", "USDC", "DAI", "FDUSD", "USDE"]);
    const candidateCoins = markets.filter(
      (m) => !STABLECOIN_SYMBOLS.has(m.symbol.toUpperCase()),
    );

    // 3. Process candidate coins (fetch klines for top coins)
    const recommendations: RecommendationItem[] = [];

    await Promise.all(
      candidateCoins.map(async (coin) => {
        try {
          const sym = coin.symbol.toUpperCase();
          const binanceSym = binanceSymbolFor(coin.id);

          const matrix: Partial<Record<TimeframeKey, Indicators>> = {};
          let levels: { price: number; touches: number; kind: "support" | "resistance" }[] = [];

          if (binanceSym) {
            // Fetch 1D and 4H klines
            const [dailyKlines, h4Klines] = await Promise.all([
              fetchKlines(binanceSym, "1d", 100, 300_000).catch(() => []),
              fetchKlines(binanceSym, "4h", 60, 120_000).catch(() => []),
            ]);

            if (dailyKlines.length >= 30) {
              matrix["1D"] = computeIndicators(dailyKlines.map((k) => k.c));
              levels = detectLevels(
                dailyKlines.map((k) => ({ h: k.h, l: k.l, c: k.c })),
                coin.current_price,
              );
            }
            if (h4Klines.length >= 20) {
              matrix["4H"] = computeIndicators(h4Klines.map((k) => k.c));
            }
          } else if (coin.sparkline_in_7d?.price?.length) {
            // Fallback for coins without Binance klines using 7d sparkline
            const prices = coin.sparkline_in_7d.price;
            matrix["1D"] = computeIndicators(prices);
            levels = detectLevels(
              prices.map((p) => ({ h: p, l: p, c: p })),
              coin.current_price,
            );
          }

          // Match On-chain TVL data
          const proto = protocolsBySymbol.get(sym);
          const tvlGrowth7d = proto?.change7d ?? null;

          // Match Derivatives funding rate
          const fundingKey = `${sym}USDT`;
          const fundingRate = fundingBySymbol.get(fundingKey) ?? null;

          const ctx: CandidateContext = {
            coin,
            matrix,
            levels,
            tvlGrowth7d,
            fundingRate,
            fearGreedValue,
          };

          const rec = evaluateRecommendation(ctx);
          recommendations.push(rec);
        } catch {
          // If a single coin evaluation fails, continue with others
        }
      }),
    );

    // Sort by overall score descending
    recommendations.sort((a, b) => b.overallScore - a.overallScore);

    recsCache.set("recommendations", recommendations, 60_000);

    return NextResponse.json(recommendations);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 502 },
    );
  }
}
