"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { Kline } from "../lib/liveEngine";

// Binance kline WebSocket message shape
type BinanceKlineMsg = {
  e: "kline";
  k: {
    t: number; // kline open time
    T: number; // kline close time
    s: string; // symbol
    i: string; // interval
    o: string; // open
    h: string; // high
    l: string; // low
    c: string; // close
    v: string; // volume
    x: boolean; // is this kline closed?
  };
};

function parseKline(k: BinanceKlineMsg["k"]): { kline: Kline; isClosed: boolean } {
  return {
    kline: {
      openTime: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      closeTime: k.T,
    },
    isClosed: k.x,
  };
}

// Fetch initial history bars from Binance REST API with retry on rate limit
async function fetchHistoryBars(symbol: string, interval: string, limit = 200): Promise<Kline[]> {
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // 2s, 3s, 4s backoff
    }
    const res = await fetch(url);
    if (res.status === 429) {
      console.warn(`Binance rate limited (attempt ${attempt + 1}/4), backing off...`);
      continue;
    }
    if (!res.ok) throw new Error(`Binance REST error: ${res.status}`);
    const data = await res.json();
    return (data as unknown[][]).map((row) => ({
      openTime: row[0] as number,
      open: parseFloat(row[1] as string),
      high: parseFloat(row[2] as string),
      low: parseFloat(row[3] as string),
      close: parseFloat(row[4] as string),
      volume: parseFloat(row[5] as string),
      closeTime: row[6] as number,
    }));
  }
  throw new Error("Binance rate limited after 4 retries");
}

type StreamCallbacks = {
  onBar: (kline: Kline, isClosed: boolean) => void;
  onHistoryLoaded: (bars: Kline[]) => void;
  onConnectionChange: (connected: boolean) => void;
};

export function useBinanceStream(
  symbol: string,
  interval: string,
  active: boolean,
  callbacks: StreamCallbacks
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      cleanup();
      setConnected(false);
      callbacksRef.current.onConnectionChange(false);
      return;
    }

    let cancelled = false;

    async function connect() {
      // 1. Fetch history first
      try {
        const bars = await fetchHistoryBars(symbol, interval);
        if (cancelled) return;
        callbacksRef.current.onHistoryLoaded(bars);
      } catch (err) {
        console.error("Failed to fetch history bars:", err);
      }

      if (cancelled) return;

      // 2. Connect WebSocket
      const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
      const ws = new WebSocket(`wss://fstream.binance.com/ws/${streamName}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        callbacksRef.current.onConnectionChange(true);
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data) as BinanceKlineMsg;
          if (msg.e === "kline") {
            const { kline, isClosed } = parseKline(msg.k);
            callbacksRef.current.onBar(kline, isClosed);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        callbacksRef.current.onConnectionChange(false);
        // Auto-reconnect after 3 seconds
        reconnectTimer.current = setTimeout(() => {
          if (!cancelled) connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [symbol, interval, active, cleanup]);

  return { connected };
}
