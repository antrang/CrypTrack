import { create } from "zustand";
import { z } from "zod";
import type { PortfolioBucket, PortfolioBucketType, Transaction } from "./types";
import { storage } from "./storage";

const StoredBucketSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["core", "tactical", "defi", "custom"]),
  description: z.string().optional(),
  color: z.string().optional(),
  createdAt: z.number(),
});

const StoredTransactionSchema = z.object({
  id: z.string(),
  bucketId: z.string(),
  coinId: z.string(),
  symbol: z.string(),
  name: z.string(),
  type: z.enum(["BUY", "SELL", "TRANSFER_IN", "TRANSFER_OUT"]),
  amount: z.number().nonnegative(),
  pricePerUnitUsd: z.number().nonnegative(),
  feeUsd: z.number().optional(),
  timestamp: z.number(),
  notes: z.string().optional(),
});

const STORAGE_BUCKETS_KEY = "cryptrack:v4:buckets";
const STORAGE_TXNS_KEY = "cryptrack:v4:transactions";

const DEFAULT_BUCKETS: PortfolioBucket[] = [
  {
    id: "core",
    name: "Core Long-Term",
    type: "core",
    description: "High-conviction long-term holdings and DCA positions.",
    color: "#3b82f6",
    createdAt: Date.now(),
  },
  {
    id: "tactical",
    name: "Tactical Alpha",
    type: "tactical",
    description: "Active swing trades and momentum breakout setups.",
    color: "#8b5cf6",
    createdAt: Date.now(),
  },
];

interface PortfolioStoreState {
  buckets: PortfolioBucket[];
  transactions: Transaction[];
  activeBucketId: string | "all";
  hydrated: boolean;
  hydrate: () => void;
  setActiveBucketId: (id: string | "all") => void;
  addBucket: (
    name: string,
    type?: PortfolioBucketType,
    color?: string,
    description?: string,
  ) => PortfolioBucket;
  deleteBucket: (id: string) => void;
  addTransaction: (
    tx: Omit<Transaction, "id" | "timestamp"> & { timestamp?: number },
  ) => Transaction;
  deleteTransaction: (id: string) => void;
  importBackup: (backup: {
    buckets?: PortfolioBucket[];
    transactions?: Transaction[];
  }) => boolean;
  exportBackup: () => {
    buckets: PortfolioBucket[];
    transactions: Transaction[];
    exportedAt: string;
  };
}

function safeGetJson<T>(key: string, fallback: T, schema?: z.ZodType<T>): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
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

function safeSetJson(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export const usePortfolioStore = create<PortfolioStoreState>((set, get) => ({
  buckets: DEFAULT_BUCKETS,
  transactions: [],
  activeBucketId: "all",
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;

    let buckets = safeGetJson<PortfolioBucket[]>(
      STORAGE_BUCKETS_KEY,
      [],
      z.array(StoredBucketSchema),
    );
    if (!buckets || buckets.length === 0) {
      buckets = DEFAULT_BUCKETS;
      safeSetJson(STORAGE_BUCKETS_KEY, buckets);
    }

    let txns = safeGetJson<Transaction[]>(
      STORAGE_TXNS_KEY,
      [],
      z.array(StoredTransactionSchema),
    );

    // Automatic migration from v1-v3 flat holdings
    if (!txns || txns.length === 0) {
      try {
        const legacyHoldings = storage.getHoldings();
        if (legacyHoldings && legacyHoldings.length > 0) {
          const migrated: Transaction[] = legacyHoldings.map((h, i) => ({
            id: `migrated-${h.coinId}-${Date.now()}-${i}`,
            bucketId: "core",
            coinId: h.coinId,
            symbol: h.symbol.toUpperCase(),
            name: h.name,
            type: "BUY",
            amount: h.qty,
            pricePerUnitUsd: h.buyPrice,
            feeUsd: 0,
            timestamp: Date.now() - (legacyHoldings.length - i) * 86400000,
            notes: "Migrated from previous holdings",
          }));
          txns = migrated;
          safeSetJson(STORAGE_TXNS_KEY, txns);
        }
      } catch {}
    }

    set({ buckets, transactions: txns || [], hydrated: true });
  },

  setActiveBucketId: (id) => set({ activeBucketId: id }),

  addBucket: (name, type = "custom", color = "#10b981", description = "") => {
    const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newBucket: PortfolioBucket = {
      id,
      name,
      type,
      color,
      description,
      createdAt: Date.now(),
    };
    const next = [...get().buckets, newBucket];
    set({ buckets: next });
    safeSetJson(STORAGE_BUCKETS_KEY, next);
    return newBucket;
  },

  deleteBucket: (id) => {
    // Core bucket cannot be deleted
    if (id === "core") return;
    const nextBuckets = get().buckets.filter((b) => b.id !== id);
    // Re-assign or remove transactions belonging to deleted bucket
    const nextTxns = get().transactions.map((tx) =>
      tx.bucketId === id ? { ...tx, bucketId: "core" } : tx,
    );
    const active = get().activeBucketId === id ? "all" : get().activeBucketId;

    set({ buckets: nextBuckets, transactions: nextTxns, activeBucketId: active });
    safeSetJson(STORAGE_BUCKETS_KEY, nextBuckets);
    safeSetJson(STORAGE_TXNS_KEY, nextTxns);
  },

  addTransaction: (tx) => {
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullTx: Transaction = {
      ...tx,
      id,
      timestamp: tx.timestamp ?? Date.now(),
    };
    const next = [...get().transactions, fullTx];
    set({ transactions: next });
    safeSetJson(STORAGE_TXNS_KEY, next);
    return fullTx;
  },

  deleteTransaction: (id) => {
    const next = get().transactions.filter((t) => t.id !== id);
    set({ transactions: next });
    safeSetJson(STORAGE_TXNS_KEY, next);
  },

  importBackup: (backup) => {
    if (!backup) return false;
    try {
      const bucketParse = z.array(StoredBucketSchema).safeParse(backup.buckets);
      const txParse = z.array(StoredTransactionSchema).safeParse(backup.transactions);

      const buckets =
        bucketParse.success && bucketParse.data.length > 0
          ? bucketParse.data
          : get().buckets;
      const transactions = txParse.success ? txParse.data : [];

      set({ buckets, transactions, activeBucketId: "all" });
      safeSetJson(STORAGE_BUCKETS_KEY, buckets);
      safeSetJson(STORAGE_TXNS_KEY, transactions);
      return true;
    } catch {
      return false;
    }
  },

  exportBackup: () => {
    return {
      buckets: get().buckets,
      transactions: get().transactions,
      exportedAt: new Date().toISOString(),
    };
  },
}));
