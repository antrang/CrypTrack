"use client";
import { useMemo } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { usePriceStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPercent, formatQty } from "@/lib/format";
import type { Holding, MarketCoin } from "@/lib/types";
import { Card, CardHeader, changeTone } from "./ui";
import { LivePrice } from "./LivePrice";
import { ScoreBadge } from "./ScoreBadge";
import { clsx } from "./clsx";

interface Props {
  holdings: Holding[];
  marketsById: Record<string, MarketCoin>;
  onAdd: () => void;
  onRemove: (coinId: string) => void;
}

export function PortfolioPanel({ holdings, marketsById, onAdd, onRemove }: Props) {
  const prices = usePriceStore((s) => s.prices);
  const openCoin = useUiStore((s) => s.openCoin);
  const { money } = useCurrency();

  const rows = useMemo(() => {
    return holdings.map((h) => {
      const live = prices[h.coinId]?.price;
      const market = marketsById[h.coinId];
      const price = live ?? market?.current_price ?? h.buyPrice;
      const value = price * h.qty;
      const cost = h.buyPrice * h.qty;
      const pl = value - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;
      return { h, price, value, cost, pl, plPct };
    });
  }, [holdings, prices, marketsById]);

  const totals = useMemo(() => {
    const value = rows.reduce((a, r) => a + r.value, 0);
    const cost = rows.reduce((a, r) => a + r.cost, 0);
    const pl = value - cost;
    const plPct = cost > 0 ? (pl / cost) * 100 : 0;
    return { value, cost, pl, plPct };
  }, [rows]);

  return (
    <Card>
      <CardHeader
        title="PORTFOLIO"
        subtitle={`${holdings.length} position${holdings.length === 1 ? "" : "s"}`}
        right={
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/25 transition-colors"
          >
            <Plus size={15} /> Add holding
          </button>
        }
      />

      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
        <Stat label="Total value" value={money(totals.value)} />
        <Stat label="Cost basis" value={money(totals.cost)} />
        <Stat
          label="Unrealized P/L"
          value={money(totals.pl)}
          tone={changeTone(totals.pl)}
        />
        <Stat
          label="Return"
          value={formatPercent(totals.plPct)}
          tone={changeTone(totals.pl)}
        />
      </div>

      {holdings.length === 0 ? (
        <Empty onAdd={onAdd} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="font-medium px-5 py-2.5">Asset</th>
                <th className="font-medium px-3 py-2.5 text-right">Price</th>
                <th className="font-medium px-3 py-2.5 text-right">24h</th>
                <th className="font-medium px-3 py-2.5 text-right">Signal</th>
                <th className="font-medium px-3 py-2.5 text-right">Holdings</th>
                <th className="font-medium px-3 py-2.5 text-right">Value</th>
                <th className="font-medium px-3 py-2.5 text-right">P/L</th>
                <th className="font-medium px-3 py-2.5 text-right">Alloc</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ch =
                  prices[r.h.coinId]?.changePct24h ??
                  marketsById[r.h.coinId]?.price_change_percentage_24h ??
                  0;
                const alloc = totals.value > 0 ? (r.value / totals.value) * 100 : 0;
                return (
                  <tr
                    key={r.h.coinId}
                    className="border-t border-border/60 hover:bg-surface-2/40 group"
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() =>
                          openCoin(r.h.coinId, {
                            name: r.h.name,
                            symbol: r.h.symbol,
                            image: r.h.image,
                          })
                        }
                        className="flex items-center gap-2.5 text-left hover:opacity-80"
                        title="View chart, performance & news"
                      >
                        {r.h.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.h.image}
                            alt=""
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-medium leading-tight">{r.h.name}</div>
                          <div className="text-xs text-muted">{r.h.symbol}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <LivePrice coinId={r.h.coinId} fallback={r.price} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={clsx("tabular", ch >= 0 ? "text-up" : "text-down")}>
                        {formatPercent(ch)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ScoreBadge coinId={r.h.coinId} />
                    </td>
                    <td className="px-3 py-3 text-right tabular text-muted">
                      {formatQty(r.h.qty)} {r.h.symbol}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {money(r.value)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className={clsx("tabular", r.pl >= 0 ? "text-up" : "text-down")}>
                        <span className="inline-flex items-center gap-1 justify-end">
                          {r.pl >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {money(r.pl)}
                        </span>
                        <div className="text-xs opacity-80">{formatPercent(r.plPct)}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-12 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${Math.min(alloc, 100)}%` }}
                          />
                        </div>
                        <span className="tabular text-xs text-muted w-9 text-right">
                          {alloc.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => onRemove(r.h.coinId)}
                        className="text-muted/60 hover:text-down opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove ${r.h.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}) {
  const color =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground";
  return (
    <div className="bg-surface px-5 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={clsx("text-lg font-semibold tabular mt-0.5", color)}>{value}</div>
    </div>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm text-muted">No holdings yet.</p>
      <p className="text-xs text-muted/70 mt-1">
        Add a position to track live value, P/L and allocation.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        <Plus size={15} /> Add your first holding
      </button>
    </div>
  );
}
