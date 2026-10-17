"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { fetchCoinChart, fetchDiscover, type DiscoverData } from "@/lib/coingecko";
import { useUiStore } from "@/lib/ui-store";
import { useCurrency } from "@/hooks/useCurrency";
import { computeIndicators } from "@/lib/indicators";
import { formatPercent } from "@/lib/format";
import type { Alert, Indicators, MarketCoin } from "@/lib/types";
import { AlertsPanel } from "../AlertsPanel";
import { LivePrice } from "../LivePrice";

interface Props {
  markets: MarketCoin[];
  watchlist: string[];
  alerts: Alert[];
  onAddAlert: (a: Omit<Alert, "id" | "createdAt" | "triggeredAt">) => void;
  onRemoveAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
}

export function SignalsHub({
  markets,
  watchlist,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onResetAlert,
}: Props) {
  const [indicators, setIndicators] = useState<Record<string, Indicators>>({});
  const [discover, setDiscover] = useState<DiscoverData | null>(null);
  const openCoin = useUiStore((s) => s.openCoin);
  const { money } = useCurrency();

  const byId = Object.fromEntries(markets.map((m) => [m.id, m]));

  // Poll discover data
  useEffect(() => {
    fetchDiscover()
      .then(setDiscover)
      .catch(() => {});
  }, []);

  // Compute indicators for watchlist items
  useEffect(() => {
    let cancelled = false;
    const ids = watchlist.slice(0, 10);
    Promise.all(
      ids.map(async (id) => {
        try {
          const chart = await fetchCoinChart(id, 100);
          return [id, computeIndicators(chart.closes)] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const map: Record<string, Indicators> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setIndicators(map);
    });
    return () => {
      cancelled = true;
    };
  }, [watchlist.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...markets].sort(
    (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h,
  );
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div>
        <h2 className="text-base font-bold text-foreground">Watchlist &amp; Market Signals</h2>
        <p className="text-xs text-muted">
          Real-time streaming prices, multi-timeframe indicator confluence, and price alerts
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Watchlist Confluence Matrix (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/15 text-accent">
                  <Activity size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Watchlist Technical Signals</h3>
                  <p className="text-xs text-muted">RSI momentum, SMA 20/50 cross, and MACD</p>
                </div>
              </div>
              <span className="text-xs text-muted tabular">{watchlist.length} pinned</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted font-medium border-b border-border/80 bg-surface-2/30">
                    <th className="px-3 py-2">Asset</th>
                    <th className="px-3 py-2 text-right">Live Price</th>
                    <th className="px-3 py-2 text-right">24h</th>
                    <th className="px-3 py-2 text-center">RSI (14)</th>
                    <th className="px-3 py-2 text-center">SMA (20/50)</th>
                    <th className="px-3 py-2 text-center">MACD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {watchlist.slice(0, 10).map((id) => {
                    const m = byId[id];
                    const ind = indicators[id];
                    const rsiVal = ind?.rsi;
                    const rsiBull = rsiVal && rsiVal >= 52 && rsiVal <= 70;
                    const rsiOverbought = rsiVal && rsiVal > 70;
                    const rsiOversold = rsiVal && rsiVal < 35;

                    const smaBull = ind?.sma20 && ind?.sma50 && ind.sma20 > ind.sma50;
                    const macdBull = ind?.histogram !== null && ind?.histogram !== undefined && ind.histogram >= 0;

                    return (
                      <tr
                        key={id}
                        onClick={() =>
                          openCoin(
                            id,
                            m ? { name: m.name, symbol: m.symbol.toUpperCase(), image: m.image } : undefined,
                          )
                        }
                        className="hover:bg-surface-2/40 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {m?.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.image} alt="" width={20} height={20} className="rounded-full" />
                            )}
                            <span className="font-semibold text-foreground">{m?.name ?? id}</span>
                            <span className="text-[10px] text-muted uppercase">{m?.symbol}</span>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right font-medium">
                          <LivePrice coinId={id} fallback={m?.current_price} />
                        </td>

                        <td className="px-3 py-2.5 text-right tabular font-medium">
                          {m && (
                            <span className={m.price_change_percentage_24h >= 0 ? "text-up" : "text-down"}>
                              {formatPercent(m.price_change_percentage_24h)}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {rsiVal !== null && rsiVal !== undefined ? (
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                rsiBull
                                  ? "bg-up/12 text-up"
                                  : rsiOverbought
                                  ? "bg-amber-500/15 text-amber-500"
                                  : rsiOversold
                                  ? "bg-blue-500/15 text-blue-500"
                                  : "bg-surface-2 text-muted"
                              }`}
                            >
                              {rsiVal.toFixed(0)} {rsiOverbought ? "· Over" : rsiOversold ? "· Dip" : ""}
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">…</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {ind?.sma20 && ind?.sma50 ? (
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                smaBull ? "bg-up/12 text-up" : "bg-down/12 text-down"
                              }`}
                            >
                              {smaBull ? "Golden" : "Death"}
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">…</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {ind?.histogram !== null && ind?.histogram !== undefined ? (
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                macdBull ? "bg-up/12 text-up" : "bg-down/12 text-down"
                              }`}
                            >
                              {macdBull ? "Bullish" : "Bearish"}
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">…</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Movers (Gainers & Losers) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-2">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <ArrowUpRight size={14} className="text-up" /> Top 24h Gainers
              </span>
              <ul className="divide-y divide-border/60">
                {gainers.map((c) => (
                  <li
                    key={c.id}
                    onClick={() =>
                      openCoin(c.id, {
                        name: c.name,
                        symbol: c.symbol.toUpperCase(),
                        image: c.image,
                      })
                    }
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-surface-2/40 px-2 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt="" width={18} height={18} className="rounded-full" />
                      <span className="font-semibold text-foreground uppercase">{c.symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted tabular">{money(c.current_price)}</span>
                      <span className="text-up font-bold tabular w-14 text-right">
                        {formatPercent(c.price_change_percentage_24h)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4 space-y-2">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <ArrowDownRight size={14} className="text-down" /> Top 24h Decliners
              </span>
              <ul className="divide-y divide-border/60">
                {losers.map((c) => (
                  <li
                    key={c.id}
                    onClick={() =>
                      openCoin(c.id, {
                        name: c.name,
                        symbol: c.symbol.toUpperCase(),
                        image: c.image,
                      })
                    }
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-surface-2/40 px-2 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt="" width={18} height={18} className="rounded-full" />
                      <span className="font-semibold text-foreground uppercase">{c.symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted tabular">{money(c.current_price)}</span>
                      <span className="text-down font-bold tabular w-14 text-right">
                        {formatPercent(c.price_change_percentage_24h)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right col: Price Alerts Manager & Gaining Narratives */}
        <div className="space-y-4">
          <AlertsPanel
            alerts={alerts}
            markets={markets}
            onAdd={onAddAlert}
            onRemove={onRemoveAlert}
            onReset={onResetAlert}
          />

          {/* Gaining Narratives */}
          {discover && discover.categories.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted uppercase">
                <TrendingUp size={14} className="text-up" /> Narratives Gaining Traction
              </div>
              <ul className="divide-y divide-border/60 text-xs">
                {discover.categories.slice(0, 5).map((cat) => (
                  <li key={cat.id} className="py-2 flex items-center justify-between">
                    <span className="font-medium text-foreground truncate pr-2">{cat.name}</span>
                    <span
                      className={`tabular font-bold shrink-0 ${
                        cat.change24h >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {formatPercent(cat.change24h)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
