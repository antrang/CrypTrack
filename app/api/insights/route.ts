import { NextRequest, NextResponse } from "next/server";
import {
  generateInsight,
  isAiConfigured,
  preferredModel,
  resolveModel,
} from "@/lib/server/ai";
import { InsightContextSchema } from "@/lib/schemas";
import type { Insight } from "@/lib/types";

// GET → config status + resolved model (UI shows a setup hint when absent).
export async function GET() {
  if (!isAiConfigured()) {
    return NextResponse.json({ configured: false, model: preferredModel() });
  }
  const model = await resolveModel();
  return NextResponse.json({ configured: true, model });
}

// POST { context } → AI-synthesized market brief (markdown).
export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Add OPENCODE_API_KEY to .env.local and restart." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parse = InsightContextSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid context", issues: parse.error.issues },
      { status: 400 },
    );
  }

  try {
    const markdown = await generateInsight(parse.data);
    const payload: Insight = {
      markdown,
      generatedAt: Date.now(),
      model: await resolveModel(),
    };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Insight generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
