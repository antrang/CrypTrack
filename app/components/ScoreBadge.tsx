"use client";
import { useSignals } from "@/hooks/useSignals";
import type { SignalsData } from "@/lib/types";
import { clsx } from "./clsx";

function tone(score: number): { text: string; bg: string; bar: string } {
  if (score >= 70) return { text: "text-up", bg: "bg-up/12", bar: "bg-up" };
  if (score >= 58) return { text: "text-up", bg: "bg-up/8", bar: "bg-up/80" };
  if (score <= 30) return { text: "text-down", bg: "bg-down/12", bar: "bg-down" };
  if (score <= 42) return { text: "text-down", bg: "bg-down/8", bar: "bg-down/80" };
  return { text: "text-muted", bg: "bg-surface-2", bar: "bg-muted" };
}

// Compact pill for table rows — lazily fetches its own signals.
export function ScoreBadge({ coinId }: { coinId: string }) {
  const { signals, loading } = useSignals(coinId);
  if (loading) {
    return <span className="inline-block h-5 w-14 rounded-full bg-surface-2 animate-pulse" />;
  }
  if (!signals) return <span className="text-xs text-muted">—</span>;
  const t = tone(signals.score.score);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular",
        t.bg,
        t.text,
      )}
      title={`Composite technical score: ${signals.score.score}/100 (${signals.score.label})`}
    >
      {signals.score.score}
      <span className="font-normal opacity-80">{signals.score.label}</span>
    </span>
  );
}

// Larger gauge for the drawer.
export function ScoreGauge({ signals }: { signals: SignalsData }) {
  const { score, label, bullishTimeframes, totalTimeframes } = signals.score;
  const t = tone(score);
  return (
    <div className="rounded-xl border border-border bg-surface-2/30 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted">SIGNAL SCORE</span>
        <span className={clsx("text-xs font-semibold", t.text)}>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={clsx("text-2xl font-bold tabular", t.text)}>{score}</span>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden relative">
            <div
              className={clsx("h-full rounded-full transition-all", t.bar)}
              style={{ width: `${score}%` }}
            />
            {/* neutral marker at 50 */}
            <div className="absolute top-0 left-1/2 h-full w-px bg-border" />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>Strong Sell</span>
            <span>Neutral</span>
            <span>Strong Buy</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {bullishTimeframes}/{totalTimeframes} timeframes lean bullish · RSI + MACD +
        trend, weighted toward higher timeframes
      </p>
    </div>
  );
}
