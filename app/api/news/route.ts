import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { NewsArticle } from "@/lib/types";

interface CcArticle {
  id: string | number;
  TITLE?: string;
  title?: string;
  URL?: string;
  url?: string;
  SOURCE_DATA?: { NAME?: string };
  source_info?: { name?: string };
  source?: string;
  BODY?: string;
  body?: string;
  IMAGE_URL?: string;
  imageurl?: string;
  PUBLISHED_ON?: number;
  published_on?: number;
}

const CC_BASE = "https://data-api.cryptocompare.com/news/v1/article/list";
const SYMBOL_PATTERN = /^[A-Z0-9]{1,10}$/;

// Per-coin market news via CryptoCompare (free, key optional).
export async function GET(req: NextRequest) {
  const limit = rateLimit(getClientIp(req), { windowMs: 60_000, maxRequests: 120 });
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const rawSymbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const symbol = rawSymbol && SYMBOL_PATTERN.test(rawSymbol) ? rawSymbol : "";
  const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
  const auth = apiKey ? `&api_key=${apiKey}` : "";

  async function load(withCategory: boolean): Promise<CcArticle[]> {
    const cat = withCategory && symbol ? `&categories=${symbol}` : "";
    const res = await fetch(`${CC_BASE}?lang=EN&limit=30${cat}${auth}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`news ${res.status}`);
    const json = (await res.json()) as { Data?: CcArticle[] };
    return json.Data ?? [];
  }

  try {
    let data = await load(true);
    // Fall back to the general feed if the category yields nothing.
    if (data.length === 0) data = await load(false);

    const articles: NewsArticle[] = data.slice(0, 20).map((a, i) => ({
      id: String(a.id ?? i),
      title: a.TITLE ?? a.title ?? "Untitled",
      url: a.URL ?? a.url ?? "#",
      source: a.SOURCE_DATA?.NAME ?? a.source_info?.name ?? a.source ?? "CryptoCompare",
      body: a.BODY ?? a.body ?? "",
      imageUrl: a.IMAGE_URL ?? a.imageurl ?? "",
      publishedAt: a.PUBLISHED_ON ?? a.published_on ?? 0,
    }));
    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: "Failed to load news" }, { status: 502 });
  }
}
