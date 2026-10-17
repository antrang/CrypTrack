"use client";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Flame,
  Globe,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMacro } from "@/hooks/useMacro";
import { useCurrency } from "@/hooks/useCurrency";
import { fetchFearGreedHistory } from "@/lib/coingecko";
import { formatPercent } from "@/lib/format";
import type { FearGreed } from "@/lib/types";

export function MacroHub() {
  const { data, loading, error, refresh } = useMacro();
  const { money } = useCurrency();
  const [fngHistory, setFngHistory] = useState<FearGreed[]>([]);

  useEffect(() => {
    fetchFearGreedHistory(14)
      .then(setFngHistory)
      .catch(() => {});
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted gap-2">
        <Loader2 size={24} className="animate-spin text-accent" />
        <p className="text-xs">Aggregating global macro intelligence &amp; on-chain signals...</p>
      </div>
    );
  }

  const global = data?.global;
  const stablecoins = data?.stablecoins;
  const derivatives = data?.derivatives;
  const fearGreed = data?.fearGreed;

  return (
    <div className="space-y-4">
      {/* Top Banner & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Market Intelligence &amp; Macro Signals</h2>
          <p className="text-xs text-muted">
            Global crypto capitalization, stablecoin liquidity flows, and derivatives leverage
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Signals
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-down/40 bg-down/10 px-4 py-2.5 text-xs text-down">
          {error}
        </div>
      )}

      {/* Grid: Global Cap & Stablecoin Liquidity */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Global Market Cap & Dominance */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/15 text-accent">
                <Globe size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Global Capitalization
                </h3>
                <span className="text-lg font-bold text-foreground tabular">
                  {global ? money(global.totalMarketCapUsd, { compact: true }) : "—"}
                </span>
              </div>
            </div>
            {global && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular ${
                  global.marketCapChange24hPct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {global.marketCapChange24hPct >= 0 ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <ArrowDownRight size={13} />
                )}
                {formatPercent(global.marketCapChange24hPct)} (24h)
              </span>
            )}
          </div>

          {/* Dominance Gauges */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-muted flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Bitcoin Dominance (BTC.D)
                </span>
                <span className="font-bold tabular text-foreground">
                  {global?.btcDominancePct ?? 0}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(global?.btcDominancePct ?? 0, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-muted flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Ethereum Dominance (ETH.D)
                </span>
                <span className="font-bold tabular text-foreground">
                  {global?.ethDominancePct ?? 0}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(global?.ethDominancePct ?? 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between text-[11px] text-muted border-t border-border/60">
              <span>24h Global Volume: {global ? money(global.totalVolume24hUsd, { compact: true }) : "—"}</span>
              <span>Active Coins: {global?.activeCryptos?.toLocaleString() ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Stablecoin Liquidity Inflow/Outflow */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <DollarSign size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Stablecoin Liquidity (DeFiLlama)
                </h3>
                <span className="text-lg font-bold text-foreground tabular">
                  {stablecoins ? money(stablecoins.totalCirculatingUsd, { compact: true }) : "—"}
                </span>
              </div>
            </div>
            {stablecoins && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular ${
                  stablecoins.change7dUsd >= 0 ? "bg-up/12 text-up" : "bg-down/12 text-down"
                }`}
              >
                {stablecoins.change7dUsd >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {money(Math.abs(stablecoins.change7dUsd), { compact: true })} (7d)
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted leading-relaxed">
              {stablecoins && stablecoins.change7dUsd >= 0
                ? "Fiat capital is expanding into stablecoins (+7d net inflow), providing high macro liquidity fuel for crypto assets."
                : "Stablecoin market cap has slightly contracted over the past 7 days, signaling defensive cash positioning."}
            </p>

            <div className="pt-2">
              <span className="text-[11px] font-semibold text-muted uppercase">Top Stablecoins</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {stablecoins?.topCoins.slice(0, 3).map((coin) => (
                  <div key={coin.symbol} className="rounded-xl border border-border bg-surface-2/40 p-2.5">
                    <span className="text-[11px] font-bold text-foreground">{coin.symbol}</span>
                    <div className="text-xs text-muted tabular mt-0.5">
                      {money(coin.circulating, { compact: true })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Derivatives Barometer & Sentiment */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Derivatives Leverage & Funding Rate Barometer */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/15 text-purple-500">
                <Zap size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Derivatives Leverage Barometer
                </h3>
                <span className="text-sm font-semibold text-foreground">
                  Binance Futures Benchmark
                </span>
              </div>
            </div>
            {derivatives && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  derivatives.state === "froth"
                    ? "bg-down/15 text-down"
                    : derivatives.state === "squeeze_bullish"
                    ? "bg-up/15 text-up"
                    : "bg-surface-2 text-muted"
                }`}
              >
                {derivatives.state === "froth" ? (
                  <AlertTriangle size={12} />
                ) : derivatives.state === "squeeze_bullish" ? (
                  <Flame size={12} />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                {derivatives.state === "froth"
                  ? "Overleveraged Longs"
                  : derivatives.state === "squeeze_bullish"
                  ? "Short Squeeze Potential"
                  : "Balanced Leverage"}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between rounded-xl bg-surface-2/40 p-3">
              <div>
                <span className="text-xs text-muted">Average 8h Funding Rate</span>
                <div className="text-base font-bold tabular text-foreground">
                  {derivatives ? `${(derivatives.avgFundingRate * 100).toFixed(4)}%` : "—"}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted">Annualized Funding</span>
                <div className="text-base font-bold tabular text-foreground">
                  {derivatives ? `${derivatives.avgFundingRateAnnualizedPct.toFixed(2)}%` : "—"}
                </div>
              </div>
            </div>

            {/* Top Perps Table */}
            {derivatives?.topPerps && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-2/40 text-muted border-b border-border text-left">
                      <th className="px-3 py-1.5 font-medium">Perpetual Contract</th>
                      <th className="px-3 py-1.5 text-right font-medium">Mark Price</th>
                      <th className="px-3 py-1.5 text-right font-medium">8h Funding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {derivatives.topPerps.slice(0, 5).map((p) => {
                      const isHigh = p.fundingRate > 0.0002;
                      const isNeg = p.fundingRate < 0;
                      return (
                        <tr key={p.symbol} className="hover:bg-surface-2/30">
                          <td className="px-3 py-1.5 font-semibold text-foreground">{p.symbol}</td>
                          <td className="px-3 py-1.5 text-right tabular text-muted">
                            {money(p.markPrice)}
                          </td>
                          <td
                            className={`px-3 py-1.5 text-right tabular font-medium ${
                              isHigh ? "text-down font-bold" : isNeg ? "text-up font-bold" : "text-muted"
                            }`}
                          >
                            {(p.fundingRate * 100).toFixed(4)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Market Sentiment & Cycle Positioning */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/15 text-accent">
                <Flame size={15} />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Fear &amp; Greed Index
                </h3>
                <span className="text-lg font-bold text-foreground">
                  {fearGreed?.value ?? 50} / 100 · {fearGreed?.classification ?? "Neutral"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Gauge bar */}
            <div>
              <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 p-0.5">
                <div
                  className="h-2 w-2 rounded-full bg-white shadow-md ring-2 ring-black"
                  style={{
                    marginLeft: `calc(${Math.min(Math.max(fearGreed?.value ?? 50, 0), 100)}% - 4px)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted font-semibold mt-1">
                <span>0 Extreme Fear</span>
                <span>50 Neutral</span>
                <span>100 Extreme Greed</span>
              </div>
            </div>

            {/* Historical trend points */}
            {fngHistory.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-muted uppercase">
                  14-Day Sentiment Timeline
                </span>
                <div className="mt-2 flex items-end gap-1.5 h-16 pt-2">
                  {fngHistory.slice(0, 14).reverse().map((item, idx) => {
                    const heightPct = Math.max(15, item.value);
                    const color =
                      item.value < 30
                        ? "bg-red-500"
                        : item.value < 55
                        ? "bg-amber-400"
                        : "bg-emerald-500";
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        <div
                          className={`w-full rounded-t-sm ${color} transition-all opacity-85 group-hover:opacity-100`}
                          style={{ height: `${heightPct}%` }}
                        />
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 rounded bg-black/90 px-1 py-0.5 text-[10px] text-white whitespace-nowrap z-10">
                          {item.value} ({item.classification})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border/60 bg-surface-2/30 p-2.5 text-xs text-muted leading-relaxed">
              <span className="font-semibold text-foreground">Cycle Playbook: </span>
              {fearGreed && fearGreed.value <= 30
                ? "Extreme Fear periods historically represent peak asymmetry for Dollar Cost Averaging (DCA)."
                : fearGreed && fearGreed.value >= 75
                ? "Extreme Greed periods warrant trailing stop-losses and selective profit-taking."
                : "Balanced sentiment regime. Focus on asset-specific breakout and fundamental confluence."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
