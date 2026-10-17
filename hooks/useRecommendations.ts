"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchRecommendations } from "@/lib/coingecko";
import type { RecommendationItem } from "@/lib/types";

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRecommendations();
      setRecommendations(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchRecommendations()
      .then((res) => {
        if (active) {
          setRecommendations(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load recommendations");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { recommendations, loading, error, refresh: load };
}
