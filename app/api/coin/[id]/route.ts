import { NextRequest, NextResponse } from "next/server";
import { cgFetch } from "@/lib/server/cg";
import { CoinIdParamSchema } from "@/lib/schemas";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

interface MarketChart {
  prices: [number, number][];
}

const DAY_PATTERN = /^\d{1,3}$/;

// Historical price series for indicator computation.
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

  const rawDays = req.nextUrl.searchParams.get("days") ?? "100";
  if (!DAY_PATTERN.test(rawDays)) {
    return NextResponse.json({ error: "Invalid days parameter" }, { status: 400 });
  }
  const days = rawDays;

  try {
    const chart = await cgFetch<MarketChart>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${encodeURIComponent(days)}&interval=daily`,
      300_000, // historical daily data is stable; cache 5 min
    );
    const prices = chart.prices ?? [];
    return NextResponse.json({
      closes: prices.map((p) => p[1]),
      prices,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load coin chart" }, { status: 502 });
  }
}
