// Pure indicator math. Operates on the visible bars (sliced to cursor) so the
// values "grow" naturally as the user advances the replay — no future leakage.

import type { Kline } from "./kline";

export type IndicatorPoint = { time: number; value: number };

// Volume-weighted average price, anchored at the start of the loaded range.
// VWAP_t = sum(typical_i * volume_i) / sum(volume_i), i in [0..t]
// where typical = (high + low + close) / 3
export function computeVWAP(bars: Kline[]): IndicatorPoint[] {
  const out: IndicatorPoint[] = new Array(bars.length);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const typical = (b.high + b.low + b.close) / 3;
    cumPV += typical * b.volume;
    cumV += b.volume;
    out[i] = {
      time: Math.floor(b.openTime / 1000),
      value: cumV > 0 ? cumPV / cumV : b.close,
    };
  }
  return out;
}

// Exponential moving average. Seeded with the first close so values are
// available from bar[period-1] onward (we skip the warm-up bars).
export function computeEMA(bars: Kline[], period: number): IndicatorPoint[] {
  if (bars.length === 0 || period < 1) return [];
  const k = 2 / (period + 1);
  const out: IndicatorPoint[] = [];
  let ema = bars[0].close;
  for (let i = 0; i < bars.length; i++) {
    const close = bars[i].close;
    ema = i === 0 ? close : close * k + ema * (1 - k);
    if (i >= period - 1) {
      out.push({ time: Math.floor(bars[i].openTime / 1000), value: ema });
    }
  }
  return out;
}

// Available indicators in the UI. Order matters — it's the toolbar order.
export type IndicatorId = "vwap" | "ema20" | "ema50";

export const INDICATOR_META: Record<
  IndicatorId,
  { label: string; color: string; period?: number }
> = {
  vwap: { label: "VWAP", color: "#facc15" }, // amber
  ema20: { label: "EMA 20", color: "#06b6d4", period: 20 }, // cyan
  ema50: { label: "EMA 50", color: "#a855f7", period: 50 }, // purple
};

export const ALL_INDICATORS: IndicatorId[] = ["vwap", "ema20", "ema50"];

export type IndicatorVisibility = Record<IndicatorId, boolean>;

export const DEFAULT_INDICATOR_VISIBILITY: IndicatorVisibility = {
  vwap: true,
  ema20: false,
  ema50: false,
};
