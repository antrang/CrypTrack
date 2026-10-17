"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { CandlestickChart, LineChart as LineIcon, AlignEndHorizontal } from "lucide-react";
import { PERIODS, type PeriodKey } from "@/lib/periods";
import { fetchChart } from "@/lib/coingecko";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPercent } from "@/lib/format";
import type { ChartData, SignalsData } from "@/lib/types";
import { clsx } from "./clsx";

type ChartType = "area" | "candlestick";

const COLORS = {
  up: "#16c784",
  down: "#ea3943",
  accent: "#5b8cff",
  grid: "#1e2740",
  text: "#8b97b3",
};

export function PriceChart({
  coinId,
  levels,
}: {
  coinId: string;
  levels?: SignalsData["levels"];
}) {
  const { price: fmtPrice, rate } = useCurrency();
  const [period, setPeriod] = useState<PeriodKey>("24H");
  const [type, setType] = useState<ChartType>("area");
  const [showLevels, setShowLevels] = useState(true);
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | ISeriesApi<"Candlestick"> | null>(null);

  // Fetch on coin/period change.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const d = await fetchChart(coinId, period);
        if (cancelled) return;
        setData(d);
        // Coin without OHLC can't show candles — force area.
        if (d.source !== "binance" && type === "candlestick") setType("area");
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, period]);

  // Build / rebuild the chart instance.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.text,
        fontFamily: "var(--font-sans), system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: COLORS.grid },
      },
      rightPriceScale: { borderColor: COLORS.grid },
      timeScale: { borderColor: COLORS.grid, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      height: 280,
      autoSize: true,
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // (Re)draw series when data or type changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data) return;
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    const up = (data.change?.pct ?? 0) >= 0;
    if (type === "candlestick" && data.candles.length) {
      const s = chart.addCandlestickSeries({
        upColor: COLORS.up,
        downColor: COLORS.down,
        borderUpColor: COLORS.up,
        borderDownColor: COLORS.down,
        wickUpColor: COLORS.up,
        wickDownColor: COLORS.down,
      });
      s.setData(
        data.candles.map((c) => ({
          time: c.t as UTCTimestamp,
          open: c.o * rate,
          high: c.h * rate,
          low: c.l * rate,
          close: c.c * rate,
        })),
      );
      seriesRef.current = s;
    } else {
      const color = up ? COLORS.up : COLORS.down;
      const s = chart.addAreaSeries({
        lineColor: color,
        topColor: up ? "rgba(22,199,132,0.25)" : "rgba(234,57,67,0.25)",
        bottomColor: "rgba(0,0,0,0)",
        lineWidth: 2,
      });
      s.setData(data.line.map((p) => ({ time: p.t as UTCTimestamp, value: p.v * rate })));
      seriesRef.current = s;
    }

    // Support/resistance price lines (dashed, labeled S1/S2/R1/R2).
    if (showLevels && levels?.length && seriesRef.current) {
      let sN = 0;
      let rN = 0;
      for (const lvl of levels) {
        const isSupport = lvl.kind === "support";
        const label = isSupport ? `S${++sN}` : `R${++rN}`;
        seriesRef.current.createPriceLine({
          price: lvl.price * rate,
          color: isSupport ? "rgba(22,199,132,0.55)" : "rgba(234,57,67,0.55)",
          lineWidth: 1,
          lineStyle: 2, // dashed
          axisLabelVisible: true,
          title: label,
        });
      }
    }

    chart.timeScale().fitContent();
  }, [data, type, rate, levels, showLevels]);

  const canCandle = data?.source === "binance";
  const change = data?.change;
  const lastPrice = data?.line.at(-1)?.v;

  const periodButtons = useMemo(() => PERIODS.map((p) => p.key), []);

  return (
    <div>
      {/* Header: price + change + type toggle */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          {lastPrice !== undefined && (
            <div className="text-xl font-semibold tabular">{fmtPrice(lastPrice)}</div>
          )}
          {change && (
            <div className={clsx("text-sm tabular", change.pct >= 0 ? "text-up" : "text-down")}>
              {formatPercent(change.pct)} · {period}
            </div>
          )}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <ToggleBtn active={type === "area"} onClick={() => setType("area")}>
            <LineIcon size={14} /> Line
          </ToggleBtn>
          <ToggleBtn
            active={type === "candlestick"}
            onClick={() => canCandle && setType("candlestick")}
            disabled={!canCandle}
            title={canCandle ? "" : "Candlesticks need a Binance-listed coin"}
          >
            <CandlestickChart size={14} /> Candles
          </ToggleBtn>
          {levels && levels.length > 0 && (
            <ToggleBtn
              active={showLevels}
              onClick={() => setShowLevels((v) => !v)}
              title="Toggle support/resistance levels"
            >
              <AlignEndHorizontal size={14} /> Levels
            </ToggleBtn>
          )}
        </div>
      </div>

      {/* Chart canvas */}
      <div className="relative">
        <div ref={containerRef} className="w-full h-[280px]" />
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">
            Loading chart…
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 grid place-items-center text-sm text-down">
            Couldn&apos;t load chart data.
          </div>
        )}
      </div>

      {data?.note && (
        <p className="mt-2 text-xs text-muted/80">{data.note}</p>
      )}

      {/* Period selector */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {periodButtons.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={clsx(
              "rounded-md px-2.5 py-1 text-xs font-medium tabular transition-colors",
              p === period
                ? "bg-accent text-white"
                : "bg-surface-2 text-muted hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}
