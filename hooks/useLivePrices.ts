"use client";
import { useEffect, useRef } from "react";
import { BinanceWsClient } from "@/lib/binanceWs";
import { binanceSymbolFor } from "@/lib/coins";
import { fetchSimplePrices } from "@/lib/coingecko";
import { usePriceStore } from "@/lib/store";

// Wires a Binance WS feed for supported coins and a REST poll fallback for the
// rest. `coinIds` is the union of holdings + watchlist + visible markets.
export function useLivePrices(coinIds: string[]) {
  const setPrice = usePriceStore((s) => s.setPrice);
  const setManyPrices = usePriceStore((s) => s.setManyPrices);
  const setWsConnected = usePriceStore((s) => s.setWsConnected);
  const clientRef = useRef<BinanceWsClient | null>(null);

  // Stable key so the effect only re-runs when the set actually changes.
  const key = Array.from(new Set(coinIds)).sort().join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!clientRef.current) {
      clientRef.current = new BinanceWsClient(
        (tick) =>
          setPrice(tick.coinId, {
            price: tick.price,
            changePct24h: tick.changePct24h,
            updatedAt: Date.now(),
            source: "ws",
          }),
        (connected) => setWsConnected(connected),
      );
    }
    if (ids.length === 0) {
      clientRef.current.disconnect();
      return;
    }
    clientRef.current.setCoins(ids);

    // REST fallback for coins without a Binance mapping.
    const restIds = ids.filter((id) => binanceSymbolFor(id) === null);
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      if (restIds.length === 0) return;
      try {
        const data = await fetchSimplePrices(restIds);
        const ticks = Object.fromEntries(
          Object.entries(data).map(([id, v]) => [
            id,
            {
              price: v.price,
              changePct24h: v.changePct24h,
              updatedAt: Date.now(),
              source: "rest" as const,
            },
          ]),
        );
        setManyPrices(ticks);
      } catch {
        // transient — next tick retries
      }
    };
    void poll();
    if (restIds.length > 0) timer = setInterval(poll, 20_000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [key, setPrice, setManyPrices, setWsConnected]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);
}
