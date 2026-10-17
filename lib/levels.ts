// Support/resistance detection from daily OHLC via swing-pivot clustering.
// Pure functions — fed by Binance daily klines.

export interface OhlcBar {
  h: number;
  l: number;
  c: number;
}

export interface Level {
  price: number;
  touches: number;
  kind: "support" | "resistance";
}

// A pivot high is a bar whose high exceeds the highs of `wing` bars on each
// side; pivot low mirrored. Classic fractal detection.
function findPivots(bars: OhlcBar[], wing = 3): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = wing; i < bars.length - wing; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - wing; j <= i + wing; j++) {
      if (j === i) continue;
      if (bars[j].h >= bars[i].h) isHigh = false;
      if (bars[j].l <= bars[i].l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push(bars[i].h);
    if (isLow) lows.push(bars[i].l);
  }
  return { highs, lows };
}

// Cluster nearby pivot prices (within `tolerance` fraction) into levels ranked
// by touch count. More touches = stronger level.
function cluster(prices: number[], tolerance = 0.0075): { price: number; touches: number }[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters: { sum: number; count: number; anchor: number }[] = [];
  for (const p of sorted) {
    const hit = clusters.find((c) => Math.abs(p - c.anchor) / c.anchor <= tolerance);
    if (hit) {
      hit.sum += p;
      hit.count++;
      hit.anchor = hit.sum / hit.count;
    } else {
      clusters.push({ sum: p, count: 1, anchor: p });
    }
  }
  return clusters.map((c) => ({ price: c.sum / c.count, touches: c.count }));
}

/**
 * Top support levels below and resistance levels above the current price.
 * `bars` should be ~90-250 daily candles.
 */
export function detectLevels(
  bars: OhlcBar[],
  currentPrice: number,
  maxPerSide = 3,
): Level[] {
  if (bars.length < 10 || !Number.isFinite(currentPrice)) return [];
  const { highs, lows } = findPivots(bars);
  const all = cluster([...highs, ...lows]);

  const supports = all
    .filter((l) => l.price < currentPrice)
    .sort((a, b) => b.touches - a.touches || b.price - a.price)
    .slice(0, maxPerSide)
    .map((l) => ({ ...l, kind: "support" as const }));

  const resistances = all
    .filter((l) => l.price >= currentPrice)
    .sort((a, b) => b.touches - a.touches || a.price - b.price)
    .slice(0, maxPerSide)
    .map((l) => ({ ...l, kind: "resistance" as const }));

  // Sort for display: nearest-to-price first within each side.
  supports.sort((a, b) => b.price - a.price);
  resistances.sort((a, b) => a.price - b.price);
  return [...supports, ...resistances];
}
