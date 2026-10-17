"use client";
import { memo } from "react";

interface Props {
  data: number[];
  width?: number;
  height?: number;
}

// Lightweight inline SVG sparkline — no chart lib overhead for tiny series.
function SparklineBase({ data, width = 96, height = 28 }: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const up = data[data.length - 1] >= data[0];
  const color = up ? "var(--up)" : "var(--down)";
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const Sparkline = memo(SparklineBase);
