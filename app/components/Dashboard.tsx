"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMarkets } from "@/lib/coingecko";
import { storage } from "@/lib/storage";
import { useCurrencyStore, hydrateCurrency } from "@/lib/currency-store";
import { usePortfolioStore } from "@/lib/portfolio-store";
import { useUiStore } from "@/lib/ui-store";
import { useAlerts } from "@/hooks/useAlerts";
import { useLivePrices } from "@/hooks/useLivePrices";
import { formatUsd } from "@/lib/format";
import type { MarketCoin } from "@/lib/types";

import { Header } from "./Header";
import { PortfolioHub } from "./portfolio/PortfolioHub";
import { AddTransactionModal } from "./portfolio/AddTransactionModal";
import { BackupRestoreModal } from "./BackupRestoreModal";
import { MacroHub } from "./macro/MacroHub";
import { RecommendationsHub } from "./recommendations/RecommendationsHub";
import { SignalsHub } from "./signals/SignalsHub";
import { CoinDrawer } from "./CoinDrawer";
import { Toasts, type Toast } from "./Toasts";

const DEFAULT_WATCH = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "cardano",
  "dogecoin",
  "avalanche-2",
  "chainlink",
  "sui",
];

export function Dashboard() {
  const [markets, setMarkets] = useState<MarketCoin[]>([]);
  const [marketsError, setMarketsError] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const activeTab = useUiStore((s) => s.activeTab);
  const transactions = usePortfolioStore((s) => s.transactions);

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }, []);

  const { alerts, add: addAlert, remove: removeAlert, reset: resetAlert } = useAlerts((e) =>
    pushToast({
      title: `${e.alert.symbol} ${e.alert.direction} ${e.alert.target}`,
      body: `Now at ${formatUsd(e.price)}`,
    }),
  );

  // Watchlist = saved watchlist ∪ active portfolio coins
  const watchlist = useMemo(() => {
    const saved = storage.getWatchlist();
    const ids = new Set<string>(saved.length ? saved : DEFAULT_WATCH);
    transactions.forEach((tx) => ids.add(tx.coinId));
    return Array.from(ids);
  }, [transactions]);

  // Live price ids = Watchlist ∪ Alert coins ∪ Portfolio coins
  const liveIds = useMemo(() => {
    const ids = new Set<string>(watchlist);
    transactions.forEach((tx) => ids.add(tx.coinId));
    alerts.forEach((a) => ids.add(a.coinId));
    return Array.from(ids);
  }, [watchlist, transactions, alerts]);

  useLivePrices(liveIds);

  // Currency: restore saved choice + poll live USD→INR rate
  const setRate = useCurrencyStore((s) => s.setRate);
  useEffect(() => {
    hydrateCurrency();
    let active = true;
    const loadFx = () =>
      fetch("/api/fx")
        .then((r) => r.json())
        .then((d: { usdInr?: number }) => {
          if (active && typeof d.usdInr === "number") setRate(d.usdInr);
        })
        .catch(() => {});
    loadFx();
    const t = setInterval(loadFx, 60_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [setRate]);

  // Poll markets metadata (sparkline, market cap, 24h) every 30s
  useEffect(() => {
    let active = true;
    const load = () =>
      fetchMarkets()
        .then((m) => {
          if (!active) return;
          setMarkets(m);
          setMarketsError(false);
        })
        .catch(() => active && setMarketsError(true));
    load();
    const t = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const marketsById = useMemo(
    () => Object.fromEntries(markets.map((m) => [m.id, m])),
    [markets],
  );

  return (
    <div className="flex-1 min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6 flex-1">
        {marketsError && (
          <div className="rounded-xl border border-down/40 bg-down/10 px-4 py-2.5 text-xs text-down">
            Couldn&apos;t reach market metadata (CoinGecko rate limit?). Serving cached data; live
            ticks continue via Binance WebSocket. Retrying every 30s.
          </div>
        )}

        {/* Dynamic View rendering based on activeTab */}
        {activeTab === "portfolio" && <PortfolioHub marketsById={marketsById} />}
        {activeTab === "macro" && <MacroHub />}
        {activeTab === "recommendations" && <RecommendationsHub />}
        {activeTab === "signals" && (
          <SignalsHub
            markets={markets}
            watchlist={watchlist}
            alerts={alerts}
            onAddAlert={addAlert}
            onRemoveAlert={removeAlert}
            onResetAlert={resetAlert}
          />
        )}
      </main>

      {/* Global Interactive Modals and Drawers */}
      <CoinDrawer />
      <AddTransactionModal markets={markets} />
      <BackupRestoreModal />
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
