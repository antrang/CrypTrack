import { NextRequest, NextResponse } from "next/server";
import { binanceSymbolFor } from "@/lib/coins";
import { fetchKlines, type Kline } from "@/lib/server/binance";
import { cgFetch } from "@/lib/server/cg";
import {
  CHANGE_RESOLUTIONS,
  PERIODS,
  resolutionFor,
  type PeriodKey,
} from "@/lib/periods";
import { CoinIdParamSchema } from "@/lib/schemas";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { PeriodChange } from "@/lib/types";

// % change across all 12 timeframes. Binance: 3 kline pulls cover everything.
// Fallback: CoinGecko market_data percentage fields (partial coverage).
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

  const symbol = binanceSymbolFor(id);

  try {
    if (symbol) {
      const [intraday, daily, weekly] = await Promise.all([
        fetchKlines(symbol, CHANGE_RESOLUTIONS.intraday.interval, CHANGE_RESOLUTIONS.intraday.limit, 30_000),
        fetchKlines(symbol, CHANGE_RESOLUTIONS.daily.interval, CHANGE_RESOLUTIONS.daily.limit, 60_000),
        fetchKlines(symbol, CHANGE_RESOLUTIONS.weekly.interval, CHANGE_RESOLUTIONS.weekly.limit, 300_000),
      ]);
      const byRes = { intraday, daily, weekly };
      const last =
        intraday.at(-1)?.c ?? daily.at(-1)?.c ?? weekly.at(-1)?.c ?? null;
      const nowSec = Date.now() / 1000;

      const out: Record<string, PeriodChange> = {};
      for (const p of PERIODS) {
        const series = byRes[resolutionFor(p.key as PeriodKey)];
        if (!series.length || last === null) continue;
        const startSec = nowSec - p.lookbackMs / 1000;
        const startClose = closeAtOrBefore(series, startSec);
        if (startClose === null) continue; // history too short
        out[p.key] = {
          abs: last - startClose,
          pct: ((last - startClose) / startClose) * 100,
        };
      }
      return NextResponse.json(out);
    }

    // CoinGecko fallback (partial periods).
    const data = await cgFetch<{
      market_data?: Record<string, Record<string, number>>;
    }>(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false`,
      60_000,
    );
    const md = data.market_data ?? {};
    const cur = md.current_price?.usd;
    const pctMap: Partial<Record<PeriodKey, string>> = {
      "1H": "price_change_percentage_1h_in_currency",
      "24H": "price_change_percentage_24h_in_currency",
      "1W": "price_change_percentage_7d_in_currency",
      "1M": "price_change_percentage_30d_in_currency",
      "1Y": "price_change_percentage_1y_in_currency",
    };
    const out: Record<string, PeriodChange> = {};
    for (const [key, field] of Object.entries(pctMap)) {
      const pct = (md[field as string] as Record<string, number> | undefined)?.usd;
      if (typeof pct === "number" && typeof cur === "number") {
        const start = cur / (1 + pct / 100);
        out[key] = { pct, abs: cur - start };
      }
    }
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: "Failed to load changes" }, { status: 502 });
  }
}

// Latest close at or before the target time. Returns null only when the series
// genuinely doesn't reach back far enough (older than one candle of slack).
function closeAtOrBefore(series: Kline[], targetSec: number): number | null {
  if (!series.length) return null;
  if (targetSec < series[0].t) {
    const gap = series.length > 1 ? series[1].t - series[0].t : 0;
    // Within one candle of the series start → use the earliest close.
    return series[0].t - targetSec <= gap ? series[0].c : null;
  }
  let result = series[0].c;
  for (const k of series) {
    if (k.t <= targetSec) result = k.c;
    else break;
  }
  return result;
}
