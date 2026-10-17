// UI-only store: which coin's detail drawer is open (+ its display meta).
import { create } from "zustand";

export interface CoinMeta {
  name: string;
  symbol: string; // upper-case
  image: string;
}

export type AppTab = "portfolio" | "macro" | "recommendations" | "signals";

interface UiState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  selectedCoinId: string | null;
  selectedMeta: CoinMeta | null;
  openCoin: (id: string, meta?: CoinMeta) => void;
  closeCoin: () => void;
  showAddTransaction: boolean;
  addTransactionPreselectCoinId: string | null;
  openAddTransaction: (coinId?: string) => void;
  closeAddTransaction: () => void;
  showBackupRestore: boolean;
  setShowBackupRestore: (show: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: "portfolio",
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedCoinId: null,
  selectedMeta: null,
  openCoin: (id, meta) => set({ selectedCoinId: id, selectedMeta: meta ?? null }),
  closeCoin: () => set({ selectedCoinId: null, selectedMeta: null }),
  showAddTransaction: false,
  addTransactionPreselectCoinId: null,
  openAddTransaction: (coinId) =>
    set({ showAddTransaction: true, addTransactionPreselectCoinId: coinId ?? null }),
  closeAddTransaction: () =>
    set({ showAddTransaction: false, addTransactionPreselectCoinId: null }),
  showBackupRestore: false,
  setShowBackupRestore: (show) => set({ showBackupRestore: show }),
}));

