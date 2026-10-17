"use client";
import { useEffect, useMemo } from "react";
import { usePortfolioStore } from "@/lib/portfolio-store";
import { usePriceStore } from "@/lib/store";
import { aggregatePositions } from "@/lib/portfolio-math";
import type { MarketCoin } from "@/lib/types";

export function usePortfolio(marketsById: Record<string, MarketCoin> = {}) {
  const buckets = usePortfolioStore((s) => s.buckets);
  const transactions = usePortfolioStore((s) => s.transactions);
  const activeBucketId = usePortfolioStore((s) => s.activeBucketId);
  const hydrated = usePortfolioStore((s) => s.hydrated);
  const hydrate = usePortfolioStore((s) => s.hydrate);
  const setActiveBucketId = usePortfolioStore((s) => s.setActiveBucketId);
  const addBucket = usePortfolioStore((s) => s.addBucket);
  const deleteBucket = usePortfolioStore((s) => s.deleteBucket);
  const addTransaction = usePortfolioStore((s) => s.addTransaction);
  const deleteTransaction = usePortfolioStore((s) => s.deleteTransaction);

  const prices = usePriceStore((s) => s.prices);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Aggregate positions and totals for the selected bucket (or "all")
  const { positions, totals } = useMemo(() => {
    return aggregatePositions(transactions, prices, marketsById, activeBucketId);
  }, [transactions, prices, marketsById, activeBucketId]);

  // Filtered transactions for display in ledger
  const visibleTransactions = useMemo(() => {
    if (!activeBucketId || activeBucketId === "all") return transactions;
    return transactions.filter((t) => t.bucketId === activeBucketId);
  }, [transactions, activeBucketId]);

  const activeBucket = useMemo(() => {
    if (activeBucketId === "all") return null;
    return buckets.find((b) => b.id === activeBucketId) ?? null;
  }, [buckets, activeBucketId]);

  return {
    hydrated,
    buckets,
    activeBucketId,
    activeBucket,
    setActiveBucketId,
    addBucket,
    deleteBucket,
    transactions: visibleTransactions,
    allTransactions: transactions,
    positions,
    totals,
    addTransaction,
    deleteTransaction,
  };
}
