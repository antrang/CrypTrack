// Maps CoinGecko ids to Binance spot symbols (USDT pairs) for live WS ticks.
// Coins absent here fall back to CoinGecko REST polling.

export const COINGECKO_TO_BINANCE: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  binancecoin: "BNBUSDT",
  solana: "SOLUSDT",
  ripple: "XRPUSDT",
  cardano: "ADAUSDT",
  dogecoin: "DOGEUSDT",
  "avalanche-2": "AVAXUSDT",
  tron: "TRXUSDT",
  chainlink: "LINKUSDT",
  polkadot: "DOTUSDT",
  "matic-network": "MATICUSDT",
  litecoin: "LTCUSDT",
  "shiba-inu": "SHIBUSDT",
  uniswap: "UNIUSDT",
  "internet-computer": "ICPUSDT",
  aptos: "APTUSDT",
  near: "NEARUSDT",
  "ethereum-classic": "ETCUSDT",
  stellar: "XLMUSDT",
  cosmos: "ATOMUSDT",
  filecoin: "FILUSDT",
  "hedera-hashgraph": "HBARUSDT",
  "crypto-com-chain": "CROUSDT",
  arbitrum: "ARBUSDT",
  vechain: "VETUSDT",
  optimism: "OPUSDT",
  "the-graph": "GRTUSDT",
  injective: "INJUSDT",
  "render-token": "RENDERUSDT",
  sui: "SUIUSDT",
  sei: "SEIUSDT",
  aave: "AAVEUSDT",
  algorand: "ALGOUSDT",
};

// Reverse lookup: lower-case binance symbol stream name -> coingecko id.
export const BINANCE_STREAM_TO_COINGECKO: Record<string, string> = Object.entries(
  COINGECKO_TO_BINANCE,
).reduce<Record<string, string>>((acc, [cgId, binance]) => {
  acc[binance.toLowerCase()] = cgId;
  return acc;
}, {});

export function binanceSymbolFor(coinId: string): string | null {
  return COINGECKO_TO_BINANCE[coinId] ?? null;
}
