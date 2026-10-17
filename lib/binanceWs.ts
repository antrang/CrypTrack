// Binance combined-stream WebSocket client with reconnect/backoff.
// Subscribes to <symbol>@miniTicker streams and reports parsed ticks.
import { BINANCE_STREAM_TO_COINGECKO, binanceSymbolFor } from "./coins";

export interface BinanceTick {
  coinId: string;
  price: number;
  changePct24h: number;
}

type TickHandler = (tick: BinanceTick) => void;
type StatusHandler = (connected: boolean) => void;

const WS_BASE = "wss://stream.binance.com:9443/stream";
const MAX_RECONNECT_ATTEMPTS = 10;

export class BinanceWsClient {
  private ws: WebSocket | null = null;
  private coinIds: string[] = [];
  private onTick: TickHandler;
  private onStatus: StatusHandler;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;
  private maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS;

  constructor(onTick: TickHandler, onStatus: StatusHandler) {
    this.onTick = onTick;
    this.onStatus = onStatus;
  }

  /** CoinGecko ids that have a Binance mapping (others must poll REST). */
  private supportedSymbols(): string[] {
    return this.coinIds
      .map((id) => binanceSymbolFor(id))
      .filter((s): s is string => s !== null)
      .map((s) => `${s.toLowerCase()}@miniTicker`);
  }

  setCoins(coinIds: string[]): void {
    const next = Array.from(new Set(coinIds));
    const changed =
      next.length !== this.coinIds.length ||
      next.some((id) => !this.coinIds.includes(id));
    this.coinIds = next;
    if (changed) this.connect(); // reconnect with the new stream set
  }

  connect(): void {
    if (typeof window === "undefined") return;
    this.closedByUser = false;
    const streams = this.supportedSymbols();
    if (streams.length === 0) {
      this.teardownSocket();
      this.onStatus(false);
      return;
    }
    this.teardownSocket();
    const url = `${WS_BASE}?streams=${streams.join("/")}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatus(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        const data = msg.data ?? msg;
        // miniTicker payload: { s: symbol, c: close, o: open, ... }
        const symbol: string | undefined = data?.s;
        if (!symbol) return;
        const coinId = BINANCE_STREAM_TO_COINGECKO[symbol.toLowerCase()];
        if (!coinId) return;
        const close = parseFloat(data.c);
        const open = parseFloat(data.o);
        const changePct24h = open > 0 ? ((close - open) / open) * 100 : 0;
        this.onTick({ coinId, price: close, changePct24h });
      } catch {
        // Ignore malformed frames.
      }
    };

    ws.onclose = () => {
      this.onStatus(false);
      if (!this.closedByUser) this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose fires next and handles reconnect.
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatus(false);
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private teardownSocket(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch {
        // already closing
      }
      this.ws = null;
    }
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.teardownSocket();
    this.onStatus(false);
  }
}
