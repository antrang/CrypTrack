"use client";
import { useEffect, useState } from "react";
import { fetchSignals } from "@/lib/coingecko";
import type { SignalsData } from "@/lib/types";

// Module-level cache so multiple components (portfolio badge + drawer) share
// one fetch per coin. 60s TTL client-side; server has its own kline cache.
const cache = new Map<string, { data: SignalsData; expires: number }>();
const inflight = new Map<string, Promise<SignalsData>>();

async function load(coinId: string): Promise<SignalsData> {
  const hit = cache.get(coinId);
  if (hit && hit.expires > Date.now()) return hit.data;
  let p = inflight.get(coinId);
  if (!p) {
    p = fetchSignals(coinId)
      .then((data) => {
        cache.set(coinId, { data, expires: Date.now() + 60_000 });
        return data;
      })
      .finally(() => inflight.delete(coinId));
    inflight.set(coinId, p);
  }
  return p;
}

export function useSignals(coinId: string | null) {
  const [data, setData] = useState<SignalsData | null>(
    coinId ? cache.get(coinId)?.data ?? null : null,
  );
  const [loading, setLoading] = useState(!!coinId && !cache.get(coinId));

  useEffect(() => {
    if (!coinId) return;
    let cancelled = false;
    const hit = cache.get(coinId);
    if (hit && hit.expires > Date.now()) {
      return;
    }
    const fetchSignalsData = async () => {
      setLoading(true);
      try {
        const d = await load(coinId);
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSignalsData();
    return () => {
      cancelled = true;
    };
  }, [coinId]);

  return { signals: data, loading };
}
