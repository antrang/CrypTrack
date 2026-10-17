// Pure technical-indicator functions over a series of closing prices.
import type { Indicators } from "./types";

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Exponential moving average. Returns an array aligned with `values` where the
 * first `period - 1` entries are `null` (not enough data) and remaining entries
 * are the EMA at that index.
 */
export function ema(values: number[], period: number): (number | null)[] {
  if (values.length === 0 || period <= 0) return [];
  if (values.length < period) return values.map(() => null);

  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  // Seed with the simple average of the first `period` values.
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (i === period - 1) {
      out.push(prev);
      continue;
    }
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  // Wilder smoothing across the remainder of the series.
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: number | null; signal: number | null; histogram: number | null } {
  if (values.length < slow + signalPeriod) {
    return { macd: null, signal: null, histogram: null };
  }
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);

  // MACD line aligned to the input series.
  const macdLine: (number | null)[] = values.map((_, i) => {
    const f = emaFast[i];
    const s = emaSlow[i];
    return f !== null && s !== null ? f - s : null;
  });

  // Signal line is the EMA of the MACD line. We compute it over the non-null
  // segment and then map it back to indices aligned with the original series.
  const validIndices: number[] = [];
  const validMacd: number[] = [];
  macdLine.forEach((v, i) => {
    if (v !== null) {
      validIndices.push(i);
      validMacd.push(v);
    }
  });

  const signalLineAligned = ema(validMacd, signalPeriod);
  const signalLine: (number | null)[] = macdLine.map(() => null);
  validIndices.forEach((idx, i) => {
    signalLine[idx] = signalLineAligned[i];
  });

  const lastIdx = macdLine.length - 1;
  const macdVal = macdLine[lastIdx];
  const signalVal = signalLine[lastIdx];

  const histogram =
    macdVal !== null && signalVal !== null ? macdVal - signalVal : null;

  return {
    macd: macdVal,
    signal: signalVal,
    histogram,
  };
}

export function bollingerBands(
  values: number[],
  period = 20,
  stdDevMult = 2,
): { upper: number | null; middle: number | null; lower: number | null } {
  if (values.length < period) return { upper: null, middle: null, lower: null };
  const slice = values.slice(values.length - period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: mean + stdDev * stdDevMult,
    middle: mean,
    lower: mean - stdDev * stdDevMult,
  };
}

export function atr(
  candles: { h: number; l: number; c: number }[],
  period = 14,
): number | null {
  if (candles.length <= period) return null;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      cur.h - cur.l,
      Math.abs(cur.h - prev.c),
      Math.abs(cur.l - prev.c),
    );
    trs.push(tr);
  }

  if (trs.length < period) return null;
  // Wilder smoothing for ATR
  let prevAtr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    prevAtr = (prevAtr * (period - 1) + trs[i]) / period;
  }
  return prevAtr;
}

export function computeIndicators(closes: number[]): Indicators {
  const m = macd(closes);
  return {
    rsi: rsi(closes),
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    macd: m.macd,
    signal: m.signal,
    histogram: m.histogram,
    lastClose: closes.length ? closes[closes.length - 1] : null,
  };
}
