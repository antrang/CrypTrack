import { describe, expect, it } from "vitest";
import { computeIndicators, ema, macd, rsi, sma } from "./indicators";

describe("sma", () => {
  it("returns null when not enough data", () => {
    expect(sma([1, 2, 3], 5)).toBeNull();
  });

  it("computes simple moving average", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
  });
});

describe("ema", () => {
  it("returns nulls for warmup period", () => {
    const result = ema([1, 2, 3, 4, 5], 5);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
    expect(result[3]).toBeNull();
    expect(result[4]).toBe(3);
  });

  it("returns empty array for empty input", () => {
    expect(ema([], 5)).toEqual([]);
  });
});

describe("rsi", () => {
  it("returns null with insufficient data", () => {
    expect(rsi(Array(14).fill(100))).toBeNull();
  });

  it("returns 100 when no losses", () => {
    const prices = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(rsi(prices)).toBe(100);
  });

  it("returns low RSI for falling prices", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 20 - i);
    const result = rsi(prices);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(50);
  });
});

describe("macd", () => {
  it("returns nulls when not enough data", () => {
    expect(macd([1, 2, 3, 4, 5])).toEqual({
      macd: null,
      signal: null,
      histogram: null,
    });
  });

  it("produces positive MACD for strongly rising prices", () => {
    const prices = Array.from({ length: 60 }, (_, i) => i + 1);
    const result = macd(prices);
    expect(result.macd).toBeGreaterThan(0);
    expect(result.signal).toBeGreaterThan(0);
    expect(result.histogram).not.toBeNull();
  });
});

describe("computeIndicators", () => {
  it("computes all indicators for sufficient data", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const indicators = computeIndicators(closes);
    expect(indicators.rsi).not.toBeNull();
    expect(indicators.sma20).not.toBeNull();
    expect(indicators.sma50).not.toBeNull();
    expect(indicators.macd).not.toBeNull();
    expect(indicators.signal).not.toBeNull();
    expect(indicators.lastClose).toBe(closes[closes.length - 1]);
  });

  it("returns nulls for insufficient data", () => {
    const indicators = computeIndicators([1, 2, 3]);
    expect(indicators.rsi).toBeNull();
    expect(indicators.sma20).toBeNull();
    expect(indicators.sma50).toBeNull();
    expect(indicators.macd).toBeNull();
  });
});
