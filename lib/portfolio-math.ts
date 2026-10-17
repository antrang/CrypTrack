// Pure, unit-testable portfolio accounting math for CrypTrack.
import Papa from "papaparse";
import type {
  AggregatedPosition,
  MarketCoin,
  PortfolioTotals,
  Transaction,
} from "./types";

const VALID_TX_TYPES = new Set<Transaction["type"]>([
  "BUY",
  "SELL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
]);

/**
 * Updates weighted average cost basis when a BUY transaction occurs.
 */
export function computeNewCostBasis(
  prevQty: number,
  prevAvgPrice: number,
  buyQty: number,
  buyPrice: number,
): { newQty: number; newAvgPrice: number } {
  if (buyQty <= 0) return { newQty: prevQty, newAvgPrice: prevAvgPrice };
  if (prevQty <= 0) return { newQty: buyQty, newAvgPrice: buyPrice };

  const totalCost = prevQty * prevAvgPrice + buyQty * buyPrice;
  const newQty = prevQty + buyQty;
  const newAvgPrice = totalCost / newQty;

  return { newQty, newAvgPrice };
}

/**
 * Calculates realized P&L when a SELL transaction occurs.
 */
export function computeRealizedPlForSale(
  sellQty: number,
  sellPrice: number,
  avgCostBasis: number,
  feeUsd = 0,
): number {
  if (sellQty <= 0) return 0;
  return (sellPrice - avgCostBasis) * sellQty - feeUsd;
}

/**
 * Aggregates a flat list of transactions into position summaries.
 */
