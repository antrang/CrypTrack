"use client";
import { useCallback, useState } from "react";
import { storage } from "@/lib/storage";
import type { Holding } from "@/lib/types";

export function useHoldings() {
  const [holdings, setHoldings] = useState<Holding[]>(() =>
    typeof window !== "undefined" ? storage.getHoldings() : [],
  );
  const [loaded] = useState(() => typeof window !== "undefined");

  const persist = useCallback((next: Holding[]) => {
    setHoldings(next);
    storage.setHoldings(next);
  }, []);

  const upsert = useCallback(
    (h: Holding) => {
      setHoldings((prev) => {
        const idx = prev.findIndex((x) => x.coinId === h.coinId);
        let next: Holding[];
        if (idx >= 0) {
          // Merge into existing position: weighted-average cost basis.
          const existing = prev[idx];
          const totalQty = existing.qty + h.qty;
          const avgPrice =
            totalQty > 0
              ? (existing.qty * existing.buyPrice + h.qty * h.buyPrice) / totalQty
              : h.buyPrice;
          next = [...prev];
          next[idx] = { ...existing, qty: totalQty, buyPrice: avgPrice };
        } else {
          next = [...prev, h];
        }
        storage.setHoldings(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((coinId: string) => {
    setHoldings((prev) => {
      const next = prev.filter((h) => h.coinId !== coinId);
      storage.setHoldings(next);
      return next;
    });
  }, []);

  return { holdings, loaded, upsert, remove, setHoldings: persist };
}
