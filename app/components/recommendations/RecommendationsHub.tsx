"use client";
import { useState } from "react";
import {
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useCurrency } from "@/hooks/useCurrency";
import { useUiStore } from "@/lib/ui-store";
import { formatPercent } from "@/lib/format";
import type { RecommendationItem } from "@/lib/types";

export function RecommendationsHub() {
  const { recommendations, loading, error, refresh } = useRecommendations();
  const openCoin = useUiStore((s) => s.openCoin);
  const openAddTransaction = useUiStore((s) => s.openAddTransaction);

  const [selectedHypothesis, setSelectedHypothesis] = useState<string>("ALL");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const filtered = recommendations.filter((rec) => {
    const matchesHypothesis =
      selectedHypothesis === "ALL" || rec.hypothesis === selectedHypothesis;
    const matchesTier =
      selectedTier === "ALL" ||
      (selectedTier === "BUY_ONLY" &&
        (rec.convictionTier === "High Conviction" || rec.convictionTier === "Favorable")) ||
      rec.convictionTier === selectedTier;
    const matchesSearch =
      rec.symbol.toLowerCase().includes(search.toLowerCase()) ||
      rec.name.toLowerCase().includes(search.toLowerCase());
    return matchesHypothesis && matchesTier && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Research &amp; Hypothesis Recommendations
            </h2>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
              4-Pillar Model
            </span>
          </div>
          <p className="text-xs text-muted">
            Quantitative scoring across Technical Momentum, DeFi Fundamentals, Macro Derivatives, and
            Risk/Reward
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
          Not financial advice. For research only — always do your own due diligence.
        </div>

        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Rescan Markets
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-muted" />
          <input
            type="text"
            placeholder="Search recommended crypto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={selectedHypothesis}
            onChange={(e) => setSelectedHypothesis(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="ALL">All Hypotheses</option>
            <option value="DeFi Cashflow Accumulation">DeFi Cashflow Accumulation</option>
            <option value="Momentum Breakout">Momentum Breakout</option>
            <option value="Oversold Value Reversal">Oversold Value Reversal</option>
            <option value="Ecosystem Narrative Leader">Ecosystem Narrative Leader</option>
          </select>

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="ALL">All Tiers</option>
            <option value="BUY_ONLY">Positive Candidates Only</option>
            <option value="High Conviction">High Conviction</option>
            <option value="Favorable">Favorable</option>
            <option value="Neutral">Neutral</option>
            <option value="Caution">Caution</option>
          </select>
        </div>
      </div>

      {loading && recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted gap-2">
          <Loader2 size={24} className="animate-spin text-accent" />
          <p className="text-xs">Evaluating multi-timeframe candles, TVL growth, and derivatives...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-down/40 bg-down/10 px-4 py-3 text-xs text-down">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface-2/20">
          <p className="text-sm font-medium text-foreground">No recommendations match your filters</p>
          <p className="text-xs text-muted mt-1">Try selecting &quot;All Hypotheses&quot; or resetting search criteria.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              onDeepDive={() =>
                openCoin(item.id, {
                  name: item.name,
                  symbol: item.symbol,
                  image: item.image,
                })
              }
              onLogTrade={() => openAddTransaction(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  item,
  onDeepDive,
  onLogTrade,
}: {
  item: RecommendationItem;
  onDeepDive: () => void;
  onLogTrade: () => void;
}) {
  const { money } = useCurrency();

  const tierColor =
    item.convictionTier === "High Conviction"
      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
      : item.convictionTier === "Favorable"
      ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
      : item.convictionTier === "Caution"
      ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
      : "bg-surface-2 text-muted border-border";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-accent/40 transition-all flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between">
          <button onClick={onDeepDive} className="flex items-center gap-2.5 text-left group">
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" width={32} height={32} className="rounded-full" />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">
                  {item.name}
                </span>
                <span className="text-[10px] font-semibold text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                  #{item.marketCapRank}
                </span>
              </div>
              <div className="text-xs text-muted uppercase font-medium">{item.symbol}</div>
            </div>
          </button>

          {/* Overall Confidence Score */}
          <div className="text-right">
            <div className="inline-flex items-center gap-1 rounded-xl bg-accent/15 px-2.5 py-1 border border-accent/25">
              <Sparkles size={12} className="text-accent" />
              <span className="text-xs font-bold text-accent tabular">{item.overallScore}%</span>
            </div>
          </div>
        </div>

        {/* Price & 24h Delta */}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-base font-bold text-foreground tabular">
            {money(item.currentPrice)}
          </span>
          <span
            className={`text-xs font-semibold tabular ${
              item.priceChange24h >= 0 ? "text-up" : "text-down"
            }`}
          >
            {formatPercent(item.priceChange24h)}
          </span>
        </div>

        {/* Conviction Tier & Hypothesis Tag */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold border ${tierColor}`}>
            {item.convictionTier}
          </span>
          <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-foreground border border-border">
            {item.hypothesis}
          </span>
        </div>

        {/* Rationale text */}
        <p className="mt-2 text-xs text-muted leading-relaxed line-clamp-2">
          {item.hypothesisRationale}
        </p>
      </div>

      {/* 4-Pillar Sub-scores Barometer */}
      <div className="space-y-1.5 rounded-xl bg-surface-2/40 p-3 border border-border/60">
        <div className="flex justify-between text-[11px] font-medium">
          <span className="text-muted">Technical (30%)</span>
          <span className="font-bold tabular text-foreground">{item.pillars.technical}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${item.pillars.technical}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-medium pt-1">
          <span className="text-muted">On-Chain Fund (25%)</span>
          <span className="font-bold tabular text-foreground">{item.pillars.fundamental}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${item.pillars.fundamental}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-medium pt-1">
          <span className="text-muted">Macro Derivatives (25%)</span>
          <span className="font-bold tabular text-foreground">{item.pillars.macro}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full"
            style={{ width: `${item.pillars.macro}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-medium pt-1">
          <span className="text-muted">Risk/Reward (20%)</span>
          <span className="font-bold tabular text-foreground">{item.pillars.riskReward}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full"
            style={{ width: `${item.pillars.riskReward}%` }}
          />
        </div>
      </div>

      {/* Actionable Trade Execution Zones */}
      <div className="rounded-xl border border-border/80 bg-surface p-3 space-y-2 text-xs">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-muted flex items-center gap-1">
            <Target size={12} className="text-accent" /> Entry Zone:
          </span>
          <span className="font-semibold tabular text-foreground">
            {money(item.levels.entryZone[0])} – {money(item.levels.entryZone[1])}
          </span>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <span className="text-muted flex items-center gap-1">
            <TrendingUp size={12} className="text-up" /> Targets:
          </span>
          <span className="font-semibold tabular text-foreground">
            TP1 {money(item.levels.target1)} · TP2 {money(item.levels.target2)}
          </span>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <span className="text-muted flex items-center gap-1">
            <ShieldAlert size={12} className="text-down" /> Invalidation Stop:
          </span>
          <span className="font-semibold tabular text-down">
            {money(item.levels.invalidation)}
          </span>
        </div>

        <div className="pt-1 border-t border-border/60 flex justify-between text-[11px] font-medium">
          <span className="text-muted">Risk-Reward Ratio</span>
          <span className="text-emerald-500 font-bold tabular">{item.levels.riskRewardRatio}x R:R</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onDeepDive}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface-2/40 py-2 text-xs font-semibold text-foreground hover:bg-surface-2 transition-colors"
        >
          Deep Dive <ChevronRight size={13} />
        </button>
        <button
          onClick={onLogTrade}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-xs"
          title="Add to portfolio bucket"
        >
          <Plus size={13} /> Log Trade
        </button>
      </div>
    </div>
  );
}
