import { NextRequest, NextResponse } from "next/server";
import { cgFetch } from "@/lib/server/cg";
import { CoinIdsQuerySchema } from "@/lib/schemas";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

interface SimplePriceResponse {
  [coinId: string]: { usd: number; usd_24h_change?: number };
}

// Lightweight price poll for coins lacking a Binance WS stream.
export async function GET(req: NextRequest) {
  const limit = rateLimit(getClientIp(req), { windowMs: 60_000, maxRequests: 120 });
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const rawIds = req.nextUrl.searchParams.get("ids")?.trim();
  if (!rawIds) return NextResponse.json({});

  const parse = CoinIdsQuerySchema.safeParse(rawIds);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid coin ids" }, { status: 400 });
  }
  const ids = parse.data.join(",");

  try {
    const data = await cgFetch<SimplePriceResponse>(
      `/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`,
      20_000,
    );
    const out: Record<string, { price: number; changePct24h: number }> = {};
    for (const [id, v] of Object.entries(data)) {
      out[id] = { price: v.usd, changePct24h: v.usd_24h_change ?? 0 };
    }
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: "Failed to load prices" }, { status: 502 });
  }
}
