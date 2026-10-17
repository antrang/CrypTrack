import { z } from "zod";

// --- Storage schemas ---------------------------------------------------------

export const TransactionTypeSchema = z.enum([
  "BUY",
  "SELL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
]);

export const TransactionSchema = z.object({
  id: z.string(),
  bucketId: z.string(),
  coinId: z.string(),
  symbol: z.string(),
  name: z.string(),
  type: TransactionTypeSchema,
  amount: z.number().nonnegative(),
  pricePerUnitUsd: z.number().nonnegative(),
  feeUsd: z.number().optional(),
  timestamp: z.number(),
  notes: z.string().optional(),
});

export const PortfolioBucketTypeSchema = z.enum(["core", "tactical", "custom"]);

export const PortfolioBucketSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: PortfolioBucketTypeSchema,
  description: z.string(),
  color: z.string(),
  createdAt: z.number(),
});

export const LegacyHoldingSchema = z.object({
  coinId: z.string(),
  symbol: z.string(),
  name: z.string(),
  qty: z.number().nonnegative(),
  buyPrice: z.number().nonnegative(),
});

export type LegacyHolding = z.infer<typeof LegacyHoldingSchema>;

// --- AI context schemas ------------------------------------------------------

const PortfolioInsightHoldingSchema = z.object({
  symbol: z.string(),
  allocationPct: z.number(),
  plPct: z.number(),
  signalScore: z.number().optional(),
  signalLabel: z.string().optional(),
});

export const InsightContextSchema = z.object({
  portfolio: z
    .object({
      totalValue: z.number(),
      totalCost: z.number(),
      plPct: z.number(),
      holdings: z.array(PortfolioInsightHoldingSchema).max(100),
    })
    .optional(),
  fearGreed: z
    .object({
      value: z.number(),
      classification: z.string(),
    })
    .optional(),
  topMovers: z
    .array(
      z.object({
        symbol: z.string(),
        changePct24h: z.number(),
      }),
    )
    .max(50)
    .optional(),
  trending: z.array(z.string()).max(50).optional(),
  categoriesGaining: z
    .array(
      z.object({
        name: z.string(),
        change24h: z.number(),
      }),
    )
    .max(20)
    .optional(),
  headlines: z
    .array(
      z.object({
        title: z.string(),
        source: z.string(),
      }),
    )
    .max(20)
    .optional(),
});

export type InsightContextInput = z.infer<typeof InsightContextSchema>;

const MatrixEntrySchema = z.object({
  rsi: z.number().nullable(),
  histogram: z.number().nullable(),
  sma20: z.number().nullable(),
  sma50: z.number().nullable(),
});

const LevelSchema = z.object({
  price: z.number(),
  touches: z.number(),
  kind: z.enum(["support", "resistance"]),
});

const HeadlineSchema = z.object({
  title: z.string(),
  source: z.string(),
});

export const AnalyzeContextSchema = z.object({
  symbol: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
  price: z.number().nullable(),
  periodChanges: z.record(z.string(), z.object({ pct: z.number() })).optional(),
  score: z
    .object({
      score: z.number(),
      label: z.string(),
      bullishTimeframes: z.number(),
      totalTimeframes: z.number(),
    })
    .optional(),
  matrix: z.record(z.string(), MatrixEntrySchema).optional(),
  levels: z.array(LevelSchema).max(20).optional(),
  headlines: z.array(HeadlineSchema).max(20).optional(),
});

export type AnalyzeContextInput = z.infer<typeof AnalyzeContextSchema>;

// --- API param schemas -------------------------------------------------------

export const CoinIdParamSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9\-._]+$/);

export const CoinIdsQuerySchema = z.string().min(1).max(8192).transform((s) => {
  const ids = s
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 250);
  if (ids.some((id) => !CoinIdParamSchema.safeParse(id).success)) {
    throw new Error("Invalid coin id in list");
  }
  return ids;
});
