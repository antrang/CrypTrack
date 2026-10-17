// Multi-Factor Quantitative & Fundamental Recommendation Engine for CrypTrack.
import type {
  HypothesisTag,
  Indicators,
  MarketCoin,
  PillarScores,
  RecommendationItem,
  TradeLevels,
} from "./types";

export interface CandidateContext {
  coin: MarketCoin;
  matrix?: Partial<Record<"1H" | "4H" | "1D" | "1W", Indicators>>;
  levels?: { price: number; touches: number; kind: "support" | "resistance" }[];
  tvlGrowth7d?: number | null; // e.g. +8.5%
  tvlGrowth30d?: number | null;
  fundingRate?: number | null; // e.g. 0.0001 (0.01%)
  fearGreedValue?: number | null; // 0 - 100
  categoryName?: string;
}

/**
 * Pillar 1: Technical Momentum & Multi-Timeframe Confluence (30%)
 */
export function computeTechnicalScore(
  matrix: Partial<Record<"1H" | "4H" | "1D" | "1W", Indicators>> = {},
  priceChange24h = 0,
): number {
  let score = 50; // start at neutral

  const d1 = matrix["1D"];
  const h4 = matrix["4H"];

  // 1D RSI analysis
  if (d1?.rsi !== null && d1?.rsi !== undefined) {
    if (d1.rsi >= 50 && d1.rsi <= 68) {
      score += 15; // Bullish momentum sweet spot
    } else if (d1.rsi > 68 && d1.rsi <= 78) {
      score += 8; // Strong but heating up
    } else if (d1.rsi > 78) {
      score -= 10; // Overbought penalty
    } else if (d1.rsi < 30) {
      score += 12; // Oversold potential bounce
    } else if (d1.rsi < 45) {
      score -= 8; // Bearish drift
    }
  }

  // 1D Trend (SMA20 vs SMA50)
  if (d1?.sma20 && d1?.sma50) {
    if (d1.sma20 > d1.sma50) {
      score += 12; // Golden cross / bullish alignment
    } else {
      score -= 10; // Death cross
    }
  }

  // 4H Confluence (MACD histogram)
  if (h4?.histogram !== null && h4?.histogram !== undefined) {
    if (h4.histogram > 0) score += 10;
    else score -= 8;
  }

  // 24h momentum bonus
  if (priceChange24h > 1.5 && priceChange24h < 15) score += 8;
  else if (priceChange24h > 15) score += 2; // extended
  else if (priceChange24h < -8) score -= 8;

  return Math.max(10, Math.min(95, Math.round(score)));
}

/**
 * Pillar 2: On-Chain & Fundamental Growth (25%)
 */
export function computeFundamentalScore(
  marketCapRank: number,
  tvlGrowth7d?: number | null,
  tvlGrowth30d?: number | null,
): number {
  let score = 50;

  // Market Cap Quality Tier
  if (marketCapRank <= 10) score += 20;
  else if (marketCapRank <= 30) score += 15;
  else if (marketCapRank <= 100) score += 10;
  else score += 5;

  // On-Chain TVL Momentum (DeFiLlama)
  if (typeof tvlGrowth7d === "number") {
    if (tvlGrowth7d > 10) score += 18;
    else if (tvlGrowth7d > 3) score += 10;
    else if (tvlGrowth7d < -5) score -= 12;
  }

  if (typeof tvlGrowth30d === "number") {
    if (tvlGrowth30d > 20) score += 12;
    else if (tvlGrowth30d < -15) score -= 10;
  }

  return Math.max(15, Math.min(95, Math.round(score)));
}

/**
 * Pillar 3: Macro & Derivatives Sentiment (25%)
 */
export function computeMacroScore(
  fundingRate?: number | null,
  fearGreedValue?: number | null,
): number {
  let score = 50;

  // Binance Perpetual Funding Rate
  if (typeof fundingRate === "number") {
    // 0.0001 = 0.01% standard baseline
    if (fundingRate < 0) {
      score += 18; // Negative funding = short-squeeze setup!
    } else if (fundingRate <= 0.00015) {
      score += 10; // Healthy neutral leverage
    } else if (fundingRate > 0.0004) {
      score -= 20; // Extreme froth / long liquidation hazard!
    } else if (fundingRate > 0.00025) {
      score -= 10; // Elevated leverage
    }
  }

  // Fear & Greed contrarian context
  if (typeof fearGreedValue === "number") {
    if (fearGreedValue <= 25) {
      score += 16; // Extreme Fear = Prime Accumulation Zone
    } else if (fearGreedValue <= 45) {
      score += 8; // Moderate Fear / Caution
    } else if (fearGreedValue >= 80) {
      score -= 14; // Extreme Greed = High Risk
    } else if (fearGreedValue >= 65) {
      score -= 6; // Greed
    }
  }

  return Math.max(10, Math.min(95, Math.round(score)));
}

