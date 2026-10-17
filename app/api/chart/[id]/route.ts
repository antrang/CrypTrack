import { NextRequest, NextResponse } from "next/server";
import { binanceSymbolFor } from "@/lib/coins";
import { fetchKlines } from "@/lib/server/binance";
import { cgFetch } from "@/lib/server/cg";
import { getPeriod } from "@/lib/periods";
import { CoinIdParamSchema } from "@/lib/schemas";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { Candle, ChartData, LinePoint } from "@/lib/types";

interface MarketChart {
  prices: [number, number][];
}

// Price chart for a coin over a period. Binance klines (OHLC, deep history)
// when mapped; CoinGecko line fallback (365-day cap on free tier) otherwise.
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
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

  const period = getPeriod(req.nextUrl.searchParams.get("period") || "24H");
  const symbol = binanceSymbolFor(id);

  try {
    if (symbol) {
      const klines = await fetchKlines(symbol, period.interval, period.limit, 30_000);
      const candles: Candle[] = klines.map((k) => ({
        t: k.t,
        o: k.o,
        h: k.h,
        l: k.l,
        c: k.c,
      }));
      const line: LinePoint[] = klines.map((k) => ({ t: k.t, v: k.c }));
      const change =
        klines.length >= 2
          ? {
              abs: klines[klines.length - 1].c - klines[0].c,
              pct:
                ((klines[klines.length - 1].c - klines[0].c) / klines[0].c) * 100,
            }
          : null;
      const payload: ChartData = { source: "binance", candles, line, change };
      return NextResponse.json(payload);
    }

    // CoinGecko fallback — line only, capped to 365 days.
    const days = Math.min(Math.ceil(period.lookbackMs / 86_400_000), 365);
    const chart = await cgFetch<MarketChart>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
      300_000,
    );
    const prices = chart.prices ?? [];
    const line: LinePoint[] = prices.map((p) => ({
      t: Math.floor(p[0] / 1000),
      v: p[1],
    }));
    const change =
      line.length >= 2
        ? {
            abs: line[line.length - 1].v - line[0].v,
            pct: ((line[line.length - 1].v - line[0].v) / line[0].v) * 100,
          }
        : null;
    const note =
      period.lookbackMs > 365 * 86_400_000
        ? "Candlesticks & >1y history need a Binance-listed coin; showing up to 1y (CoinGecko)."
        : "No Binance market — candlesticks unavailable for this coin.";
    const payload: ChartData = { source: "coingecko", candles: [], line, change, note };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to load chart" }, { status: 502 });
  }
}
