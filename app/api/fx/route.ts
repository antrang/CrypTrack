import { NextResponse } from "next/server";
import { cgFetch } from "@/lib/server/cg";

interface ExchangeRates {
  rates: Record<string, { value: number }>;
}

// Real-time USD→INR rate. CoinGecko exchange_rates are quoted in BTC terms,
// so USD/INR = inr.value / usd.value. Cached 60s (FX moves slowly).
export async function GET() {
  try {
    const data = await cgFetch<ExchangeRates>("/exchange_rates", 60_000);
    const usd = data.rates?.usd?.value;
    const inr = data.rates?.inr?.value;
    if (!usd || !inr) throw new Error("missing rates");
    return NextResponse.json({ usdInr: inr / usd, updatedAt: Date.now() });
  } catch {
    return NextResponse.json({ error: "Failed to load FX" }, { status: 502 });
  }
}
