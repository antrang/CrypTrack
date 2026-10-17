import { describe, expect, it } from "vitest";
import { evaluateRecommendation } from "./recommendations";
import type { MarketCoin } from "./types";

const coin = (overrides: Partial<MarketCoin> = {}): MarketCoin => ({
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "",
  current_price: 50_000,
  market_cap: 1e12,
  market_cap_rank: 1,
  total_volume: 1e10,
  price_change_percentage_24h: 2,
  ...overrides,
});

describe("evaluateRecommendation", () => {
  it("produces a high-conviction recommendation for strong technicals", () => {
    const rec = evaluateRecommendation({
      coin: coin({ price_change_percentage_24h: 5 }),
      matrix: {
        "1D": {
          rsi: 60,
          sma20: 52_000,
          sma50: 50_000,
          macd: 100,
          signal: 50,
          histogram: 50,
          lastClose: 52_000,
        },
      },
      levels: [
        { price: 49_000, touches: 3, kind: "support" },
        { price: 60_000, touches: 2, kind: "resistance" },
      ],
      fundingRate: -0.0001,
      fearGreedValue: 20,
    });
    expect(rec.convictionTier).toBe("High Conviction");
    expect(rec.overallScore).toBeGreaterThanOrEqual(76);
  });

  it("produces caution for poor risk-reward", () => {
    const rec = evaluateRecommendation({
      coin: coin(),
      matrix: {
        "1D": {
          rsi: 40,
          sma20: 49_000,
          sma50: 50_000,
          macd: -10,
          signal: 0,
          histogram: -10,
          lastClose: 49_000,
        },
      },
      levels: [],
      fundingRate: 0.0005,
      fearGreedValue: 85,
    });
    expect(rec.convictionTier).toBe("Caution");
  });

  it("provides trade levels even with no detected levels", () => {
    const rec = evaluateRecommendation({
      coin: coin({ current_price: 100 }),
      matrix: {},
      levels: [],
    });
    expect(rec.levels.entryZone[0]).toBeGreaterThan(0);
    expect(rec.levels.target1).toBeGreaterThan(rec.levels.entryZone[1]);
    expect(rec.levels.invalidation).toBeLessThan(rec.levels.entryZone[0]);
  });
});
