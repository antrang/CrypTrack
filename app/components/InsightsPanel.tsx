"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  fetchDiscover,
  fetchFearGreed,
  fetchInsight,
  fetchNews,
  fetchSignals,
} from "@/lib/coingecko";
import { usePriceStore } from "@/lib/store";
import type { Holding, Insight, MarketCoin } from "@/lib/types";
import type { InsightContext } from "@/lib/server/ai";
import { Card, CardHeader } from "./ui";

interface Props {
  holdings: Holding[];
  markets: MarketCoin[];
}

export function InsightsPanel({ holdings, markets }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, []);

  async function buildContext(): Promise<InsightContext> {
    const prices = usePriceStore.getState().prices;
    const marketsById = Object.fromEntries(markets.map((m) => [m.id, m]));

    // Portfolio summary from live prices.
    let portfolio: InsightContext["portfolio"] | undefined;
    if (holdings.length) {
      const rows = holdings.map((h) => {
        const price =
          prices[h.coinId]?.price ?? marketsById[h.coinId]?.current_price ?? h.buyPrice;
        const value = price * h.qty;
        const cost = h.buyPrice * h.qty;
        return { h, value, cost };
      });
      const totalValue = rows.reduce((a, r) => a + r.value, 0);
      const totalCost = rows.reduce((a, r) => a + r.cost, 0);
      // Per-holding technical scores enrich the AI's read.
      const scores = await Promise.all(
        rows.map((r) => fetchSignals(r.h.coinId).catch(() => null)),
      );
      portfolio = {
        totalValue,
        totalCost,
        plPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
        holdings: rows.map((r, i) => ({
          symbol: r.h.symbol,
          allocationPct: totalValue > 0 ? (r.value / totalValue) * 100 : 0,
          plPct: r.cost > 0 ? ((r.value - r.cost) / r.cost) * 100 : 0,
          signalScore: scores[i]?.score.score,
          signalLabel: scores[i]?.score.label,
        })),
      };
    }

    const sorted = [...markets].sort(
      (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h,
    );
    const topMovers = [...sorted.slice(0, 5), ...sorted.slice(-5)].map((m) => ({
      symbol: m.symbol.toUpperCase(),
      changePct24h: m.price_change_percentage_24h,
    }));

    // Parallel external context.
    const [fg, discover, headlines] = await Promise.all([
      fetchFearGreed().catch(() => null),
      fetchDiscover().catch(() => ({ trending: [], categories: [] })),
      fetchNews(holdings[0]?.symbol ?? "BTC")
        .then((n) => n.slice(0, 10).map((a) => ({ title: a.title, source: a.source })))
        .catch(() => []),
    ]);

    return {
      portfolio,
      fearGreed: fg ? { value: fg.value, classification: fg.classification } : undefined,
      topMovers,
      trending: discover.trending.map((t) => `${t.name} (${t.symbol.toUpperCase()})`),
      categoriesGaining: discover.categories
        .slice(0, 5)
        .map((c) => ({ name: c.name, change24h: c.change24h })),
      headlines,
    };
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const ctx = await buildContext();
      const result = await fetchInsight(ctx);
      setInsight(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate insight");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="AI MARKET INSIGHTS"
        subtitle="Synthesized from your portfolio, signals & news"
        right={<Brain size={15} className="text-accent" />}
      />
      <div className="p-5">
        {configured === false ? (
          <SetupHint />
        ) : (
          <>
            {!insight && !loading && (
              <div className="text-center py-6">
                <Sparkles size={22} className="mx-auto mb-2 text-accent" />
                <p className="text-sm text-muted max-w-sm mx-auto">
                  Generate an AI brief that reads the Fear &amp; Greed index, top
                  movers, trending narratives and latest headlines against your
                  holdings.
                </p>
                <button
                  onClick={generate}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Sparkles size={15} /> Generate insight
                </button>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" />
                Reading the market…
              </div>
            )}

            {error && !loading && (
              <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
                {error}
              </div>
            )}

            {insight && !loading && (
              <div>
                <div className="md text-sm leading-relaxed">
                  <ReactMarkdown>{insight.markdown}</ReactMarkdown>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[11px] text-muted">
                    {insight.model} · {new Date(insight.generatedAt).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={generate}
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                  >
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function SetupHint() {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-4 py-4 text-sm">
      <p className="font-medium mb-1">AI insights need your OpenCode key</p>
      <p className="text-muted text-xs leading-relaxed">
        Add <code className="text-accent">OPENCODE_API_KEY</code> (from your
        OpenCode Go subscription) to <code className="text-accent">.env.local</code>{" "}
        and restart the dev server. Everything else in CrypTrack works without it.
      </p>
    </div>
  );
}
