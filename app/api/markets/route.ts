import { NextRequest, NextResponse } from "next/server";
import { cgFetch } from "@/lib/server/cg";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { MarketCoin } from "@/lib/types";

// Top markets with 7d sparkline + 24h change. Optional ?search= filters by
// name/symbol over the top set (cheap, avoids a second upstream call).
export async function GET(req: NextRequest) {
  const limit = rateLimit(getClientIp(req), { windowMs: 60_000, maxRequests: 120 });
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();
  if (search && search.length > 64) {
    return NextResponse.json({ error: "Search query too long" }, { status: 400 });
  }

  try {
    const data = await cgFetch<MarketCoin[]>(
      "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h",
      30_000,
    );
    const result = search
      ? data.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            c.symbol.toLowerCase().includes(search) ||
            c.id.toLowerCase().includes(search),
        )
      : data;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to load markets" }, { status: 502 });
  }
}
