# CrypTrack Revamp Design Specification
**Date**: 2026-10-18  
**Topic**: Full-Fledged Crypto Portfolio Management, Multi-Factor Recommendation Engine & Open-Source Market Intelligence  
**Status**: Approved & Ready for Implementation Planning  

---

## 1. Executive Summary & Goal
CrypTrack is being transformed from a lightweight watchlist tracker into an institutional-grade, personal crypto portfolio management and market intelligence application. It is powered entirely by free, open-source crypto APIs (Binance Public Spot & Futures, DeFiLlama, CoinGecko Public/Demo Proxy, Alternative.me, and Frankfurter FX) with zero mandatory subscriptions. 

The application is tailored for a **Hybrid Core + Tactical Alpha** strategy:
1. **Core Wealth Portfolio**: Long-term asset accumulation, Dollar Cost Averaging (DCA), on-chain fundamental health, and macro market cycle navigation.
2. **Tactical Alpha**: Active swing trading, multi-timeframe indicator confluence, momentum breakouts, and leverage/funding rate squeeze detection.
3. **Hypothesis-Driven Recommendations**: Transparent 4-pillar quantitative confidence scoring (0–100%) providing clear hypotheses (e.g. *DeFi Cashflow Accumulation*, *Momentum Breakout*, *Oversold High-Beta Reversal*), optimal entry zones, target levels, and hard invalidation stop levels.

---

## 2. High-Level System Architecture

CrypTrack utilizes a **Client-First Reactive Architecture** supported by a resilient **Next.js Server Proxy Layer**.

```
+---------------------------------------------------------------------------------+
|                                 BROWSER CLIENT                                  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                             App Header & Nav                              |  |
|  |  CrypTrack Logo | [Portfolio Hub] [Market Intel] [Research] [Signals]     |  |
|  |  Live FX ($/₹)  | Binance WS Status (Sub-second) | Backup / Restore Modal |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  +------------------+  +-------------------+  +------------------------------+  |
|  | Zustand Stores:  |  | Calculation       |  | Presentation Views:          |  |
|  | - usePortfolio   |  | Engines:          |  | - Portfolio Hub              |  |
|  | - useLedger      |  | - 4-Pillar Score  |  | - Market Intelligence        |  |
|  | - usePriceStore  |  | - Indicators (TA) |  | - Research & Recommendations |  |
|  | - useCurrency    |  | - S/R Pivot Levels|  | - Signals & Watchlist        |  |
|  | - useUiStore     |  | - DCA & P&L Math  |  | - Coin Deep-Dive Drawer     |  |
|  +--------^---------+  +---------^---------+  +--------------^---------------+  |
|           |                      |                           |                  |
|  +--------v----------------------v---------------------------v---------------+  |
|  | Persistence Layer: IndexedDB / LocalStorage (JSON Export/Import, CSV Sync)|  |
|  +---------------------------------------------------------------------------+  |
+--------------------------------------^------------------------------------------+
                                       | HTTP & WebSocket
+--------------------------------------v------------------------------------------+
|                       NEXT.JS SERVER PROXY LAYER (CACHE)                        |
|                                                                                 |
|  /api/markets       -> CoinGecko Proxy (60s TTL Cache + Stale Fallback)         |
|  /api/binance/*     -> Klines, Funding Rates & Open Interest (30-120s TTL)      |
|  /api/defillama/*   -> Protocols TVL, Fees, Stablecoin Net Flows (300s TTL)     |
|  /api/fear-greed    -> Alternative.me Sentiment History (600s TTL)              |
|  /api/fx            -> Frankfurter Live USD/INR Rates (60s TTL)                 |
|  /api/insights &    -> OpenCode Zen / MiniMax LLM Synthesis (Optional)         |
|  /api/analyze                                                                   |
+--------------------------------------^------------------------------------------+
                                       | External Calls
+--------------------------------------v------------------------------------------+
|                          FREE PUBLIC OPEN-SOURCE APIS                           |
|  Binance Public REST/WS | DeFiLlama | CoinGecko Public | Alternative.me | FX     |
+---------------------------------------------------------------------------------+
```

