"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { fireNotification } from "@/lib/notify";
import { storage } from "@/lib/storage";
import { usePriceStore } from "@/lib/store";
import type { Alert } from "@/lib/types";

export interface AlertEvent {
  alert: Alert;
  price: number;
}

// Manages alerts and evaluates them against the live price store. When a
// threshold is crossed it fires a browser notification and invokes onTrigger
// (used by the UI for an in-app toast).
export function useAlerts(onTrigger?: (e: AlertEvent) => void) {
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    typeof window !== "undefined" ? storage.getAlerts() : [],
  );
  const [loaded] = useState(() => typeof window !== "undefined");
  const prices = usePriceStore((s) => s.prices);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const persist = useCallback((next: Alert[]) => {
    setAlerts(next);
    storage.setAlerts(next);
  }, []);

  const add = useCallback(
    (a: Omit<Alert, "id" | "createdAt" | "triggeredAt">) => {
      const alert: Alert = {
        ...a,
        id: `${a.coinId}-${Date.now()}`,
        createdAt: Date.now(),
        triggeredAt: null,
      };
      setAlerts((prev) => {
        const next = [...prev, alert];
        storage.setAlerts(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      storage.setAlerts(next);
      return next;
    });
  }, []);

  const reset = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, triggeredAt: null } : a,
      );
      storage.setAlerts(next);
      return next;
    });
  }, []);

  // Evaluate untriggered alerts whenever prices update.
  useEffect(() => {
    if (alerts.length === 0) return;
    let changed = false;
    const next = alerts.map((a) => {
      if (a.triggeredAt) return a;
      const tick = prices[a.coinId];
      if (!tick) return a;
      const crossed =
        a.direction === "above"
          ? tick.price >= a.target
          : tick.price <= a.target;
      if (crossed) {
        changed = true;
        fireNotification(
          `${a.name} ${a.direction} ${a.target}`,
          `${a.symbol} is now at ${tick.price}`,
        );
        onTriggerRef.current?.({ alert: a, price: tick.price });
        return { ...a, triggeredAt: Date.now() };
      }
      return a;
    });
    if (changed) persist(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, loaded]);

  return { alerts, loaded, add, remove, reset };
}
