// Thin typed wrapper over localStorage. SSR-safe (no-ops on the server).
import { z } from "zod";
import type { Alert, Holding } from "./types";

const KEYS = {
  holdings: "cryptrack:holdings",
  alerts: "cryptrack:alerts",
  watchlist: "cryptrack:watchlist",
  currency: "cryptrack:currency",
} as const;

const HoldingSchema = z.object({
  coinId: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.string(),
  qty: z.number().nonnegative(),
  buyPrice: z.number().nonnegative(),
});

const AlertSchema = z.object({
  id: z.string(),
  coinId: z.string(),
  symbol: z.string(),
  name: z.string(),
  direction: z.enum(["above", "below"]),
  target: z.number(),
  createdAt: z.number(),
  triggeredAt: z.number().nullable(),
});

function read<T>(key: string, fallback: T, schema?: z.ZodType<T>): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (schema) {
      const result = schema.safeParse(parsed);
      return result.success ? result.data : fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or serialization failure — ignore for a single-user local app.
  }
}

export const storage = {
  getHoldings: (): Holding[] => read<Holding[]>(KEYS.holdings, [], z.array(HoldingSchema)),
  setHoldings: (h: Holding[]) => write(KEYS.holdings, h),
  getAlerts: (): Alert[] => read<Alert[]>(KEYS.alerts, [], z.array(AlertSchema)),
  setAlerts: (a: Alert[]) => write(KEYS.alerts, a),
  getWatchlist: (): string[] =>
    read<string[]>(KEYS.watchlist, ["bitcoin", "ethereum", "solana"], z.array(z.string())),
  setWatchlist: (ids: string[]) => write(KEYS.watchlist, ids),
  getCurrency: (): "USD" | "INR" =>
    read<"USD" | "INR">(KEYS.currency, "USD", z.enum(["USD", "INR"])),
  setCurrency: (c: "USD" | "INR") => write(KEYS.currency, c),
};