---

## 3. Subsystem Detailed Design

### Subsystem A: Data Pipelines & Free Open-Source API Aggregation

1. **Binance Public API (Spot + Futures - 100% Free, Zero Auth)**:
   - **Spot WebSocket (`wss://stream.binance.com:9443/ws`)**: Streams real-time miniTicker data for active coins in user watchlist, holdings, and recommendations.
   - **Spot REST (`/api/v3/klines`)**: Multi-timeframe OHLCV candles (15m, 1h, 4h, 1d, 1w) cached in Next.js memory.
   - **Futures REST (`https://fapi.binance.com/fapi/v1`)**:
     - `/premiumIndex`: Current & estimated funding rates for top assets.
     - `/openInterest`: Real-time contract open interest.
     - `/topLongShortPositionRatio`: Institutional/top trader sentiment.
2. **DeFiLlama API (Free, Open, No Rate Limits)**:
   - `/protocols`: TVL, 1d/7d/30d change, category classification.
   - `/overview/fees`: 24h & 30d protocol fees and revenue (Price-to-Fees valuation).
   - `/stablecoins`: Total stablecoin circulation market cap and 7d delta to gauge macro liquidity inflows/outflows.
3. **CoinGecko Public / Demo Proxy Layer**:
   - `/coins/markets`: Aggregated market cap, 24h volume, circulating supply, all-time high drawdown.
   - `/global`: Total crypto market cap, 24h volume, BTC dominance %, ETH dominance %.
   - Route handlers implement in-memory Map caching with graceful fallback to serve cached stale data on any 429 status code.
4. **Alternative.me Fear & Greed Index API**:
   - `/fng/?limit=30`: 30-day historical sentiment array for sparklines and cycle positioning.
5. **Frankfurter FX API**:
   - `/latest?from=USD&to=INR`: Live currency conversion rate polled every 60s.

---

### Subsystem B: Portfolio Hub & Multi-Bucket Transaction Ledger

1. **Data Model**:
   ```typescript
   export type PortfolioBucketType = "core" | "tactical" | "defi" | "custom";

   export interface PortfolioBucket {
     id: string;
     name: string;
     type: PortfolioBucketType;
     description?: string;
     color?: string;
     createdAt: number;
   }

   export type TransactionType = "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT";

   export interface Transaction {
     id: string;
     bucketId: string;
     coinId: string;
     symbol: string;
     name: string;
     type: TransactionType;
     amount: number;             // Coin quantity
     pricePerUnitUsd: number;    // Unit execution price in USD
     feeUsd?: number;            // Trading or gas fee
     timestamp: number;          // Unix timestamp (ms)
     notes?: string;
   }

   export interface AggregatedPosition {
     coinId: string;
     symbol: string;
     name: string;
     image: string;
     totalQty: number;
     avgBuyPrice: number;        // Weighted average cost basis in USD
     totalCostBasis: number;
     currentPrice: number;
     currentValue: number;
     unrealizedPl: number;
     unrealizedPlPct: number;
     realizedPl: number;
     allocationPct: number;
   }
   ```

2. **Accounting Logic**:
   - **Weighted Average Cost Basis (DCA)**:
     $$\text{AvgPrice}_{\text{new}} = \frac{(\text{Qty}_{\text{prev}} \times \text{AvgPrice}_{\text{prev}}) + (\text{Qty}_{\text{new}} \times \text{Price}_{\text{new}})}{\text{Qty}_{\text{prev}} + \text{Qty}_{\text{new}}}$$
   - **Realized P&L on SELL**:
     $$\text{Realized P/L} = (\text{Sell Price} - \text{Weighted Avg Buy Price}) \times \text{Sold Qty} - \text{Fee}$$
   - **Unrealized P&L**:
     $$\text{Unrealized P/L} = (\text{Live Price} - \text{Weighted Avg Buy Price}) \times \text{Remaining Qty}$$
