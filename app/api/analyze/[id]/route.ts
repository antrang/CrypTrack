import { NextRequest, NextResponse } from "next/server";
import {
  generateAnalysis,
  isAiConfigured,
  resolveModel,
} from "@/lib/server/ai";
import { AnalyzeContextSchema, CoinIdParamSchema } from "@/lib/schemas";
import type { Insight } from "@/lib/types";

// POST { context } → per-coin AI trade analysis (markdown).
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Add OPENCODE_API_KEY to .env.local and restart." },
      { status: 503 },
    );
  }

  const { id: rawId } = await ctx.params;
  const idParse = CoinIdParamSchema.safeParse(rawId);
  if (!idParse.success) {
    return NextResponse.json({ error: "Invalid coin id" }, { status: 400 });
  }
  const id = idParse.data;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parse = AnalyzeContextSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid context", issues: parse.error.issues },
      { status: 400 },
    );
  }

  const context = parse.data;
  if (!context.symbol) context.symbol = id.toUpperCase();

  try {
    const markdown = await generateAnalysis(context);
    const payload: Insight = {
      markdown,
      generatedAt: Date.now(),
      model: await resolveModel(),
    };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
