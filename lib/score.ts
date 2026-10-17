// Deterministic composite technical score (0-100) from multi-timeframe
// indicators. No AI involved — pure, instant, unit-testable.
import type { Indicators } from "./types";

export type TimeframeKey = "1H" | "4H" | "1D" | "1W";
export const TIMEFRAMES: TimeframeKey[] = ["1H", "4H", "1D", "1W"];

export type SignalLabel =
  | "Strong Sell"
  | "Sell"
  | "Neutral"
  | "Buy"
  | "Strong Buy";

export interface CompositeScore {
  score: number; // 0-100 (50 = neutral)
  label: SignalLabel;
  bullishTimeframes: number; // how many TFs lean bullish
  totalTimeframes: number;
}

// Per-timeframe lean in [-1, +1] from its indicators.
function timeframeLean(ind: Indicators): number {
  let sum = 0;
  let n = 0;

  if (ind.rsi !== null) {
    // RSI: >50 momentum-bullish, <50 bearish; extremes damped toward
    // mean-reversion (RSI 90 is less bullish than RSI 65).
    let r = (ind.rsi - 50) / 50; // -1..+1
    if (ind.rsi > 75) r *= 0.5;
    if (ind.rsi < 25) r *= 0.5;
    sum += r;
    n++;
  }

  if (ind.histogram !== null && ind.lastClose) {
    // MACD histogram sign, magnitude-normalized by price and squashed.
    const h = ind.histogram / ind.lastClose;
    sum += Math.max(-1, Math.min(1, h * 400));
    n++;
  }

  if (ind.sma20 !== null && ind.sma50 !== null) {
    // Trend: SMA20 vs SMA50 spread, squashed.
    const spread = (ind.sma20 - ind.sma50) / ind.sma50;
    sum += Math.max(-1, Math.min(1, spread * 20));
    n++;
  }

  return n ? sum / n : 0;
}

// Timeframe weights: higher TFs carry more decision weight.
const TF_WEIGHT: Record<TimeframeKey, number> = {
  "1H": 0.15,
  "4H": 0.2,
  "1D": 0.35,
  "1W": 0.3,
};

export function computeScore(
  matrix: Partial<Record<TimeframeKey, Indicators>>,
): CompositeScore {
  let weighted = 0;
  let weightSum = 0;
  let bullish = 0;
  let total = 0;

  for (const tf of TIMEFRAMES) {
    const ind = matrix[tf];
    if (!ind) continue;
    const lean = timeframeLean(ind);
    weighted += lean * TF_WEIGHT[tf];
    weightSum += TF_WEIGHT[tf];
    total++;
    if (lean > 0.05) bullish++;
  }

  const norm = weightSum ? weighted / weightSum : 0; // -1..+1
  const score = Math.round((norm + 1) * 50); // 0..100

  let label: SignalLabel = "Neutral";
  if (score >= 70) label = "Strong Buy";
  else if (score >= 58) label = "Buy";
  else if (score <= 30) label = "Strong Sell";
  else if (score <= 42) label = "Sell";

  return { score, label, bullishTimeframes: bullish, totalTimeframes: total };
}

// Cell-level read used by the matrix UI.
export type CellState = "bull" | "bear" | "flat";

export function rsiState(rsi: number | null): CellState {
  if (rsi === null) return "flat";
  if (rsi >= 55) return "bull";
  if (rsi <= 45) return "bear";
  return "flat";
}

export function macdState(histogram: number | null): CellState {
  if (histogram === null) return "flat";
  return histogram >= 0 ? "bull" : "bear";
}

export function trendState(
  sma20: number | null,
  sma50: number | null,
): CellState {
  if (sma20 === null || sma50 === null) return "flat";
  const spread = (sma20 - sma50) / sma50;
  if (spread > 0.002) return "bull";
  if (spread < -0.002) return "bear";
  return "flat";
}
