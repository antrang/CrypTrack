import { NextResponse } from "next/server";
import { binanceSymbolFor } from "@/lib/coins";
import { fetchKlines } from "@/lib/server/binance";
import { cgFetch } from "@/lib/server/cg";
import { computeIndicators } from "@/lib/indicators";
import { computeScore, type TimeframeKey } from "@/lib/score";
import { detectLevels } from "@/lib/levels";
import { CoinIdParamSchema } from "@/lib/schemas";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { Indicators, SignalsData } from "@/lib/types";

// One call powers the composite score, the multi-timeframe matrix, and the
// support/resistance levels for a coin.
const TF_KLINES: { tf: TimeframeKey; interval: string; limit: number; ttl: number }[] = [
  { tf: "1H", interval: "1h", limit: 200, ttl: 60_000 },
  { tf: "4H", interval: "4h", limit: 200, ttl: 120_000 },
  { tf: "1D", interval: "1d", limit: 250, ttl: 300_000 },
  { tf: "1W", interval: "1w", limit: 200, ttl: 600_000 },
];

interface MarketChart {
  prices: [number, number][];
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const req = _req as Request & { headers: Headers; ip?: string | null };
  const limit = rateLimit(getClientIp(req), { windowMs: 60_000, maxRequests: 120 });
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: rawId } = await ctx.params;
  const idParse = CoinIdParamSchema.safeParse(rawId);
  if (!idParse.success) {
    return NextResponse.json({ error: "Invalid coin id" }, { status: 400 });
  }
  const id = idParse.data;

  const symbol = binanceSymbolFor(id);

  try {
    if (symbol) {
      const series = await Promise.all(
        TF_KLINES.map((t) => fetchKlines(symbol, t.interval, t.limit, t.ttl)),
      );
      const matrix: Partial<Record<TimeframeKey, Indicators>> = {};
      TF_KLINES.forEach((t, i) => {
        const closes = series[i].map((k) => k.c);
        if (closes.length >= 30) matrix[t.tf] = computeIndicators(closes);
      });

      const daily = series[2]; // 1d klines
      const price = daily.at(-1)?.c ?? null;
      const levels =
        price !== null
          ? detectLevels(
              daily.map((k) => ({ h: k.h, l: k.l, c: k.c })),
              price,
            )
          : [];

      const payload: SignalsData = {
        price,
        partial: false,
        score: computeScore(matrix),
        matrix,
        levels,
      };
      return NextResponse.json(payload);
    }

    // CoinGecko fallback: daily closes only → 1D indicators, no intraday TFs,
    // levels from close-only bars (h=l=c approximation).
    const chart = await cgFetch<MarketChart>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=250&interval=daily`,
      300_000,
    );
    const closes = (chart.prices ?? []).map((p) => p[1]);
    const price = closes.at(-1) ?? null;
    const matrix: Partial<Record<TimeframeKey, Indicators>> = {};
    if (closes.length >= 30) matrix["1D"] = computeIndicators(closes);
    const levels =
      price !== null
        ? detectLevels(
            closes.map((c) => ({ h: c, l: c, c })),
            price,
          )
        : [];

    const payload: SignalsData = {
      price,
      partial: true,
      score: computeScore(matrix),
      matrix,
      levels,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to load signals" }, { status: 502 });
  }
}
