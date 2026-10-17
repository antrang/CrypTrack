"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { fetchCoinChart } from "@/lib/coingecko";
import { computeIndicators } from "@/lib/indicators";
import { useSignals } from "@/hooks/useSignals";
import type { Indicators } from "@/lib/types";
import { LivePrice } from "./LivePrice";
import { PriceChart } from "./PriceChart";
import { PeriodChanges } from "./PeriodChanges";
import { NewsList } from "./NewsList";
import { ScoreGauge } from "./ScoreBadge";
import { SignalMatrix } from "./SignalMatrix";
import { TradeAnalysis } from "./TradeAnalysis";
import { Pill } from "./ui";

export function CoinDrawer() {
  const coinId = useUiStore((s) => s.selectedCoinId);
  const meta = useUiStore((s) => s.selectedMeta);
  const close = useUiStore((s) => s.closeCoin);
  const openAddTransaction = useUiStore((s) => s.openAddTransaction);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const { signals } = useSignals(coinId);

  // ESC to close + lock body scroll while open.
  useEffect(() => {
    if (!coinId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [coinId, close]);

  // Technical indicators for the drawer header.
  useEffect(() => {
    if (!coinId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const c = await fetchCoinChart(coinId, 100);
        if (!cancelled) setIndicators(computeIndicators(c.closes));
      } catch {
        if (!cancelled) setIndicators(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [coinId]);

  if (!coinId) return null;
  const symbol = meta?.symbol ?? coinId.toUpperCase();

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in"
        onClick={close}
      />
      {/* Drawer */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-surface border-l border-border shadow-2xl overflow-y-auto drawer-in">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 backdrop-blur px-5 py-4">
          {meta?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.image} alt="" width={32} height={32} className="rounded-full" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight truncate">
              {meta?.name ?? coinId}
            </h2>
            <div className="text-xs text-muted flex items-center gap-2">
              <span className="uppercase">{symbol}</span>
              <span className="text-foreground">
                <LivePrice coinId={coinId} />
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAddTransaction(coinId)}
              className="rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
            >
              + Trade
            </button>
            <button
              onClick={close}
              className="text-muted hover:text-foreground"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="p-5 space-y-5">
          {/* Indicators */}
          {indicators && (
            <div className="flex flex-wrap gap-1.5">
              <RsiBadge rsi={indicators.rsi} />
              <SmaBadge sma20={indicators.sma20} sma50={indicators.sma50} />
              <MacdBadge histogram={indicators.histogram} />
            </div>
          )}

          {/* Composite signal score */}
          {signals && <ScoreGauge signals={signals} />}

          {/* Period changes */}
          <section>
            <h3 className="text-xs font-semibold text-muted mb-2">PERFORMANCE</h3>
            <PeriodChanges coinId={coinId} />
          </section>

          {/* Chart with S/R levels */}
          <section className="rounded-xl border border-border bg-surface-2/30 p-4">
            <PriceChart coinId={coinId} levels={signals?.levels} />
          </section>

          {/* Multi-timeframe matrix */}
          {signals && (
            <section>
              <h3 className="text-xs font-semibold text-muted mb-2">
                TIMEFRAME CONFLUENCE
              </h3>
              <SignalMatrix signals={signals} />
            </section>
          )}

          {/* AI trade analysis */}
          <section>
            <h3 className="text-xs font-semibold text-muted mb-2">
              AI TRADE ANALYSIS
            </h3>
            <TradeAnalysis
              coinId={coinId}
              symbol={symbol}
              name={meta?.name ?? coinId}
              signals={signals}
            />
          </section>

          {/* News */}
          <section>
            <h3 className="text-xs font-semibold text-muted mb-2">NEWS · {symbol}</h3>
            <NewsList symbol={symbol} />
          </section>
        </div>
      </aside>
    </div>
  );
}

function RsiBadge({ rsi }: { rsi: number | null }) {
  if (rsi === null) return null;
  const tone = rsi >= 70 ? "down" : rsi <= 30 ? "up" : "neutral";
  const label = rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";
  return <Pill tone={tone}>RSI {rsi.toFixed(0)} · {label}</Pill>;
}
function SmaBadge({ sma20, sma50 }: { sma20: number | null; sma50: number | null }) {
  if (sma20 === null || sma50 === null) return null;
  const bull = sma20 >= sma50;
  return <Pill tone={bull ? "up" : "down"}>SMA {bull ? "Golden" : "Death"}</Pill>;
}
function MacdBadge({ histogram }: { histogram: number | null }) {
  if (histogram === null) return null;
  return <Pill tone={histogram >= 0 ? "up" : "down"}>MACD {histogram >= 0 ? "Bullish" : "Bearish"}</Pill>;
}
