"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchMacro } from "@/lib/coingecko";
import type { MacroIntelligenceData } from "@/lib/types";

export function useMacro(pollIntervalMs = 60_000) {
  const [data, setData] = useState<MacroIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchMacro();
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load macro intelligence");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchMacro()
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load macro intelligence");
          setLoading(false);
        }
      });

    const timer = setInterval(() => {
      if (active) load();
    }, pollIntervalMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load, pollIntervalMs]);

  return { data, loading, error, refresh: load };
}
