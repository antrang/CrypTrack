"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Holding, MarketCoin } from "@/lib/types";
import { useCurrency } from "@/hooks/useCurrency";
import { clsx } from "./clsx";

interface Props {
  markets: MarketCoin[];
  onClose: () => void;
  onAdd: (h: Holding) => void;
}

export function AddHoldingDialog({ markets, onClose, onAdd }: Props) {
  const { price: fmtPrice, fromUsd, toUsd, symbol, active } = useCurrency();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketCoin | null>(null);
  const [qty, setQty] = useState("");
  // buyPrice is entered in the active display currency; stored as USD.
  const [buyPrice, setBuyPrice] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? markets.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.symbol.toLowerCase().includes(q),
        )
      : markets;
    return base.slice(0, 8);
  }, [query, markets]);

  function choose(c: MarketCoin) {
    setSelected(c);
    // Prefill in the active currency; rounded for readability.
    setBuyPrice(fromUsd(c.current_price).toFixed(active === "INR" ? 2 : 2));
  }

  function submit() {
    if (!selected) return;
    const q = parseFloat(qty);
    const entered = parseFloat(buyPrice);
    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(entered) || entered < 0)
      return;
    onAdd({
      coinId: selected.id,
      symbol: selected.symbol.toUpperCase(),
      name: selected.name,
      image: selected.image,
      qty: q,
      buyPrice: toUsd(entered), // always persist USD cost basis
    });
    onClose();
  }

  const valid =
    selected &&
    parseFloat(qty) > 0 &&
    Number.isFinite(parseFloat(buyPrice)) &&
    parseFloat(buyPrice) >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Add holding</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!selected ? (
            <>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search coin (BTC, Ethereum…)"
                  className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
              <ul className="max-h-64 overflow-y-auto -mx-1">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => choose(c)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-2 text-left"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt="" width={22} height={22} className="rounded-full" />
                      <span className="flex-1">
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="ml-2 text-xs text-muted uppercase">
                          {c.symbol}
                        </span>
                      </span>
                      <span className="tabular text-xs text-muted">
                        {fmtPrice(c.current_price)}
                      </span>
                    </button>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted">
                    No matches in top 100 by market cap.
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.image} alt="" width={28} height={28} className="rounded-full" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{selected.name}</div>
                  <div className="text-xs text-muted uppercase">{selected.symbol}</div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-accent hover:underline"
                >
                  Change
                </button>
              </div>

              <Field label="Quantity">
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent tabular"
                />
              </Field>

              <Field label={`Average buy price (${symbol})`}>
                <input
                  type="number"
                  inputMode="decimal"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent tabular"
                />
              </Field>

              <button
                onClick={submit}
                disabled={!valid}
                className={clsx(
                  "w-full rounded-lg py-2.5 text-sm font-medium transition-colors",
                  valid
                    ? "bg-accent text-white hover:opacity-90"
                    : "bg-surface-2 text-muted cursor-not-allowed",
                )}
              >
                Add to portfolio
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