3. **Backup, Restore & Export**:
   - `exportPortfolioToJson()`: Generates encrypted or raw JSON containing buckets, transactions, custom alerts, and watchlists.
   - `importPortfolioFromJson()`: Validates schema and restores state with undo capability.
   - `exportLedgerToCsv()`: Exports standard transaction history format compatible with Excel and tax preparation tools.

---

### Subsystem C: Multi-Factor Recommendation Engine & Hypothesis Framework

The engine screens the universe of major cryptocurrencies across four distinct quantitative pillars, yielding an overall Confidence Score ($0 \le S \le 100$):

$$S = 0.30 \times S_{\text{Technical}} + 0.25 \times S_{\text{Fundamental}} + 0.25 \times S_{\text{Macro}} + 0.20 \times S_{\text{RiskReward}}$$

1. **Pillar 1: Technical Momentum & Confluence (30%)**:
   - Multi-timeframe trend alignment: EMA 20 > EMA 50 > EMA 200 on 4H and 1D.
   - RSI Momentum: RSI between 52 and 68 (bullish expansion) receives maximum score; oversold RSI < 32 with bullish divergence receives reversal bonus; overbought RSI > 80 receives penalty.
   - MACD: Expanding positive histogram on 4H/1D.
   - Volume: 24h Volume / 7d Average Volume > 1.3 confirms institutional participation.
2. **Pillar 2: On-Chain & Fundamental Growth (25%)**:
   - DeFiLlama 7d & 30d TVL growth percentage.
   - Protocol Fee Generation: Favorable Price-to-Annualized-Fees ratio relative to sector peers.
   - Ecosystem Activity: Active chain transactions and developer momentum.
3. **Pillar 3: Macro Liquidity & Derivatives Sentiment (25%)**:
   - Binance Perpetual Funding Rate:
     - Negative to flat funding with stable price: **Bullish short-squeeze potential (+1.0 lean)**.
     - Neutral funding (0.005% - 0.01%): **Healthy organic growth (+0.5 lean)**.
     - Extreme positive funding (> 0.04%): **Long leverage froth / long-squeeze hazard (-0.8 lean)**.
   - Open Interest (OI) Trend: Rising price accompanied by rising OI confirms strong buyer commitment.
   - Stablecoin Macro Flow: Positive 7d aggregate stablecoin growth provides macro tailwind.
   - Sentiment: Extreme Fear (F&G < 25) boosts accumulation score; Extreme Greed (F&G > 78) introduces risk caution.
4. **Pillar 4: Risk-Reward & Market Structure (20%)**:
   - Distance to nearest detected Support vs Distance to nearest Resistance:
     $$\text{R:R Ratio} = \frac{\text{Target Resistance} - \text{Current Price}}{\text{Current Price} - \text{Support Level}}$$
   - Minimum threshold: Only setups with R:R $\ge 2.0$ achieve `Strong Buy` status.
   - Drawdown from ATH: Deep consolidation with bottoming structure vs blow-off tops.

#### Strategy Hypothesis Archetypes:
* **`DeFi Cashflow Accumulation`**: High TVL momentum + strong protocol revenue + holding above 1D EMA 50.
* **`Momentum Breakout`**: Multi-TF EMA alignment + volume > 1.5× average + breaking key resistance.
* **`Oversold Value Reversal`**: 1D RSI < 35 at major multi-touch support + negative/neutral funding.
* **`Ecosystem Narrative Leader`**: Category outperforming broader market with growing open interest.

#### Recommendation Output Card:
* **Score & Conviction**: e.g., `88/100 · Strong Buy`.
* **Primary Hypothesis Tag**: e.g., `DeFi Cashflow Accumulation`.
* **Actionable Price Zones**:
  - **Optimal Entry Zone**: [Support, Support + 1.5%]
  - **Target 1 (Conservative)**: Next major resistance pivot.
  - **Target 2 (Extended)**: Secondary resistance / Fibonacci extension.
  - **Invalidation Stop**: Close below immediate local swing low.

---

### Subsystem D: Market Intelligence & Signals Hub

