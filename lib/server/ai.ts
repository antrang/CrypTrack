// Server-only AI client for OpenCode Zen (OpenAI-compatible endpoint).
// Powers the dashboard market brief AND per-coin trade analysis.
// Model auto-resolves against the subscription's /models list.

const DEFAULT_BASE = "https://opencode.ai/zen/v1";
const FALLBACK_MODEL = "mimo-v2.5-free";

function baseUrl(): string {
  return (process.env.OPENCODE_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENCODE_API_KEY);
}

export function preferredModel(): string {
  return process.env.OPENCODE_MODEL || "mimo-v2.5-pro";
}

// --- model resolution (cached ~10 min) ---
let resolvedCache: { model: string; expires: number } | null = null;

export async function resolveModel(): Promise<string> {
  const now = Date.now();
  if (resolvedCache && resolvedCache.expires > now) return resolvedCache.model;

  const want = preferredModel();
  let model = want;
  try {
    const res = await fetch(`${baseUrl()}/models`, {
      headers: { Authorization: `Bearer ${process.env.OPENCODE_API_KEY ?? ""}` },
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { id: string }[] };
      const ids = (json.data ?? []).map((m) => m.id);
      if (ids.length && !ids.includes(want)) {
        // Preferred model not on this subscription — fall back to the free
        // MiMo tier, then to any MiMo variant, then first available.
        model =
          ids.find((i) => i === FALLBACK_MODEL) ??
          ids.find((i) => i.startsWith("mimo")) ??
          ids[0];
      }
    }
  } catch {
    // Listing failed — try the preferred model as-is.
  }
  resolvedCache = { model, expires: now + 600_000 };
  return model;
}

// --- shared chat helper (OpenAI chat-completions format) ---
async function chat(system: string, user: string, maxTokens = 1200): Promise<string> {
  const model = await resolveModel();
  const res = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${process.env.OPENCODE_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenCode ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty AI response");
  // Some reasoning models wrap thinking in <think> tags — strip them.
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// --- dashboard market brief ---
import type { InsightContextInput, AnalyzeContextInput } from "@/lib/schemas";
export type InsightContext = InsightContextInput;

const INSIGHT_SYSTEM = `You are a sharp, neutral crypto market analyst writing a brief for a single retail investor.
You are given structured live data: their portfolio (with per-holding technical signal scores 0-100 where 50 is neutral), the Fear & Greed index, top 24h movers, trending coins, gaining narrative categories, and recent headlines.
Write a concise markdown brief with these sections:
## Market Read  (2-3 sentences on overall risk tone, citing Fear & Greed + breadth)
## Your Portfolio  (1-2 sentences tied to their actual holdings/allocation/PL/signal scores; skip if no holdings)
## Narratives Gaining Traction  (bullet the strongest 2-3 categories/trending coins with a one-line "why it matters")
## What To Watch  (2-3 bullets: concrete signals/levels/events to monitor)
Rules: be specific to the numbers provided, never invent prices, no hype, no guarantees.
End with one italic line: *Not financial advice — for research only.*
Keep under 280 words.`;

export async function generateInsight(ctx: InsightContext): Promise<string> {
  return chat(
    INSIGHT_SYSTEM,
    `Here is the current live data as JSON. Write the brief.\n\n${JSON.stringify(ctx)}`,
    1024,
  );
}

// --- per-coin trade analysis ---
export type AnalyzeContext = AnalyzeContextInput;

const ANALYZE_SYSTEM = `You are a disciplined technical analyst producing a single-coin trade brief for a retail trader.
You get live structured data: current price, % change across timeframes, a composite signal score (0-100, 50 neutral), a multi-timeframe indicator matrix (RSI, MACD histogram, SMA20/50), auto-detected support/resistance levels with touch counts, and recent headlines.
Write a markdown brief with exactly these sections:
## Stance  (one line: **Bullish / Bearish / Neutral** — conviction N/5, then 1-2 sentences why, citing the score and timeframe confluence)
## Key Levels  (bullets: nearest support(s) and resistance(s) with the actual prices given; note which matters most and why)
## What Confirms  (2 bullets: concrete observable events that would strengthen the stance, e.g. a close above a given resistance, RSI reclaiming 50 on 4H)
## What Invalidates  (2 bullets: concrete events that would void the stance, with the price levels given)
## Risks  (1-2 bullets: news/sentiment/structure risks from the provided headlines or data)
Rules: use ONLY the numbers provided — never invent prices or levels. Round prices sensibly. No hype, no guarantees, no position sizing.
End with one italic line: *Not financial advice — for research only.*
Keep under 300 words.`;

export async function generateAnalysis(ctx: AnalyzeContext): Promise<string> {
  return chat(
    ANALYZE_SYSTEM,
    `Live data for ${ctx.name} (${ctx.symbol}) as JSON. Write the trade brief.\n\n${JSON.stringify(ctx)}`,
    1200,
  );
}
