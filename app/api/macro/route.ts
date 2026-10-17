import { NextResponse } from "next/server";
import { fetchGlobalMarket } from "@/lib/server/cg";
import { fetchStablecoinsOverview } from "@/lib/server/defillama";
import { fetchFundingRates } from "@/lib/server/binance";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { DerivativesSentimentData, MacroIntelligenceData } from "@/lib/types";

export async function GET(req: Request) {
  const limit = rateLimit(getClientIp(req), { windowMs: 60_000, maxRequests: 120 });
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const [global, stablecoins, fundingRates, fngRes] = await Promise.all([
      fetchGlobalMarket().catch(() => null),
      fetchStablecoinsOverview().catch(() => null),
      fetchFundingRates().catch(() => []),
      fetch("https://api.alternative.me/fng/?limit=1", { next: { revalidate: 600 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    // Parse Fear & Greed
    let fearGreed = null;
    if (fngRes?.data?.[0]) {
      const d = fngRes.data[0];
      fearGreed = {
        value: parseInt(d.value, 10),
        classification: d.value_classification,
        timestamp: parseInt(d.timestamp, 10),
      };
    }

    // Process Derivatives Sentiment from Binance Futures
    let derivatives: DerivativesSentimentData | null = null;
    if (fundingRates && fundingRates.length > 0) {
      // Pick top benchmark pairs: BTC, ETH, SOL, BNB, DOGE, XRP, AVAX, LINK
      const topSymbols = [
        "BTCUSDT",
        "ETHUSDT",
        "SOLUSDT",
        "BNBUSDT",
        "DOGEUSDT",
        "XRPUSDT",
        "AVAXUSDT",
        "LINKUSDT",
      ];
      const benchmarkPerps = fundingRates.filter((f) => topSymbols.includes(f.symbol));
      const perpsToUse = benchmarkPerps.length > 0 ? benchmarkPerps : fundingRates.slice(0, 8);

      const avgRate =
        perpsToUse.reduce((sum, p) => sum + p.fundingRate, 0) / (perpsToUse.length || 1);
      const avgAnnualized =
        perpsToUse.reduce((sum, p) => sum + p.fundingRateAnnualizedPct, 0) /
        (perpsToUse.length || 1);

      let state: DerivativesSentimentData["state"] = "neutral";
      if (avgRate > 0.0003) state = "froth";
      else if (avgRate < -0.00005) state = "squeeze_bullish";
      else if (avgRate < 0) state = "bearish";

      derivatives = {
        avgFundingRate: Math.round(avgRate * 1000000) / 1000000,
        avgFundingRateAnnualizedPct: Math.round(avgAnnualized * 100) / 100,
        totalOpenInterestUsd: 0,
        state,
        topPerps: perpsToUse.map((p) => ({
          symbol: p.symbol,
          fundingRate: p.fundingRate,
          fundingRateAnnualizedPct: p.fundingRateAnnualizedPct,
          markPrice: p.markPrice,
        })),
      };
    }

    const payload: MacroIntelligenceData = {
      global,
      stablecoins,
      derivatives,
      fearGreed,
      timestamp: Date.now(),
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Failed to load macro intelligence" },
      { status: 502 },
    );
  }
}
