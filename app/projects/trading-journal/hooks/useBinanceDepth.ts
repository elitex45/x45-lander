"use client";

import { useEffect, useRef, useState } from "react";

export type DepthLevel = [number, number]; // [price, quantity]

export type DepthData = {
  bids: DepthLevel[];
  asks: DepthLevel[];
};

// Poll Binance Futures REST depth endpoint every 500ms.
// More reliable than the WebSocket partial depth stream which uses
// different field names (b/a vs bids/asks) and requires diff management.
export function useBinanceDepth(symbol: string, active: boolean) {
  const [depth, setDepth] = useState<DepthData | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setDepth(null);
      return;
    }

    let cancelled = false;

    async function fetchDepth() {
      try {
        const res = await fetch(
          `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=1000`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setDepth({
          bids: (data.bids as [string, string][]).map(
            ([p, q]) => [parseFloat(p), parseFloat(q)] as DepthLevel
          ),
          asks: (data.asks as [string, string][]).map(
            ([p, q]) => [parseFloat(p), parseFloat(q)] as DepthLevel
          ),
        });
      } catch {
        // network error — skip this tick
      }
    }

    fetchDepth();
    timerRef.current = setInterval(fetchDepth, 2000);

    return () => {
      cancelled = true;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [symbol, active]);

  return depth;
}
