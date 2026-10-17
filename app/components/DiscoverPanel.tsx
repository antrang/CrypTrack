"use client";
import { useEffect, useState } from "react";
import { Flame, Sparkles, TrendingUp } from "lucide-react";
import { fetchDiscover, type DiscoverData } from "@/lib/coingecko";
import { useUiStore } from "@/lib/ui-store";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPercent } from "@/lib/format";
import { Card, CardHeader } from "./ui";
import { clsx } from "./clsx";

export function DiscoverPanel() {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const openCoin = useUiStore((s) => s.openCoin);
  const { money } = useCurrency();

  useEffect(() => {
    let cancelled = false;
    fetchDiscover()
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ trending: [], categories: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader
        title="DISCOVER"
        subtitle="Trending coins & narratives gaining traction"
        right={<Sparkles size={15} className="text-accent" />}
      />
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
        {/* Trending coins */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
            <Flame size={13} className="text-accent" /> Trending (most searched)
          </div>
          {loading ? (
            <Skeleton rows={6} />
          ) : (
            <ul className="space-y-1">
              {data?.trending.map((c, i) => (
                <li key={c.id}>
                  <button
                    onClick={() =>
                      openCoin(c.id, {
                        name: c.name,
                        symbol: c.symbol.toUpperCase(),
                        image: c.image,
                      })
                    }
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2 text-left"
                  >
                    <span className="w-4 text-xs text-muted tabular">{i + 1}</span>
                    {c.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" width={20} height={20} className="rounded-full" />
                    )}
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <span className="text-xs text-muted uppercase">{c.symbol}</span>
                    {c.priceChange24h !== null && (
                      <span
                        className={clsx(
                          "ml-auto text-xs tabular",
                          c.priceChange24h >= 0 ? "text-up" : "text-down",
                        )}
                      >
                        {formatPercent(c.priceChange24h)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Concept categories gaining traction */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
            <TrendingUp size={13} className="text-up" /> Narratives gaining (24h mcap)
          </div>
          {loading ? (
            <Skeleton rows={6} />
          ) : (
            <ul className="space-y-1.5">
              {data?.categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                >
                  <div className="flex -space-x-1.5">
                    {cat.top.slice(0, 3).map((img, i) =>
                      img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img}
                          alt=""
                          width={18}
                          height={18}
                          className="rounded-full ring-2 ring-surface"
                        />
                      ) : null,
                    )}
                  </div>
                  <span className="text-sm font-medium truncate flex-1">{cat.name}</span>
                  <span className="text-[11px] text-muted tabular hidden sm:block">
                    {money(cat.marketCap, { compact: true })}
                  </span>
                  <span
                    className={clsx(
                      "text-xs font-semibold tabular w-16 text-right",
                      cat.change24h >= 0 ? "text-up" : "text-down",
                    )}
                  >
                    {formatPercent(cat.change24h)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-7 rounded-lg bg-surface-2/60 animate-pulse" />
      ))}
    </div>
  );
}
