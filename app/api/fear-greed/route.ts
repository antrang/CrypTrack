import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { FearGreed } from "@/lib/types";

interface FngResponse {
  data: { value: string; value_classification: string; timestamp: string }[];
}

// Proxy alternative.me Fear & Greed Index with configurable history.
export async function GET(req: Request) {
  const limit = rateLimit(getClientIp(req), { windowMs: 60_000, maxRequests: 120 });
  if (!limit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit") || "1";
    const parsedLimit = parseInt(limitParam, 10);
    const requestedLimit = Number.isFinite(parsedLimit) ? parsedLimit : 1;
    const safeLimit = Math.min(30, Math.max(1, requestedLimit));

    const res = await fetch(`https://api.alternative.me/fng/?limit=${safeLimit}`, {
      next: { revalidate: 600 }, // updates ~hourly
    });
    if (!res.ok) throw new Error(`fng ${res.status}`);
    const json = (await res.json()) as FngResponse;
    const items = json.data || [];
    if (!items.length) throw new Error("empty fng");

    if (safeLimit === 1) {
      const d = items[0];
      const payload: FearGreed = {
        value: parseInt(d.value, 10),
        classification: d.value_classification,
        timestamp: parseInt(d.timestamp, 10),
      };
      return NextResponse.json(payload);
    }

    const payload = items.map((d) => ({
      value: parseInt(d.value, 10),
      classification: d.value_classification,
      timestamp: parseInt(d.timestamp, 10),
    }));
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to load index" }, { status: 502 });
  }
}
