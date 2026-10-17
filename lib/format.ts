// Number / currency / percent formatting helpers.

export function formatUsd(value: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(value)) return "—";
  if (opts.compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  const fractionDigits = Math.abs(value) >= 1 ? 2 : value === 0 ? 2 : 6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  // Adapt precision to magnitude so sub-cent coins still read clearly.
  let digits = 2;
  if (Math.abs(value) < 1) digits = 4;
  if (Math.abs(value) < 0.01) digits = 6;
  if (Math.abs(value) < 0.0001) digits = 8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value);
}
