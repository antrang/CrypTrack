// Currency definitions + USD-base money formatting. Internally everything is
// stored in USD; display converts via a live FX rate.

export type CurrencyCode = "USD" | "INR";

export interface CurrencyDef {
  code: CurrencyCode;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  USD: { code: "USD", symbol: "$", locale: "en-US" },
  INR: { code: "INR", symbol: "₹", locale: "en-IN" },
};

// Format an already-converted amount in the target currency.
export function formatMoney(
  amount: number,
  cur: CurrencyDef,
  opts: { compact?: boolean } = {},
): string {
  if (!Number.isFinite(amount)) return "—";
  if (opts.compact && Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat(cur.locale, {
      style: "currency",
      currency: cur.code,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(amount);
  }
  const fractionDigits = Math.abs(amount) >= 1 ? 2 : amount === 0 ? 2 : 6;
  return new Intl.NumberFormat(cur.locale, {
    style: "currency",
    currency: cur.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

// Price formatting with magnitude-adaptive precision (sub-unit coins).
export function formatPriceIn(amount: number, cur: CurrencyDef): string {
  if (!Number.isFinite(amount)) return "—";
  let digits = 2;
  if (Math.abs(amount) < 1) digits = 4;
  if (Math.abs(amount) < 0.01) digits = 6;
  if (Math.abs(amount) < 0.0001) digits = 8;
  return new Intl.NumberFormat(cur.locale, {
    style: "currency",
    currency: cur.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(amount);
}
