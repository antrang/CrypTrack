import { describe, expect, it } from "vitest";
import {
  AnalyzeContextSchema,
  CoinIdParamSchema,
  CoinIdsQuerySchema,
  InsightContextSchema,
} from "./schemas";

describe("CoinIdParamSchema", () => {
  it("accepts valid coin ids", () => {
    expect(CoinIdParamSchema.safeParse("bitcoin").success).toBe(true);
    expect(CoinIdParamSchema.safeParse("avalanche-2").success).toBe(true);
  });

  it("rejects invalid characters", () => {
    expect(CoinIdParamSchema.safeParse("bit coin<script>").success).toBe(false);
  });
});

describe("CoinIdsQuerySchema", () => {
  it("parses comma-separated ids", () => {
    const result = CoinIdsQuerySchema.safeParse("bitcoin,ethereum,solana");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(["bitcoin", "ethereum", "solana"]);
  });

  it("caps at 250 ids", () => {
    const ids = Array.from({ length: 300 }, (_, i) => `coin-${i}`).join(",");
    const result = CoinIdsQuerySchema.safeParse(ids);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(250);
  });
});

describe("InsightContextSchema", () => {
  it("accepts valid context", () => {
    const result = InsightContextSchema.safeParse({
      portfolio: {
        totalValue: 1000,
        totalCost: 900,
        plPct: 11.1,
        holdings: [{ symbol: "BTC", allocationPct: 100, plPct: 11.1 }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects oversized holdings list", () => {
    const holdings = Array.from({ length: 101 }, (_, i) => ({
      symbol: `C${i}`,
      allocationPct: 1,
      plPct: 0,
    }));
    const result = InsightContextSchema.safeParse({ portfolio: { holdings } });
    expect(result.success).toBe(false);
  });
});

describe("AnalyzeContextSchema", () => {
  it("accepts valid context", () => {
    const result = AnalyzeContextSchema.safeParse({
      symbol: "BTC",
      name: "Bitcoin",
      price: 50_000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty symbol", () => {
    const result = AnalyzeContextSchema.safeParse({
      symbol: "",
      name: "Bitcoin",
      price: null,
    });
    expect(result.success).toBe(false);
  });
});
