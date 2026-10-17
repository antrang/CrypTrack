"use client";
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  FolderKanban,
  History,
  Layers,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useCurrency } from "@/hooks/useCurrency";
import { useUiStore } from "@/lib/ui-store";
import { formatPercent, formatQty } from "@/lib/format";
import type { MarketCoin } from "@/lib/types";
import { TransactionLedgerTable } from "./TransactionLedgerTable";
import { LivePrice } from "../LivePrice";

interface Props {
  marketsById: Record<string, MarketCoin>;
}

export function PortfolioHub({ marketsById }: Props) {
  const {
    buckets,
    activeBucketId,
    setActiveBucketId,
    addBucket,
    positions,
    totals,
    transactions,
    deleteTransaction,
  } = usePortfolio(marketsById);

  const { money } = useCurrency();
  const openCoin = useUiStore((s) => s.openCoin);
  const openAddTransaction = useUiStore((s) => s.openAddTransaction);

  const [activeView, setActiveView] = useState<"positions" | "ledger">("positions");
  const [showNewBucket, setShowNewBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");

  const handleCreateBucket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    const colors = ["#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#6366f1"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    addBucket(newBucketName.trim(), "custom", randomColor);
    setNewBucketName("");
    setShowNewBucket(false);
  };

  return (
    <div className="space-y-4">
      {/* Bucket Bar & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveBucketId("all")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeBucketId === "all"
                ? "bg-accent text-white shadow-sm"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            <Layers size={13} /> All Portfolios
          </button>

          {buckets.map((b) => {
            const active = activeBucketId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setActiveBucketId(b.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-surface-2 text-foreground font-semibold border-2"
                    : "border border-border bg-surface text-muted hover:text-foreground"
                }`}
                style={{ borderColor: active ? b.color || "#3b82f6" : undefined }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: b.color || "#3b82f6" }}
                />
                {b.name}
              </button>
            );
          })}

          <button
            onClick={() => setShowNewBucket(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:border-muted transition-colors"
          >
            <Plus size={12} /> New Bucket
          </button>
        </div>

        <button
          onClick={() => openAddTransaction()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-sm"
        >
          <Plus size={14} /> Log Transaction
        </button>
      </div>

      {/* New Bucket Input inline */}
      {showNewBucket && (
        <form onSubmit={handleCreateBucket} className="flex gap-2 items-center rounded-xl border border-border bg-surface p-3">
          <FolderKanban size={16} className="text-accent" />
          <input
            type="text"
            placeholder="Bucket name (e.g. DeFi Yield, Staking)..."
            value={newBucketName}
            onChange={(e) => setNewBucketName(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted/60 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowNewBucket(false)}
            className="text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Totals Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-xs">
        <div className="bg-surface px-5 py-3.5">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Total Value
          </span>
          <div className="text-xl font-bold tabular mt-0.5 text-foreground">
            {money(totals.value)}
          </div>
        </div>

        <div className="bg-surface px-5 py-3.5">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Cost Basis
          </span>
          <div className="text-xl font-semibold tabular mt-0.5 text-muted">
            {money(totals.cost)}
          </div>
        </div>

        <div className="bg-surface px-5 py-3.5">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Unrealized P/L
          </span>
          <div
            className={`text-xl font-bold tabular mt-0.5 flex items-center gap-1 ${
              totals.unrealizedPl >= 0 ? "text-up" : "text-down"
            }`}
          >
            {totals.unrealizedPl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {money(totals.unrealizedPl)}
            <span className="text-xs font-medium opacity-80">
              ({formatPercent(totals.unrealizedPlPct)})
            </span>
          </div>
        </div>

        <div className="bg-surface px-5 py-3.5">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Realized P/L
          </span>
          <div
            className={`text-xl font-semibold tabular mt-0.5 ${
              totals.realizedPl >= 0 ? "text-up" : "text-down"
            }`}
          >
            {money(totals.realizedPl)}
          </div>
        </div>

        <div className="bg-surface px-5 py-3.5 col-span-2 sm:col-span-4 lg:col-span-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Net Return
          </span>
          <div
            className={`text-xl font-bold tabular mt-0.5 ${
              totals.totalPl >= 0 ? "text-up" : "text-down"
            }`}
          >
            {money(totals.totalPl)}
          </div>
        </div>
      </div>

      {/* Sub-view switcher: Positions vs Ledger */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("positions")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeView === "positions"
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <BarChart2 size={14} /> Active Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveView("ledger")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeView === "ledger"
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <History size={14} /> Transaction Ledger ({transactions.length})
          </button>
        </div>
      </div>

      {/* Active View Container */}
      {activeView === "ledger" ? (
        <TransactionLedgerTable
          transactions={transactions}
          buckets={buckets}
          onDelete={deleteTransaction}
        />
      ) : positions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface-2/20">
          <p className="text-sm font-medium text-foreground">No open positions in this bucket</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Log your first Buy or Transfer transaction to track live valuation, DCA cost basis, and
            real-time P&amp;L.
          </p>
          <button
            onClick={() => openAddTransaction()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <Plus size={14} /> Log your first transaction
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2/40 text-left text-muted font-medium">
                <th className="px-5 py-3">Asset</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3 text-right">24h</th>
                <th className="px-3 py-3 text-right">Holdings</th>
                <th className="px-3 py-3 text-right">DCA Buy Price</th>
                <th className="px-3 py-3 text-right">Value</th>
                <th className="px-3 py-3 text-right">Unrealized P/L</th>
                <th className="px-3 py-3 text-right">Realized</th>
                <th className="px-3 py-3 text-right">Alloc</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {positions.map((pos) => {
                return (
                  <tr key={pos.coinId} className="hover:bg-surface-2/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() =>
                          openCoin(pos.coinId, {
                            name: pos.name,
                            symbol: pos.symbol,
                            image: pos.image,
                          })
                        }
                        className="flex items-center gap-2.5 text-left hover:opacity-80"
                      >
                        {pos.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pos.image}
                            alt=""
                            width={26}
                            height={26}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-semibold text-foreground text-sm leading-tight">
                            {pos.name}
                          </div>
                          <div className="text-[11px] text-muted uppercase">{pos.symbol}</div>
                        </div>
                      </button>
                    </td>

                    <td className="px-3 py-3.5 text-right font-medium">
                      <LivePrice coinId={pos.coinId} fallback={pos.currentPrice} />
                    </td>

                    <td className="px-3 py-3.5 text-right font-medium">
                      <span
                        className={`inline-flex items-center gap-0.5 tabular ${
                          pos.change24h >= 0 ? "text-up" : "text-down"
                        }`}
                      >
                        {pos.change24h >= 0 ? (
                          <ArrowUpRight size={12} />
                        ) : (
                          <ArrowDownRight size={12} />
                        )}
                        {formatPercent(pos.change24h)}
                      </span>
                    </td>

                    <td className="px-3 py-3.5 text-right tabular text-muted font-medium">
                      {formatQty(pos.totalQty)} {pos.symbol}
                    </td>

                    <td className="px-3 py-3.5 text-right tabular font-medium text-foreground">
                      {money(pos.avgBuyPrice)}
                    </td>

                    <td className="px-3 py-3.5 text-right tabular font-semibold text-foreground text-sm">
                      {money(pos.currentValue)}
                    </td>

                    <td className="px-3 py-3.5 text-right">
                      <div
                        className={`tabular font-semibold ${
                          pos.unrealizedPl >= 0 ? "text-up" : "text-down"
                        }`}
                      >
                        {money(pos.unrealizedPl)}
                        <div className="text-[10px] opacity-80">
                          {formatPercent(pos.unrealizedPlPct)}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-right tabular text-muted">
                      {Math.abs(pos.realizedPl) > 0.01 ? (
                        <span className={pos.realizedPl >= 0 ? "text-up font-medium" : "text-down font-medium"}>
                          {money(pos.realizedPl)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-12 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${Math.min(pos.allocationPct, 100)}%` }}
                          />
                        </div>
                        <span className="tabular text-[11px] text-muted w-7 text-right">
                          {pos.allocationPct.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openAddTransaction(pos.coinId)}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                      >
                        + Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
