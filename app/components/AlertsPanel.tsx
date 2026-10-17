"use client";
import { useState } from "react";
import { Bell, BellRing, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ensureNotificationPermission } from "@/lib/notify";
import { usePriceStore } from "@/lib/store";
import { useCurrency } from "@/hooks/useCurrency";
import type { Alert, AlertDirection, MarketCoin } from "@/lib/types";
import { Card, CardHeader, Pill } from "./ui";
import { clsx } from "./clsx";

interface Props {
  alerts: Alert[];
  markets: MarketCoin[];
  onAdd: (a: Omit<Alert, "id" | "createdAt" | "triggeredAt">) => void;
  onRemove: (id: string) => void;
  onReset: (id: string) => void;
}

export function AlertsPanel({ alerts, markets, onAdd, onRemove, onReset }: Props) {
  const prices = usePriceStore((s) => s.prices);
  const { price: fmtPrice, toUsd, symbol } = useCurrency();
  const [adding, setAdding] = useState(false);
  const [coinId, setCoinId] = useState("bitcoin");
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [target, setTarget] = useState("");

  async function submit() {
    const entered = parseFloat(target);
    const m = markets.find((x) => x.id === coinId);
    if (!m || !Number.isFinite(entered) || entered <= 0) return;
    await ensureNotificationPermission();
    onAdd({
      coinId,
      symbol: m.symbol.toUpperCase(),
      name: m.name,
      direction,
      target: toUsd(entered), // store USD; prices are evaluated in USD
    });
    setTarget("");
    setAdding(false);
  }

  return (
    <Card>
      <CardHeader
        title="PRICE ALERTS"
        subtitle={`${alerts.filter((a) => !a.triggeredAt).length} active`}
        right={
          <button
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/25"
          >
            <Plus size={15} /> New alert
          </button>
        }
      />

      {adding && (
        <div className="flex flex-wrap items-end gap-2 px-5 py-4 border-b border-border bg-surface-2/40">
          <label className="flex-1 min-w-[120px]">
            <span className="text-xs text-muted">Coin</span>
            <select
              value={coinId}
              onChange={(e) => setCoinId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent"
            >
              {markets.slice(0, 50).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.symbol.toUpperCase()})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-muted">When</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as AlertDirection)}
              className="mt-1 block rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="above">Rises above</option>
              <option value="below">Falls below</option>
            </select>
          </label>
          <label className="w-28">
            <span className="text-xs text-muted">Price ({symbol})</span>
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent tabular"
            />
          </label>
          <button
            onClick={submit}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Set
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted">
          <Bell size={20} className="mx-auto mb-2 opacity-50" />
          No alerts set. Get notified when a coin crosses your target.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {alerts.map((a) => {
            const price = prices[a.coinId]?.price;
            const triggered = !!a.triggeredAt;
            return (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className={clsx(triggered ? "text-up" : "text-muted")}>
                  {triggered ? <BellRing size={16} /> : <Bell size={16} />}
                </span>
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{a.symbol}</span>{" "}
                    <span className="text-muted">
                      {a.direction === "above" ? "rises above" : "falls below"}
                    </span>{" "}
                    <span className="tabular font-medium">{fmtPrice(a.target)}</span>
                  </div>
                  <div className="text-xs text-muted tabular">
                    {price !== undefined ? `now ${fmtPrice(price)}` : "—"}
                    {triggered && " · triggered"}
                  </div>
                </div>
                {triggered ? (
                  <Pill tone="up">Hit</Pill>
                ) : (
                  <Pill tone="accent">Watching</Pill>
                )}
                {triggered && (
                  <button
                    onClick={() => onReset(a.id)}
                    className="text-muted hover:text-accent"
                    aria-label="Re-arm alert"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  onClick={() => onRemove(a.id)}
                  className="text-muted/60 hover:text-down"
                  aria-label="Delete alert"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
