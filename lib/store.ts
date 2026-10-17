// Shared live-price store. Keyed by CoinGecko id -> latest USD price.
import { create } from "zustand";

export interface PriceTick {
  price: number;
  changePct24h: number; // rolling 24h % when available from the feed
  updatedAt: number;
  source: "ws" | "rest";
}

interface PriceState {
  prices: Record<string, PriceTick>;
  setPrice: (coinId: string, tick: PriceTick) => void;
  setManyPrices: (ticks: Record<string, PriceTick>) => void;
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  prices: {},
  setPrice: (coinId, tick) =>
    set((s) => ({ prices: { ...s.prices, [coinId]: tick } })),
  setManyPrices: (ticks) =>
    set((s) => ({ prices: { ...s.prices, ...ticks } })),
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
}));

// Non-reactive read for use inside subscriptions / callbacks.
export function getPrice(coinId: string): PriceTick | undefined {
  return usePriceStore.getState().prices[coinId];
}
