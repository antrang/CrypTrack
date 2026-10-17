"use client";
import { macdState, rsiState, trendState, TIMEFRAMES, type CellState } from "@/lib/score";
import type { SignalsData } from "@/lib/types";
import { clsx } from "./clsx";

// Multi-timeframe confluence matrix: 1H/4H/1D/1W × RSI/MACD/Trend.
export function SignalMatrix({ signals }: { signals: SignalsData }) {
  const rows = TIMEFRAMES.filter((tf) => signals.matrix[tf]);
  if (!rows.length) return null;

  const bearishCount = rows.filter((tf) => {
    const ind = signals.matrix[tf]!;
    const states = [
      rsiState(ind.rsi),
      macdState(ind.histogram),
      trendState(ind.sma20, ind.sma50),
    ];
    return states.filter((s) => s === "bear").length >= 2;
  }).length;
  const bullishCount = rows.filter((tf) => {
    const ind = signals.matrix[tf]!;
    const states = [
      rsiState(ind.rsi),
      macdState(ind.histogram),
      trendState(ind.sma20, ind.sma50),
    ];
    return states.filter((s) => s === "bull").length >= 2;
  }).length;

  return (
    <div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted">
            <th className="text-left font-medium py-1.5 w-12">TF</th>
            <th className="text-center font-medium py-1.5">RSI</th>
            <th className="text-center font-medium py-1.5">MACD</th>
            <th className="text-center font-medium py-1.5">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tf) => {
            const ind = signals.matrix[tf]!;
            return (
              <tr key={tf} className="border-t border-border/60">
                <td className="py-1.5 font-semibold tabular">{tf}</td>
                <Cell state={rsiState(ind.rsi)}>
                  {ind.rsi !== null ? ind.rsi.toFixed(0) : "—"}
                </Cell>
                <Cell state={macdState(ind.histogram)}>
                  {ind.histogram !== null ? (ind.histogram >= 0 ? "Bull" : "Bear") : "—"}
                </Cell>
                <Cell state={trendState(ind.sma20, ind.sma50)}>
                  {ind.sma20 !== null && ind.sma50 !== null
                    ? ind.sma20 >= ind.sma50
                      ? "Up"
                      : "Down"
                    : "—"}
                </Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted">
        Confluence: {bullishCount}/{rows.length} timeframes bullish ·{" "}
        {bearishCount}/{rows.length} bearish
        {signals.partial && " · intraday data unavailable for this coin"}
      </p>
    </div>
  );
}

function Cell({ state, children }: { state: CellState; children: React.ReactNode }) {
  return (
    <td className="py-1.5 text-center">
      <span
        className={clsx(
          "inline-block min-w-14 rounded-md px-2 py-1 font-medium tabular",
          state === "bull" && "bg-up/12 text-up",
          state === "bear" && "bg-down/12 text-down",
          state === "flat" && "bg-surface-2 text-muted",
        )}
      >
        {children}
      </span>
    </td>
  );
}
