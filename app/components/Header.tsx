"use client";
import { Activity, Compass, Database, Globe, Layers, Wifi, WifiOff } from "lucide-react";
import { usePriceStore } from "@/lib/store";
import { useCurrency } from "@/hooks/useCurrency";
import { useUiStore, type AppTab } from "@/lib/ui-store";

const TABS: { id: AppTab; label: string; icon: typeof Layers }[] = [
  { id: "portfolio", label: "Portfolio Hub", icon: Layers },
  { id: "macro", label: "Market Intelligence", icon: Globe },
  { id: "recommendations", label: "Research & Signals", icon: Compass },
  { id: "signals", label: "Watchlist & Alerts", icon: Activity },
];

export function Header() {
  const connected = usePriceStore((s) => s.wsConnected);
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setShowBackupRestore = useUiStore((s) => s.setShowBackupRestore);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30 shadow-sm">
            <Activity size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold leading-none tracking-tight">CrypTrack</h1>
              <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">Portfolio & Market Intelligence</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-surface-2/70 p-1 border border-border/80">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Utility Controls */}
        <div className="flex items-center gap-2.5">
          <CurrencyToggle />

          <button
            onClick={() => setShowBackupRestore(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2/40 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            title="Backup & Restore portfolio state"
          >
            <Database size={13} />
            <span className="hidden lg:inline">Backup</span>
          </button>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              connected ? "bg-up/12 text-up" : "bg-surface-2 text-muted"
            }`}
            title={connected ? "Sub-second Binance WebSocket live streaming" : "Connecting to Binance WebSocket..."}
          >
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{connected ? "Live" : "Polling"}</span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border-t border-border/60 bg-surface/50 px-2 py-1.5 overflow-x-auto gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                active ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              <span>{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

function CurrencyToggle() {
  const { currency, setCurrency, rate, active } = useCurrency();
  const options: ("USD" | "INR")[] = ["USD", "INR"];
  return (
    <div
      className="inline-flex rounded-lg border border-border overflow-hidden text-xs font-medium bg-surface-2/30"
      title={
        active === "INR"
          ? `Live USD→INR ≈ ₹${rate.toFixed(2)} (via Frankfurter)`
          : "Switch currency to Indian Rupee"
      }
    >
      {options.map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-2 py-1 transition-colors ${
            currency === c
              ? "bg-accent text-white font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          {c === "USD" ? "$ USD" : "₹ INR"}
        </button>
      ))}
    </div>
  );
}
