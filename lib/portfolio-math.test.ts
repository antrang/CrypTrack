import { describe, expect, it } from "vitest";
import {
  aggregatePositions,
  computeNewCostBasis,
  computeRealizedPlForSale,
  exportTransactionsToCsv,
  parseTransactionsFromCsv,
} from "./portfolio-math";
import type { MarketCoin, Transaction } from "./types";

const btcMarket: MarketCoin = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "",
  current_price: 50_000,
  market_cap: 1e12,
  market_cap_rank: 1,
  total_volume: 1e10,
  price_change_percentage_24h: 2,
};

const tx = (
  overrides: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "pricePerUnitUsd">,
): Transaction => ({
  id: "tx-1",
  bucketId: "core",
  coinId: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  timestamp: Date.now(),
  feeUsd: 0,
  ...overrides,
  type: overrides.type,
  amount: overrides.amount,
  pricePerUnitUsd: overrides.pricePerUnitUsd,
});

describe("computeNewCostBasis", () => {
  it("returns buy values when previous qty is zero", () => {
    expect(computeNewCostBasis(0, 0, 2, 10_000)).toEqual({ newQty: 2, newAvgPrice: 10_000 });
  });

  it("averages buy into existing position", () => {
    // 1 BTC at $40k, buy 1 BTC at $60k -> 2 BTC at $50k
    expect(computeNewCostBasis(1, 40_000, 1, 60_000)).toEqual({
      newQty: 2,
      newAvgPrice: 50_000,
    });
  });

  it("ignores non-positive buy qty", () => {
    expect(computeNewCostBasis(1, 40_000, 0, 60_000)).toEqual({
      newQty: 1,
      newAvgPrice: 40_000,
    });
  });
});

describe("computeRealizedPlForSale", () => {
  it("computes realized P&L", () => {
    expect(computeRealizedPlForSale(1, 60_000, 50_000, 10)).toBe(9_990);
  });

  it("returns zero for non-positive qty", () => {
    expect(computeRealizedPlForSale(0, 60_000, 50_000)).toBe(0);
  });
});

describe("aggregatePositions", () => {
  it("aggregates buys into cost basis and current value", () => {
    const transactions: Transaction[] = [
      tx({ type: "BUY", amount: 1, pricePerUnitUsd: 40_000 }),
      tx({ type: "BUY", amount: 1, pricePerUnitUsd: 60_000 }),
    ];
    const { positions, totals } = aggregatePositions(
      transactions,
      { bitcoin: { price: 50_000 } },
      { bitcoin: btcMarket },
    );
    expect(positions).toHaveLength(1);
    expect(positions[0].totalQty).toBe(2);
    expect(positions[0].avgBuyPrice).toBe(50_000);
    expect(positions[0].currentValue).toBe(100_000);
    expect(totals.value).toBe(100_000);
  });

  it("records realized P&L on sell", () => {
    const transactions: Transaction[] = [
      tx({ type: "BUY", amount: 2, pricePerUnitUsd: 50_000 }),
      tx({ type: "SELL", amount: 1, pricePerUnitUsd: 60_000 }),
    ];
    const { positions } = aggregatePositions(
      transactions,
      { bitcoin: { price: 55_000 } },
      { bitcoin: btcMarket },
    );
    expect(positions[0].totalQty).toBe(1);
    expect(positions[0].realizedPl).toBe(10_000);
    expect(positions[0].unrealizedPl).toBe(5_000);
  });

  it("does not let qty go negative when selling more than held", () => {
    const transactions: Transaction[] = [
      tx({ type: "BUY", amount: 1, pricePerUnitUsd: 50_000 }),
      tx({ type: "SELL", amount: 2, pricePerUnitUsd: 60_000 }),
    ];
    const { positions, totals } = aggregatePositions(transactions, {}, { bitcoin: btcMarket });
    expect(positions[0].totalQty).toBe(0);
    expect(totals.realizedPl).toBe(10_000);
    // Realized P&L only on the 1 BTC actually held
    expect(positions[0].realizedPl).toBe(10_000);
  });

  it("ignores unknown transaction types", () => {
    const transactions = [
      tx({ type: "BUY", amount: 1, pricePerUnitUsd: 50_000 }),
      { ...tx({ type: "BUY", amount: 1, pricePerUnitUsd: 60_000 }), type: "UNKNOWN" as never },
    ];
    const { positions } = aggregatePositions(transactions, {}, { bitcoin: btcMarket });
    expect(positions[0].totalQty).toBe(1);
  });

  it("filters by bucket", () => {
    const transactions: Transaction[] = [
      tx({ type: "BUY", amount: 1, pricePerUnitUsd: 50_000, bucketId: "core" }),
      tx({ type: "BUY", amount: 1, pricePerUnitUsd: 60_000, bucketId: "tactical" }),
    ];
    const { positions } = aggregatePositions(
      transactions,
      {},
      { bitcoin: btcMarket },
      "core",
    );
    expect(positions[0].totalQty).toBe(1);
    expect(positions[0].avgBuyPrice).toBe(50_000);
  });
});

describe("CSV round-trip", () => {
  it("exports and parses transactions", () => {
    const transactions: Transaction[] = [
      tx({ type: "BUY", amount: 1, pricePerUnitUsd: 50_000, notes: "Hello, \"world\"" }),
    ];
    const csv = exportTransactionsToCsv(transactions);
    const { transactions: parsed, errors } = parseTransactionsFromCsv(csv, "core");
    expect(errors).toHaveLength(0);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].amount).toBe(1);
    expect(parsed[0].pricePerUnitUsd).toBe(50_000);
  });

  it("reports errors for invalid rows", () => {
    const csv = `ID,Timestamp,Date,BucketID,CoinID,Symbol,Name,Type,Amount,PricePerUnitUSD,FeeUSD,Notes
,1700000000000,,core,bitcoin,BTC,Bitcoin,INVALID,1,50000,0,
,1700000000000,,core,bitcoin,BTC,Bitcoin,BUY,-1,50000,0,`;
    const { transactions, errors } = parseTransactionsFromCsv(csv, "core");
    expect(transactions).toHaveLength(0);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
