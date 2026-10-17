// Timeframe definitions shared by the chart selector and the period-change strip.

export type PeriodKey =
  | "1H"
  | "6H"
  | "12H"
  | "24H"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "2Y"
  | "3Y"
  | "5Y";

export interface PeriodDef {
  key: PeriodKey;
  label: string;
  /** Binance kline interval used when charting this period. */
  interval: string;
  /** Number of candles to request (all ≤ 1000 Binance cap). */
  limit: number;
  /** Lookback window in ms — used to locate the period-start candle. */
  lookbackMs: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const PERIODS: PeriodDef[] = [
  { key: "1H", label: "1H", interval: "1m", limit: 60, lookbackMs: HOUR },
  { key: "6H", label: "6H", interval: "5m", limit: 72, lookbackMs: 6 * HOUR },
  { key: "12H", label: "12H", interval: "15m", limit: 48, lookbackMs: 12 * HOUR },
  { key: "24H", label: "24H", interval: "15m", limit: 96, lookbackMs: DAY },
  { key: "1W", label: "1W", interval: "1h", limit: 168, lookbackMs: 7 * DAY },
  { key: "1M", label: "1M", interval: "4h", limit: 180, lookbackMs: 30 * DAY },
  { key: "3M", label: "3M", interval: "12h", limit: 180, lookbackMs: 90 * DAY },
  { key: "6M", label: "6M", interval: "1d", limit: 180, lookbackMs: 180 * DAY },
  { key: "1Y", label: "1Y", interval: "1d", limit: 365, lookbackMs: 365 * DAY },
  { key: "2Y", label: "2Y", interval: "1w", limit: 104, lookbackMs: 730 * DAY },
  { key: "3Y", label: "3Y", interval: "1w", limit: 156, lookbackMs: 1095 * DAY },
  { key: "5Y", label: "5Y", interval: "1w", limit: 260, lookbackMs: 1825 * DAY },
];

export const PERIOD_KEYS = PERIODS.map((p) => p.key);

export function getPeriod(key: string): PeriodDef {
  return PERIODS.find((p) => p.key === key) ?? PERIODS[3]; // default 24H
}

// Resolutions used by the changes route to cover all periods with few calls.
// Binance caps klines at 1000/request, so intraday uses 5m (≈30h span) to
// reliably reach back a full 24h with margin.
export const CHANGE_RESOLUTIONS = {
  intraday: { interval: "5m", limit: 360 }, // ~30h of 5-min candles
  daily: { interval: "1d", limit: 400 }, // ~13 months
  weekly: { interval: "1w", limit: 300 }, // ~5.7 years
} as const;

// Which resolution each period reads its start-close from.
export function resolutionFor(key: PeriodKey): keyof typeof CHANGE_RESOLUTIONS {
  if (key === "1H" || key === "6H" || key === "12H" || key === "24H") return "intraday";
  if (key === "2Y" || key === "3Y" || key === "5Y") return "weekly";
  return "daily";
}
