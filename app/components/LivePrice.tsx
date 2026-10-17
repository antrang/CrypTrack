"use client";
import { memo, useEffect, useRef, useState } from "react";
import { usePriceStore } from "@/lib/store";
import { useCurrency } from "@/hooks/useCurrency";
import { clsx } from "./clsx";

// Renders a coin's live price and flashes green/red on each tick direction.
function LivePriceBase({
  coinId,
  fallback,
  className,
}: {
  coinId: string;
  fallback?: number;
  className?: string;
}) {
  const tick = usePriceStore((s) => s.prices[coinId]);
  const { price: fmtPrice } = useCurrency();
  const price = tick?.price ?? fallback;
  const prevRef = useRef<number | undefined>(price);
  const [flash, setFlash] = useState<"flash-up" | "flash-down" | "">("");

  useEffect(() => {
    if (price === undefined) return;
    const prev = prevRef.current;
    if (prev !== undefined && price !== prev) {
      setFlash(price > prev ? "flash-up" : "flash-down");
      const t = setTimeout(() => setFlash(""), 600);
      prevRef.current = price;
      return () => clearTimeout(t);
    }
    prevRef.current = price;
  }, [price]);

  return (
    <span
      className={clsx("tabular rounded px-1", flash, className)}
      title={tick?.source === "ws" ? "Live (Binance)" : "Polled (CoinGecko)"}
    >
      {price === undefined ? "—" : fmtPrice(price)}
    </span>
  );
}

export const LivePrice = memo(LivePriceBase);