/**
 * Pillar 4: Risk-Reward & Market Structure (20%)
 */
export function computeRiskRewardScore(
  currentPrice: number,
  levels: { price: number; kind: "support" | "resistance" }[] = [],
): { score: number; tradeLevels: TradeLevels } {
  const supports = levels
    .filter((l) => l.kind === "support" && l.price < currentPrice)
    .sort((a, b) => b.price - a.price);

  const resistances = levels
    .filter((l) => l.kind === "resistance" && l.price > currentPrice)
    .sort((a, b) => a.price - b.price);

  const nearestSupport = supports[0]?.price ?? currentPrice * 0.94;
  const nearestResistance = resistances[0]?.price ?? currentPrice * 1.08;
  const secondaryResistance = resistances[1]?.price ?? currentPrice * 1.18;
  const invalidationStop = nearestSupport * 0.975;

  const potentialGain = nearestResistance - currentPrice;
  const potentialLoss = Math.max(0.0001, currentPrice - invalidationStop);
  const rr = potentialGain / potentialLoss;

  let score = 50;
  if (rr >= 3.0) score += 35;
  else if (rr >= 2.0) score += 25;
  else if (rr >= 1.5) score += 10;
  else if (rr < 1.0) score -= 25;

  // Proximity to support bonus (buying close to support gives better risk control)
  const distToSupportPct = ((currentPrice - nearestSupport) / currentPrice) * 100;
  if (distToSupportPct < 3.5) score += 12;

  const entryMin = Math.max(nearestSupport, currentPrice * 0.985);
  const entryMax = Math.min(currentPrice * 1.01, nearestResistance * 0.98);

  const tradeLevels: TradeLevels = {
    entryZone: [entryMin, entryMax],
    target1: nearestResistance,
    target2: secondaryResistance,
    invalidation: invalidationStop,
    riskRewardRatio: Math.round(rr * 10) / 10,
  };

  return {
    score: Math.max(15, Math.min(95, Math.round(score))),
    tradeLevels,
  };
}

/**
 * Evaluates candidate coin and outputs full RecommendationItem.
 */
export function evaluateRecommendation(ctx: CandidateContext): RecommendationItem {
  const { coin, matrix = {}, levels = [], tvlGrowth7d, tvlGrowth30d, fundingRate, fearGreedValue } = ctx;
  const price = coin.current_price;

  const technical = computeTechnicalScore(matrix, coin.price_change_percentage_24h);
  const fundamental = computeFundamentalScore(coin.market_cap_rank, tvlGrowth7d, tvlGrowth30d);
  const macro = computeMacroScore(fundingRate, fearGreedValue);
  const { score: riskReward, tradeLevels } = computeRiskRewardScore(price, levels);

  // 4-Pillar Weighted Composite: 30% Tech, 25% Fund, 25% Macro, 20% RR
  const composite = Math.round(
    0.3 * technical + 0.25 * fundamental + 0.25 * macro + 0.2 * riskReward,
  );

  let convictionTier: RecommendationItem["convictionTier"] = "Neutral";
  if (composite >= 76) convictionTier = "High Conviction";
  else if (composite >= 62) convictionTier = "Favorable";
  else if (composite <= 40) convictionTier = "Caution";

  // Hypothesis Classification
  let hypothesis: HypothesisTag = "Ecosystem Narrative Leader";
  let hypothesisRationale = "Holding market strength with active volume participation.";

  const d1 = matrix["1D"];
  if (tvlGrowth7d && tvlGrowth7d > 4 && fundamental >= 65) {
    hypothesis = "DeFi Cashflow Accumulation";
    hypothesisRationale = `Strong capital inflows (${tvlGrowth7d > 0 ? "+" : ""}${tvlGrowth7d.toFixed(1)}% 7d TVL) with solid fundamental backing.`;
  } else if (technical >= 72 && coin.price_change_percentage_24h > 1.5) {
    hypothesis = "Momentum Breakout";
    hypothesisRationale = "Multi-timeframe trend confluence with expanding MACD and healthy RSI.";
  } else if ((d1?.rsi !== null && d1?.rsi !== undefined && d1.rsi < 38) || (riskReward >= 75 && tradeLevels.riskRewardRatio >= 2.5)) {
    hypothesis = "Oversold Value Reversal";
    hypothesisRationale = "Priced directly at key multi-touch support with high asymmetric upside.";
  } else {
    hypothesis = "Ecosystem Narrative Leader";
    hypothesisRationale = `Market cap rank #${coin.market_cap_rank} holding structural resilience across cycles.`;
  }

  const pillars: PillarScores = {
    technical,
    fundamental,
    macro,
    riskReward,
  };

  return {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    currentPrice: price,
    priceChange24h: coin.price_change_percentage_24h,
    marketCapRank: coin.market_cap_rank,
    overallScore: composite,
    convictionTier,
    hypothesis,
    hypothesisRationale,
    pillars,
    levels: tradeLevels,
  };
}
