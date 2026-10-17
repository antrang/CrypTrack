"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Crosshair, Loader2, RefreshCw } from "lucide-react";
import { fetchAnalysis, fetchChanges, fetchNews } from "@/lib/coingecko";
import type { Insight, SignalsData } from "@/lib/types";
import type { AnalyzeContext } from "@/lib/server/ai";

// Session cache: reopening a coin's drawer doesn't re-spend tokens.
const analysisCache = new Map<string, Insight>();

interface Props {
  coinId: string;
  symbol: string;
  name: string;
  signals: SignalsData | null;
}

export function TradeAnalysis({ coinId, symbol, name, signals }: Props) {
  const [insight, setInsight] = useState<Insight | null>(
    analysisCache.get(coinId) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      // Gather the freshest per-coin context in parallel.
      const [changes, headlines] = await Promise.all([
        fetchChanges(coinId).catch(() => ({})),
        fetchNews(symbol)
          .then((n) => n.slice(0, 6).map((a) => ({ title: a.title, source: a.source })))
          .catch(() => []),
      ]);
      const ctx: AnalyzeContext = {
        symbol,
        name,
        price: signals?.price ?? null,
        periodChanges: Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [k, { pct: v.pct }]),
        ),
        score: signals?.score,
        matrix: signals?.matrix
          ? Object.fromEntries(
              Object.entries(signals.matrix).map(([tf, ind]) => [
                tf,
                {
                  rsi: ind.rsi,
                  histogram: ind.histogram,
                  sma20: ind.sma20,
                  sma50: ind.sma50,
                },
              ]),
            )
          : undefined,
        levels: signals?.levels,
        headlines,
      };
      const result = await fetchAnalysis(coinId, ctx);
      analysisCache.set(coinId, result);
      setInsight(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!insight && !loading && (
        <div className="rounded-xl border border-border bg-surface-2/30 p-4 text-center">
          <Crosshair size={18} className="mx-auto mb-1.5 text-accent" />
          <p className="text-xs text-muted max-w-xs mx-auto">
            AI trade brief for {symbol}: stance + conviction, key levels, what
            confirms, what invalidates, risks.
          </p>
          <button
            onClick={generate}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <Crosshair size={13} /> Analyze {symbol}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" /> Analyzing {symbol}…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-down/40 bg-down/10 px-3 py-2.5 text-xs text-down">
          {error}
        </div>
      )}

      {insight && !loading && (
        <div className="rounded-xl border border-border bg-surface-2/30 p-4">
          <div className="md text-sm leading-relaxed">
            <ReactMarkdown>{insight.markdown}</ReactMarkdown>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <span className="text-[11px] text-muted">
              {insight.model} · {new Date(insight.generatedAt).toLocaleTimeString()}
            </span>
            <button
              onClick={generate}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <RefreshCw size={11} /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
