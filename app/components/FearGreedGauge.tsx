"use client";
import type { FearGreed } from "@/lib/types";

// Semicircular gauge for the Fear & Greed Index (0-100).
export function FearGreedGauge({ data }: { data: FearGreed | null }) {
  const value = data?.value ?? 0;
  const angle = -90 + (value / 100) * 180; // -90 (left) .. +90 (right)
  const color =
    value < 25 ? "var(--down)" : value < 45 ? "#f0a500" : value < 55 ? "#d8c100" : value < 75 ? "#8fd14f" : "var(--up)";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-44">
        {/* Track arc */}
        <path
          d="M10 100 A90 90 0 0 1 190 100"
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {/* Colored progress arc via dasharray */}
        <path
          d="M10 100 A90 90 0 0 1 190 100"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 283} 283`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        {/* Needle */}
        <g transform={`rotate(${angle} 100 100)`} style={{ transition: "transform 0.6s ease" }}>
          <line x1={100} y1={100} x2={100} y2={28} stroke={color} strokeWidth={3} strokeLinecap="round" />
          <circle cx={100} cy={100} r={5} fill={color} />
        </g>
      </svg>
      <div className="-mt-2 text-center">
        <div className="text-2xl font-semibold tabular" style={{ color }}>
          {data ? value : "—"}
        </div>
        <div className="text-xs text-muted">{data?.classification ?? "Loading…"}</div>
      </div>
    </div>
  );
}
