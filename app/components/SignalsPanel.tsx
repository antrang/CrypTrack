"use client";
import { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { fetchCoinChart, fetchFearGreed } from "@/lib/coingecko";
import { useUiStore } from "@/lib/ui-store";
import { useCurrency } from "@/hooks/useCurrency";
import { computeIndicators } from "@/lib/indicators";
import { formatPercent } from "@/lib/format";
import type { FearGreed, Indicators, MarketCoin } from "@/lib/types";
import { Card, CardHeader, Pill } from "./ui";
import { FearGreedGauge } from "./FearGreedGauge";
import { clsx } from "./clsx";

interface Props {
  markets: MarketCoin[];
  watchlist: string[];
}

export function SignalsPanel({ markets, watchlist }: Props) {
  const [fng, setFng] = useState<FearGreed | null>(null);
  const [indicators, setIndicators] = useState<Record<string, Indicators>>({});
  const openCoin = useUiStore((s) => s.openCoin);
  const pickCoin = (c: MarketCoin) =>
    openCoin(c.id, { name: c.name, symbol: c.symbol.toUpperCase(), image: c.image });

  useEffect(() => {
    fetchFearGreed().then(setFng).catch(() => setFng(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ids = watchlist.slice(0, 6);
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

  const byId = Object.fromEntries(markets.map((m) => [m.id, m]));

  const sorted = [...markets].sort(
    (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h,
  );
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <div className="grid gap-4">
      {/* Sentiment */}
      <Card>
        <CardHeader title="MARKET SENTIMENT" subtitle="Fear & Greed Index" />
        <div className="p-5 pt-4">
          <FearGreedGauge data={fng} />
        </div>
      </Card>

      {/* Technical signals */}
      <Card>
        <CardHeader
          title="TECHNICAL SIGNALS"
          subtitle="RSI · SMA cross · MACD"
          right={<Activity size={15} className="text-muted" />}
        />
        <div className="divide-y divide-border/60">
          {watchlist.slice(0, 6).map((id) => {
            const m = byId[id];
            const ind = indicators[id];
            return (
              <div
                key={id}
                onClick={() =>
                  openCoin(
                    id,
                    m
                      ? { name: m.name, symbol: m.symbol.toUpperCase(), image: m.image }
                      : undefined,
                  )
                }
                className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-surface-2/40"
                title="View chart, performance & news"
              >
                <div className="flex items-center gap-2 w-32 shrink-0">
                  {m?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" width={20} height={20} className="rounded-full" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {m?.name ?? id}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end flex-1">
                  {ind ? (
                    <>
                      <RsiBadge rsi={ind.rsi} />
                      <SmaBadge sma20={ind.sma20} sma50={ind.sma50} />
                      <MacdBadge histogram={ind.histogram} />
                    </>
                  ) : (
                    <span className="text-xs text-muted">computing…</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top movers */}
      <Card>
        <CardHeader title="TOP MOVERS" subtitle="24h across top 100" />
        <div className="grid grid-cols-2 divide-x divide-border/60">
          <MoversColumn title="Gainers" up coins={gainers} onPick={pickCoin} />
          <MoversColumn title="Losers" up={false} coins={losers} onPick={pickCoin} />
        </div>
      </Card>
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
  return (
    <Pill tone={bull ? "up" : "down"}>
      SMA {bull ? "Golden" : "Death"}
    </Pill>
  );
}

function MacdBadge({ histogram }: { histogram: number | null }) {
  if (histogram === null) return null;
  const bull = histogram >= 0;
  return <Pill tone={bull ? "up" : "down"}>MACD {bull ? "Bullish" : "Bearish"}</Pill>;
}

function MoversColumn({
  title,
  up,
  coins,
  onPick,
}: {
  title: string;
  up: boolean;
  coins: MarketCoin[];
  onPick: (coin: MarketCoin) => void;
}) {
  const { price: fmtPrice } = useCurrency();
  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-1 text-xs text-muted mb-2">
        {up ? (
          <ArrowUpRight size={13} className="text-up" />
        ) : (
          <ArrowDownRight size={13} className="text-down" />
        )}
        {title}
      </div>
      <ul className="space-y-2">
        {coins.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onPick(c)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 hover:bg-surface-2 text-left"
              title="View chart, performance & news"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" width={18} height={18} className="rounded-full" />
              <span className="text-xs font-medium uppercase">{c.symbol}</span>
              <span className="ml-auto text-xs tabular text-muted">
                {fmtPrice(c.current_price)}
              </span>
              <span
                className={clsx(
                  "text-xs tabular w-16 text-right",
                  c.price_change_percentage_24h >= 0 ? "text-up" : "text-down",
                )}
              >
                {formatPercent(c.price_change_percentage_24h)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