1. **Macro Intelligence View**:
   - **Global Crypto Capitalization Widget**: Total Cap, 24h Volume, BTC Dominance % (with 7d mini sparkline), ETH Dominance %.
   - **Stablecoin Liquidity Tracker**: Total circulating supply across USDT, USDC, DAI and 7d net delta (expansion/contraction).
   - **Derivatives Sentiment Barometer**: Average funding rates across top pairs, aggregated open interest changes, and liquidation heat warnings.
   - **Sentiment Timeline**: Fear & Greed Index with interactive 30-day historical chart.
   - **Sector Rotation Matrix**: DeFi, Layer-1, Layer-2, AI, RWA, Memes ranked by 24h & 7d market cap flow.
2. **Signals & Watchlists View**:
   - **Sub-Second Streaming Ticker Table**: Powered by Binance WebSocket miniTicker stream.
   - **Multi-Timeframe Confluence Matrix**: 1H, 4H, 1D, 1W indicator matrix (RSI, Trend, MACD) across watchlist assets.
   - **Breakout & Volume Surge Radar**: Automatically surfaces assets hitting 7d highs on >150% volume.
   - **Alerts Manager**: Price target alerts, RSI oversold/overbought triggers with in-app toasts and browser notifications.

---

### Subsystem E: UI/UX, Navigation & Coin Deep-Dive Drawer

1. **Top Application Bar**:
   - Brand header with live WebSocket connection indicator.
   - Multi-View Switcher:
     1. `Portfolio Hub`
     2. `Market Intelligence`
     3. `Research & Recommendations`
     4. `Signals & Watchlist`
   - Currency Toggle (`$ USD` / `₹ INR`).
   - Backup & Restore modal button (JSON / CSV).
2. **Coin Deep-Dive Drawer**:
   - Triggerable from any coin link or row across all views.
   - Interactive candlestick chart (Lightweight-Charts) with timeframes: `15m`, `1h`, `4h`, `1d`, `1w`.
   - Dynamic Support & Resistance levels drawn directly on the chart with touch counts.
   - Technical Indicators Ribbon: RSI, MACD, EMA 20/50/200, Bollinger Bands.
   - 4-Pillar Score Card & Hypothesis Thesis.
   - Direct Action Buttons: "Add to Portfolio", "Add Alert", "Pin to Watchlist".
   - Curated news and trade catalysts.

---

## 4. Error Handling & Rate Limit Resilience
1. **Public API Rate Limit Strategy**:
   - Every route handler (`/api/markets`, `/api/binance/*`, `/api/defillama/*`, `/api/fear-greed`) employs a server-side in-memory cache with configurable TTLs.
   - If an upstream endpoint returns `429 Too Many Requests` or `5xx`, the proxy automatically serves the latest cached stale data rather than throwing an error to the user.
2. **WebSocket Reconnection & Fallback**:
   - The Binance WebSocket client has exponential backoff reconnection logic (1s, 2s, 5s, max 10s).
   - If the WebSocket is disconnected or the asset lacks a Binance USDT pair, the UI automatically falls back to CoinGecko REST polling.
3. **Data Integrity & Storage Validation**:
   - All imported JSON backups are validated against a strict TypeScript schema before replacing local state. Corrupted or invalid payloads are rejected with clear error messages.

---

## 5. Verification & Testing Strategy
1. **Unit Tests**:
   - Calculation engines: RSI, MACD, EMA, S/R pivot detection, and the 4-pillar composite scoring formula.
   - Portfolio accounting: Weighted average DCA computation, realized P&L on partial sells, and allocation percentages.
2. **Integration Verification**:
   - API Proxy routes verified for correct JSON response formatting, caching headers, and fallback behavior.
   - WebSocket streaming verified for live sub-second price updates.
3. **Manual End-to-End User Verification**:
   - Create multiple portfolio buckets, log Buy and Sell transactions, verify cost basis and realized/unrealized P&L calculations.
   - Review Market Intelligence tab (Global cap, BTC dominance, stablecoin flows, funding rates).
   - Review Research & Recommendations tab (Hypothesis cards, 4-pillar scores, entry/target/invalidation levels).
   - Open Coin Deep-Dive Drawer, interact with candlestick charts and timeframe switchers.
   - Test JSON export and import restore.
