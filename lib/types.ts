// Shared domain types for CrypTrack.

export interface MarketCoin {
  id: string; // CoinGecko id, e.g. "bitcoin"
  symbol: string; // e.g. "btc"
  name: string; // e.g. "Bitcoin"
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

export interface Holding {
  coinId: string; // CoinGecko id
  symbol: string; // upper-case, e.g. "BTC"
  name: string;
  image: string;
  qty: number;
  buyPrice: number; // per-unit cost basis in USD
}

export type AlertDirection = "above" | "below";

export interface Alert {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  direction: AlertDirection;
  target: number; // USD threshold
  createdAt: number;
  triggeredAt: number | null;
}

export interface FearGreed {
  value: number; // 0-100
  classification: string; // e.g. "Greed"
  timestamp: number; // unix seconds
}

export type TimeframeKey = "1H" | "4H" | "1D" | "1W";

export interface Indicators {
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  lastClose: number | null;
}

// --- v2: charts, periods, news, discover, insights ---

export interface Candle {
  t: number; // unix seconds (lightweight-charts time)
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface LinePoint {
  t: number; // unix seconds
  v: number; // close price
}

export interface ChartData {
  source: "binance" | "coingecko";
  candles: Candle[]; // empty when source is coingecko (line only)
  line: LinePoint[];
  change: { pct: number; abs: number } | null;
  note?: string; // e.g. fallback / range-limit note
}

export interface PeriodChange {
  pct: number;
  abs: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  body: string;
  imageUrl: string;
  publishedAt: number; // unix seconds
}

export interface TrendingCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  marketCapRank: number | null;
  priceChange24h: number | null;
}

export interface ConceptCategory {
  id: string;
  name: string;
  change24h: number; // market cap % change 24h
  marketCap: number;
  top: string[]; // representative coin symbols/names
}

export interface Insight {
  markdown: string;
  generatedAt: number;
  model: string;
}

// --- v3: trading signals ---

export interface SignalsData {
  price: number | null;
  partial: boolean; // true when only daily data was available (no Binance)
  score: {
    score: number;
    label: string;
    bullishTimeframes: number;
    totalTimeframes: number;
  };
  matrix: Partial<Record<"1H" | "4H" | "1D" | "1W", Indicators>>;
  levels: { price: number; touches: number; kind: "support" | "resistance" }[];
}

// --- v4: portfolio hub, macro intelligence & recommendations ---

export type PortfolioBucketType = "core" | "tactical" | "defi" | "custom";

export interface PortfolioBucket {
  id: string;
  name: string;
  type: PortfolioBucketType;
  description?: string;
  color?: string;
  createdAt: number;
}

export type TransactionType = "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT";

export interface Transaction {
  id: string;
  bucketId: string;
  coinId: string;
  symbol: string;
  name: string;
  type: TransactionType;
  amount: number;             // Coin quantity
  pricePerUnitUsd: number;    // Unit execution price in USD
  feeUsd?: number;            // Fee in USD
  timestamp: number;          // Unix ms
  notes?: string;
}

export interface AggregatedPosition {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  totalQty: number;
  avgBuyPrice: number;        // Weighted average cost basis in USD
  totalCostBasis: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  realizedPl: number;
  allocationPct: number;
  change24h: number;
}

export interface PortfolioTotals {
  value: number;
  cost: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  realizedPl: number;
  totalPl: number;
}

export interface GlobalMarketData {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominancePct: number;
  ethDominancePct: number;
  marketCapChange24hPct: number;
  activeCryptos: number;
}

export interface StablecoinFlowData {
  totalCirculatingUsd: number;
  change7dUsd: number;
  change7dPct: number;
  topCoins: { symbol: string; name: string; circulating: number }[];
}

export interface DerivativesSentimentData {
  avgFundingRate: number;     // e.g. 0.0001 (0.01%)
  avgFundingRateAnnualizedPct: number;
  totalOpenInterestUsd: number;
  state: "froth" | "neutral" | "squeeze_bullish" | "bearish";
  topPerps: {
    symbol: string;
    fundingRate: number;
    fundingRateAnnualizedPct: number;
    markPrice: number;
    openInterestUsd?: number;
  }[];
}

export interface MacroIntelligenceData {
  global: GlobalMarketData | null;
  stablecoins: StablecoinFlowData | null;
  derivatives: DerivativesSentimentData | null;
  fearGreed: FearGreed | null;
  timestamp: number;
}

export type HypothesisTag =
  | "DeFi Cashflow Accumulation"
  | "Momentum Breakout"
  | "Oversold Value Reversal"
  | "Ecosystem Narrative Leader";

export interface PillarScores {
  technical: number;    // 0-100 (30% weight)
  fundamental: number;  // 0-100 (25% weight)
  macro: number;        // 0-100 (25% weight)
  riskReward: number;   // 0-100 (20% weight)
}

export interface TradeLevels {
  entryZone: [number, number];  // [min, max]
  target1: number;
  target2: number;
  invalidation: number;
  riskRewardRatio: number;
}

export interface RecommendationItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  marketCapRank: number;
  overallScore: number;         // 0-100 composite
  convictionTier: "High Conviction" | "Favorable" | "Neutral" | "Caution";
  hypothesis: HypothesisTag;
  hypothesisRationale: string;
  pillars: PillarScores;
  levels: TradeLevels;
}

