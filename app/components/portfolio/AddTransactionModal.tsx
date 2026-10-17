"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { usePortfolioStore } from "@/lib/portfolio-store";
import { useCurrency } from "@/hooks/useCurrency";
import { useUiStore } from "@/lib/ui-store";
import type { MarketCoin, TransactionType } from "@/lib/types";

interface Props {
  markets: MarketCoin[];
}

export function AddTransactionModal({ markets }: Props) {
  const show = useUiStore((s) => s.showAddTransaction);
  const preselectedCoinId = useUiStore((s) => s.addTransactionPreselectCoinId);
  const close = useUiStore((s) => s.closeAddTransaction);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in" onClick={close} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
              <Plus size={18} />
            </span>
            <h2 className="text-base font-semibold">Log Transaction</h2>
          </div>
          <button onClick={close} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <AddTransactionForm
          key={preselectedCoinId || "default"}
          initialCoinId={preselectedCoinId || "bitcoin"}
          markets={markets}
          onClose={close}
        />
      </div>
    </div>
  );
}

function AddTransactionForm({
  initialCoinId,
  markets,
  onClose,
}: {
  initialCoinId: string;
  markets: MarketCoin[];
  onClose: () => void;
}) {
  const buckets = usePortfolioStore((s) => s.buckets);
  const addTransaction = usePortfolioStore((s) => s.addTransaction);
  const { money, currency, rate } = useCurrency();

  const [selectedCoinId, setSelectedCoinId] = useState<string>(initialCoinId);
  const [bucketId, setBucketId] = useState<string>("core");
  const [type, setType] = useState<TransactionType>("BUY");
  const [amountStr, setAmountStr] = useState<string>("1");
  const [feeStr, setFeeStr] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const selectedCoin = useMemo(() => {
    return markets.find((m) => m.id === selectedCoinId) ?? markets[0];
  }, [markets, selectedCoinId]);

  const [priceStr, setPriceStr] = useState<string>(() =>
    selectedCoin ? selectedCoin.current_price.toString() : "",
  );

  const filteredCoins = markets.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  const amount = parseFloat(amountStr) || 0;
  const priceUsd = parseFloat(priceStr) || 0;
  const feeUsd = parseFloat(feeStr) || 0;
  const totalValueUsd = amount * priceUsd;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin || amount <= 0 || priceUsd < 0) return;

    addTransaction({
      bucketId: bucketId || "core",
      coinId: selectedCoin.id,
      symbol: selectedCoin.symbol.toUpperCase(),
      name: selectedCoin.name,
      type,
      amount,
      pricePerUnitUsd: priceUsd,
      feeUsd,
      notes,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* Transaction Type Buttons */}
      <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-surface-2/60 p-1 border border-border">
        {(["BUY", "SELL", "TRANSFER_IN", "TRANSFER_OUT"] as TransactionType[]).map((t) => {
          const active = type === t;
          return (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                active
                  ? t === "BUY" || t === "TRANSFER_IN"
                    ? "bg-up text-white shadow-sm"
                    : "bg-down text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              {t === "BUY"
                ? "Buy"
                : t === "SELL"
                ? "Sell"
                : t === "TRANSFER_IN"
                ? "Transfer In"
                : "Transfer Out"}
            </button>
          );
        })}
      </div>

      {/* Portfolio Bucket Selector */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">Portfolio Bucket</label>
        <select
          value={bucketId}
          onChange={(e) => setBucketId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {buckets.map((b) => (
            <option key={b.id} value={b.id} className="bg-surface">
              {b.name} ({b.type})
            </option>
          ))}
        </select>
      </div>

      {/* Asset Selector */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">Select Asset</label>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search coin (e.g. BTC, Solana)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="max-h-32 overflow-y-auto rounded-xl border border-border divide-y divide-border/40 bg-surface-2/20">
            {filteredCoins.slice(0, 15).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCoinId(c.id);
                  setPriceStr(c.current_price.toString());
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                  selectedCoinId === c.id
                    ? "bg-accent/15 text-accent font-semibold"
                    : "hover:bg-surface-2"
                }`}
              >
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" width={18} height={18} className="rounded-full" />
                )}
                <span className="font-medium">{c.name}</span>
                <span className="text-muted uppercase text-[11px]">{c.symbol}</span>
                <span className="ml-auto tabular text-muted">{money(c.current_price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Amount & Price Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Quantity ({selectedCoin?.symbol.toUpperCase()})
          </label>
          <input
            type="number"
            step="any"
            min="0.00000001"
            required
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent tabular"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Price per Unit (USD)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            required
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent tabular"
          />
        </div>
      </div>

      {/* Fee & Notes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Fee (USD)</label>
          <input
            type="number"
            step="any"
            min="0"
            value={feeStr}
            onChange={(e) => setFeeStr(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent tabular"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Notes</label>
          <input
            type="text"
            placeholder="Exchange, DCA batch..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2/40 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Valuation Preview */}
      <div className="rounded-xl border border-border/80 bg-surface-2/40 p-3.5 flex items-center justify-between text-xs">
        <span className="text-muted">Total Transaction Value</span>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground tabular">{money(totalValueUsd)}</span>
          {currency === "INR" && (
            <div className="text-[11px] text-muted tabular">≈ ₹{(totalValueUsd * rate).toFixed(2)}</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-accent py-2.5 text-xs font-semibold text-white hover:opacity-90 shadow-sm"
        >
          Save Transaction
        </button>
      </div>
    </form>
  );
}
