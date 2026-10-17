// Global currency state: selected currency (persisted) + live USD→INR rate.
import { create } from "zustand";
import { storage } from "./storage";
import type { CurrencyCode } from "./currency";

interface CurrencyState {
  currency: CurrencyCode;
  usdInr: number; // 0 until the FX rate loads
  setCurrency: (c: CurrencyCode) => void;
  setRate: (r: number) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: "USD",
  usdInr: 0,
  setCurrency: (currency) => {
    storage.setCurrency(currency);
    set({ currency });
  },
  setRate: (usdInr) => set({ usdInr }),
}));

// Hydrate persisted currency choice on the client (after mount, SSR-safe).
export function hydrateCurrency() {
  const saved = storage.getCurrency();
  if (saved) useCurrencyStore.setState({ currency: saved });
}
