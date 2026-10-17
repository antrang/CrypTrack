import { describe, expect, it } from "vitest";
import { computeScore, rsiState, macdState, trendState } from "./score";
import type { Indicators } from "./types";

const ind = (overrides: Partial<Indicators> = {}): Indicators => ({
  rsi: 50,
  sma20: 100,
  sma50: 100,
  macd: 0,
  signal: 0,
  histogram: 0,
  lastClose: 100,
  ...overrides,
});

describe("computeScore", () => {
  it("returns neutral for flat indicators", () => {
    const result = computeScore({
      "1H": ind(),
      "4H": ind(),
      "1D": ind(),
      "1W": ind(),
    });
    expect(result.label).toBe("Neutral");
    expect(result.score).toBe(50);
  });

  it("returns Strong Buy for bullish confluence", () => {
    const bullish = ind({ rsi: 65, histogram: 1, sma20: 105, sma50: 100, lastClose: 100 });
    const result = computeScore({
      "1D": bullish,
      "1W": bullish,
    });
    expect(result.label).toBe("Strong Buy");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("returns Strong Sell for bearish confluence", () => {
    const bearish = ind({ rsi: 35, histogram: -1, sma20: 95, sma50: 100, lastClose: 100 });
    const result = computeScore({
      "1D": bearish,
      "1W": bearish,
    });
    expect(result.label).toBe("Strong Sell");
    expect(result.score).toBeLessThanOrEqual(30);
  });
});

describe("state helpers", () => {
  it("classifies RSI", () => {
    expect(rsiState(60)).toBe("bull");
    expect(rsiState(40)).toBe("bear");
    expect(rsiState(50)).toBe("flat");
  });

  it("classifies MACD histogram", () => {
    expect(macdState(1)).toBe("bull");
    expect(macdState(-1)).toBe("bear");
  });

  it("classifies trend", () => {
    expect(trendState(101, 100)).toBe("bull");
    expect(trendState(99, 100)).toBe("bear");
    expect(trendState(100.1, 100)).toBe("flat");
  });
});
