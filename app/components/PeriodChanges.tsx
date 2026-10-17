"use client";
import { useEffect, useState } from "react";
import { PERIODS } from "@/lib/periods";
import { fetchChanges } from "@/lib/coingecko";
import { formatPercent } from "@/lib/format";
import type { PeriodChange } from "@/lib/types";
import { clsx } from "./clsx";

// Grid of % change across all 12 timeframes.
export function PeriodChanges({ coinId }: { coinId: string }) {
  const [changes, setChanges] = useState<Record<string, PeriodChange> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const c = await fetchChanges(coinId);
        if (!cancelled) setChanges(c);
      } catch {
        if (!cancelled) setChanges({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [coinId]);

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
      {PERIODS.map((p) => {
        const ch = changes?.[p.key];
        const has = ch && Number.isFinite(ch.pct);
        return (
          <div
            key={p.key}
            className={clsx(
              "rounded-lg border border-border px-2 py-1.5 text-center",
              has && ch!.pct >= 0 && "bg-up/8",
              has && ch!.pct < 0 && "bg-down/8",
            )}
          >
            <div className="text-[10px] uppercase tracking-wide text-muted">{p.label}</div>
            <div
              className={clsx(
                "text-xs font-semibold tabular mt-0.5",
                !has ? "text-muted/50" : ch!.pct >= 0 ? "text-up" : "text-down",
              )}
            >
              {loading ? "·" : has ? formatPercent(ch!.pct) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
