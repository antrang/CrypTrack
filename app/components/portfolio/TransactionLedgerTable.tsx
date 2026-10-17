"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search, Trash2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { formatQty } from "@/lib/format";
import type { PortfolioBucket, Transaction } from "@/lib/types";

interface Props {
  transactions: Transaction[];
  buckets: PortfolioBucket[];
  onDelete: (id: string) => void;
}

export function TransactionLedgerTable({ transactions, buckets, onDelete }: Props) {
  const { money } = useCurrency();
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const bucketMap = new Map(buckets.map((b) => [b.id, b]));

  const filtered = transactions.filter((tx) => {
    const matchesType = filterType === "ALL" || tx.type === filterType;
    const matchesSearch =
      tx.symbol.toLowerCase().includes(search.toLowerCase()) ||
      tx.name.toLowerCase().includes(search.toLowerCase()) ||
      (tx.notes ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-muted" />
          <input
            type="text"
            placeholder="Search transactions or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2/40 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-surface-2/60 p-1 border border-border self-start">
          {["ALL", "BUY", "SELL", "TRANSFER_IN", "TRANSFER_OUT"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filterType === t
                  ? "bg-surface text-foreground font-semibold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t === "ALL" ? "All" : t === "BUY" ? "Buys" : t === "SELL" ? "Sells" : "Transfers"}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-surface-2/20 py-10 text-center text-xs text-muted">
          No transactions match your current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2/40 text-left text-muted font-medium">
                <th className="px-4 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Bucket</th>
                <th className="px-3 py-2.5">Asset</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5 text-right">Execution Price</th>
                <th className="px-3 py-2.5 text-right">Total USD</th>
                <th className="px-3 py-2.5">Notes</th>
                <th className="px-3 py-2.5 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((tx) => {
                const total = tx.amount * tx.pricePerUnitUsd;
                const bucket = bucketMap.get(tx.bucketId);
                return (
                  <tr key={tx.id} className="hover:bg-surface-2/40 transition-colors group">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted tabular">
                      {new Date(tx.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          tx.type === "BUY" || tx.type === "TRANSFER_IN"
                            ? "bg-up/12 text-up"
                            : "bg-down/12 text-down"
                        }`}
                      >
                        {tx.type === "BUY" || tx.type === "TRANSFER_IN" ? (
                          <ArrowDownLeft size={11} />
                        ) : (
                          <ArrowUpRight size={11} />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className="inline-block rounded-md px-2 py-0.5 text-[10px] font-medium border"
                        style={{
                          borderColor: `${bucket?.color || "#3b82f6"}40`,
                          backgroundColor: `${bucket?.color || "#3b82f6"}15`,
                          color: bucket?.color || "#3b82f6",
                        }}
                      >
                        {bucket?.name || tx.bucketId}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                      <span className="font-semibold text-foreground">{tx.symbol}</span>{" "}
                      <span className="text-muted text-[11px]">({tx.name})</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular font-medium">
                      {formatQty(tx.amount)} {tx.symbol}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-muted">
                      {money(tx.pricePerUnitUsd)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular font-semibold text-foreground">
                      {money(total)}
                    </td>
                    <td className="px-3 py-2.5 text-muted truncate max-w-xs">{tx.notes || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => onDelete(tx.id)}
                        className="text-muted/50 hover:text-down opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete transaction"
                      >
                        <Trash2 size={13} />
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