export function aggregatePositions(
  transactions: Transaction[],
  livePrices: Record<string, { price: number; changePct24h?: number }>,
  marketsById: Record<string, MarketCoin>,
  bucketFilter?: string | "all",
): { positions: AggregatedPosition[]; totals: PortfolioTotals } {
  // Sort transactions chronologically and drop invalid types
  const sorted = [...transactions]
    .filter(
      (tx) =>
        VALID_TX_TYPES.has(tx.type) &&
        (!bucketFilter || bucketFilter === "all" || tx.bucketId === bucketFilter),
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  interface PositionAccumulator {
    coinId: string;
    symbol: string;
    name: string;
    qty: number;
    avgBuyPrice: number;
    realizedPl: number;
  }

  const accByCoin = new Map<string, PositionAccumulator>();

  for (const tx of sorted) {
    let acc = accByCoin.get(tx.coinId);
    if (!acc) {
      acc = {
        coinId: tx.coinId,
        symbol: tx.symbol.toUpperCase(),
        name: tx.name,
        qty: 0,
        avgBuyPrice: 0,
        realizedPl: 0,
      };
      accByCoin.set(tx.coinId, acc);
    }

    if (tx.type === "BUY" || tx.type === "TRANSFER_IN") {
      const { newQty, newAvgPrice } = computeNewCostBasis(
        acc.qty,
        acc.avgBuyPrice,
        tx.amount,
        tx.pricePerUnitUsd,
      );
      acc.qty = newQty;
      acc.avgBuyPrice = newAvgPrice;
    } else if (tx.type === "SELL" || tx.type === "TRANSFER_OUT") {
      // Only recognize the quantity that is actually held.
      const soldQty = Math.min(tx.amount, acc.qty);
      if (tx.type === "SELL" && soldQty > 0) {
        acc.realizedPl += computeRealizedPlForSale(
          soldQty,
          tx.pricePerUnitUsd,
          acc.avgBuyPrice,
          tx.feeUsd ?? 0,
        );
      }
      acc.qty = Math.max(0, acc.qty - tx.amount);
      if (acc.qty === 0) {
        acc.avgBuyPrice = 0;
      }
    }
  }

  // Calculate current valuations
  let totalValue = 0;
  let totalCost = 0;
  let totalRealizedPl = 0;

  const rawPositions = Array.from(accByCoin.values()).map((acc) => {
    const market = marketsById[acc.coinId];
    const live = livePrices[acc.coinId];
    const currentPrice = live?.price ?? market?.current_price ?? acc.avgBuyPrice;
    const change24h = live?.changePct24h ?? market?.price_change_percentage_24h ?? 0;
    const currentValue = acc.qty * currentPrice;
    const totalCostBasis = acc.qty * acc.avgBuyPrice;
    const unrealizedPl = currentValue - totalCostBasis;
    const unrealizedPlPct = totalCostBasis > 0 ? (unrealizedPl / totalCostBasis) * 100 : 0;

    totalValue += currentValue;
    totalCost += totalCostBasis;
    totalRealizedPl += acc.realizedPl;

    return {
      coinId: acc.coinId,
      symbol: acc.symbol,
      name: acc.name,
      image: market?.image ?? "",
      totalQty: acc.qty,
      avgBuyPrice: acc.avgBuyPrice,
      totalCostBasis,
      currentPrice,
      currentValue,
      unrealizedPl,
      unrealizedPlPct,
      realizedPl: acc.realizedPl,
      allocationPct: 0, // computed below
      change24h,
    };
  });

  // Filter to active positions or closed positions with realized P&L
  const positions: AggregatedPosition[] = rawPositions
    .filter((p) => p.totalQty > 0 || Math.abs(p.realizedPl) > 0.001)
    .map((p) => ({
      ...p,
      allocationPct: totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.currentValue - a.currentValue);

  const unrealizedPl = totalValue - totalCost;
  const unrealizedPlPct = totalCost > 0 ? (unrealizedPl / totalCost) * 100 : 0;

  const totals: PortfolioTotals = {
    value: totalValue,
    cost: totalCost,
    unrealizedPl,
    unrealizedPlPct,
    realizedPl: totalRealizedPl,
    totalPl: unrealizedPl + totalRealizedPl,
  };

  return { positions, totals };
}

/**
 * Converts transaction list to a standard CSV format.
 */
export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const headers = [
    "ID",
    "Timestamp",
    "Date",
    "BucketID",
    "CoinID",
    "Symbol",
    "Name",
    "Type",
    "Amount",
    "PricePerUnitUSD",
    "FeeUSD",
    "Notes",
  ];

  const rows = transactions.map((tx) => [
    tx.id,
    tx.timestamp,
    new Date(tx.timestamp).toISOString(),
    tx.bucketId,
    tx.coinId,
    tx.symbol,
    `"${tx.name.replace(/"/g, '""')}"`,
    tx.type,
    tx.amount,
    tx.pricePerUnitUsd,
    tx.feeUsd ?? 0,
    `"${(tx.notes ?? "").replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Parses transactions from CSV format.
 * Returns successfully parsed transactions and a list of row-level errors.
 */
export function parseTransactionsFromCsv(
  csvText: string,
  defaultBucketId: string,
): { transactions: Transaction[]; errors: string[] } {
  const parsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: true,
  });
  const rows = parsed.data;
  if (rows.length <= 1) return { transactions: [], errors: [] };

  const out: Transaction[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((cell) => !cell.trim())) continue;

    const [
      idRaw,
      timestampRaw,
      dateRaw,
      bucketIdRaw,
      coinIdRaw,
      symbolRaw,
      nameRaw,
      typeRaw,
      amountRaw,
      priceRaw,
      feeRaw,
      notesRaw,
    ] = row;

    const rowNum = i + 1;
    const type = typeRaw?.trim().toUpperCase() as Transaction["type"];
    if (!VALID_TX_TYPES.has(type)) {
      errors.push(`Row ${rowNum}: invalid transaction type "${typeRaw}"`);
      continue;
    }

    const amount = Number(amountRaw);
    const pricePerUnitUsd = Number(priceRaw);
    const feeUsd = feeRaw ? Number(feeRaw) : 0;

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Row ${rowNum}: amount must be a positive number`);
      continue;
    }
    if (!Number.isFinite(pricePerUnitUsd) || pricePerUnitUsd < 0) {
      errors.push(`Row ${rowNum}: price must be a non-negative number`);
      continue;
    }
    if (feeRaw && (!Number.isFinite(feeUsd) || feeUsd < 0)) {
      errors.push(`Row ${rowNum}: fee must be a non-negative number`);
      continue;
    }

    const timestampNum = Number(timestampRaw);
    const timestamp = Number.isFinite(timestampNum)
      ? timestampNum
      : Date.parse(dateRaw);
    if (!Number.isFinite(timestamp)) {
      errors.push(`Row ${rowNum}: could not parse timestamp`);
      continue;
    }

    const symbol = symbolRaw?.trim() || "";
    const coinId = coinIdRaw?.trim().toLowerCase() || symbol.toLowerCase();
    if (!symbol || !coinId) {
      errors.push(`Row ${rowNum}: symbol/coinId required`);
      continue;
    }

    const name = nameRaw?.trim() || symbol.toUpperCase();
    const bucketId = bucketIdRaw?.trim() || defaultBucketId;

    out.push({
      id: idRaw?.trim() || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bucketId,
      coinId,
      symbol: symbol.toUpperCase(),
      name,
      type,
      amount,
      pricePerUnitUsd,
      feeUsd,
      timestamp,
      notes: notesRaw?.trim() || "",
    });
  }

  return { transactions: out, errors };
}
