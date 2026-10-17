"use client";
import { useMemo } from "react";
import { useCurrencyStore } from "@/lib/currency-store";
import {
  CURRENCIES,
  formatMoney,
  formatPriceIn,
  type CurrencyCode,
} from "@/lib/currency";

// Currency-aware money helpers. All inputs are USD; output respects the user's
// selected currency and the live FX rate. When INR is selected but the rate
// hasn't loaded yet (usdInr === 0), it transparently falls back to USD.
export function useCurrency() {
  const currency = useCurrencyStore((s) => s.currency);
  const usdInr = useCurrencyStore((s) => s.usdInr);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  return useMemo(() => {
    const inrReady = currency === "INR" && usdInr > 0;
    const active: CurrencyCode = inrReady ? "INR" : "USD";
    const def = CURRENCIES[active];
    const rate = active === "INR" ? usdInr : 1;

    return {
      currency,
      active,
      symbol: def.symbol,
      rate,
      rateReady: currency === "USD" || usdInr > 0,
      setCurrency,
      /** Convert a USD amount into the active currency (number). */
      fromUsd: (usd: number) => usd * rate,
      /** Convert an amount entered in the active currency back to USD. */
      toUsd: (amount: number) => (rate ? amount / rate : amount),
      /** Format a USD amount as money in the active currency. */
      money: (usd: number, opts?: { compact?: boolean }) =>
        formatMoney(usd * rate, def, opts),
      /** Format a USD price (magnitude-adaptive) in the active currency. */
      price: (usd: number) => formatPriceIn(usd * rate, def),
    };
  }, [currency, usdInr, setCurrency]);
}
