// Technical indicator computations for the live trading chart.
// Pure functions — no React, no DOM.

import type { Kline } from "./liveEngine";

export type IndicatorPoint = { time: number; value: number };

// ─── RSI (Wilder, period 14) ───
// Uses Wilder's smoothed moving average (same as the original 1978 spec).
export function computeRSI(bars: Kline[], period = 14): IndicatorPoint[] {
  if (bars.length < period + 1) return [];

  const out: IndicatorPoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  // Seed with simple average
  for (let i = 1; i <= period; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss > 0 ? avgGain / avgLoss : 100;
  out.push({
    time: Math.floor(bars[period].openTime / 1000),
    value: 100 - 100 / (1 + rs0),
  });

  // Wilder smoothing
  for (let i = period + 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
    out.push({
      time: Math.floor(bars[i].openTime / 1000),
      value: 100 - 100 / (1 + rs),
    });
  }

  return out;
}

// ─── ADX series (Wilder, period 14) ───
// Returns the full ADX series for charting, not just the last value.
export function computeADXSeries(bars: Kline[], period = 14): IndicatorPoint[] {
  const n = bars.length;
  if (n < period * 2 + 1) return [];

  const tr: number[] = new Array(n).fill(0);
  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    tr[i] = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;
  for (let i = 1; i <= period; i++) {
    smoothTR += tr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }

  const dxValues: { time: number; dx: number }[] = [];

  for (let i = period + 1; i < n; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    const denom = smoothTR || 1;
    const plusDI = 100 * (smoothPlusDM / denom);
    const minusDI = 100 * (smoothMinusDM / denom);
    const sum = plusDI + minusDI;
    const dx = sum > 0 ? (100 * Math.abs(plusDI - minusDI)) / sum : 0;
    dxValues.push({ time: Math.floor(bars[i].openTime / 1000), dx });
  }

  if (dxValues.length < period) return [];

  const out: IndicatorPoint[] = [];
  let adx = 0;
  for (let i = 0; i < period; i++) adx += dxValues[i].dx;
  adx = adx / period;
  out.push({ time: dxValues[period - 1].time, value: adx });

  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i].dx) / period;
    out.push({ time: dxValues[i].time, value: adx });
  }

  return out;
}

// ─── EMA ───
export function computeEMA(bars: Kline[], period: number): IndicatorPoint[] {
  if (bars.length === 0 || period < 1) return [];
  const k = 2 / (period + 1);
  const out: IndicatorPoint[] = [];
  let ema = bars[0].close;
  for (let i = 0; i < bars.length; i++) {
    ema = i === 0 ? bars[i].close : bars[i].close * k + ema * (1 - k);
    if (i >= period - 1) {
      out.push({ time: Math.floor(bars[i].openTime / 1000), value: ema });
    }
  }
  return out;
}

// ─── Regime Classification ───
// Reuses the same confluence approach from perps-replay/lib/regime.ts
// but operates on the liveEngine Kline type directly.

export type Regime = "trend-up" | "trend-down" | "range" | "transition" | "chaos";

export const REGIME_META: Record<
  Regime,
  { label: string; color: string; icon: string }
> = {
  "trend-up": { label: "Trending Up", color: "#22c55e", icon: "arrow_upward" },
  "trend-down": { label: "Trending Down", color: "#ef4444", icon: "arrow_downward" },
  range: { label: "Ranging", color: "#06b6d4", icon: "swap_horiz" },
  transition: { label: "Transition", color: "#a855f7", icon: "sync" },
  chaos: { label: "Chaos", color: "#facc15", icon: "bolt" },
};

export type RegimeResult = {
  regime: Regime;
  adx: number;
  rsi: number;
  chop: number;
  ema20: number;
  ema50: number;
  reason: string;
};

// CHOP(14) — Dreiss 1993
function computeCHOP(bars: Kline[], period = 14): number {
  const n = bars.length;
  if (n < period + 1) return 0;
  const startIdx = n - period;
  let sumTR = 0, maxHigh = -Infinity, minLow = Infinity;
  for (let i = startIdx; i < n; i++) {
    const cur = bars[i], prev = bars[i - 1];
    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
    sumTR += tr;
    if (cur.high > maxHigh) maxHigh = cur.high;
    if (cur.low < minLow) minLow = cur.low;
  }
  const range = maxHigh - minLow;
  if (range <= 0 || sumTR <= 0) return 0;
  return (100 * Math.log10(sumTR / range)) / Math.log10(period);
}

// ATR(14)
function computeATR(bars: Kline[], period = 14): number {
  if (bars.length < period + 1) return 0;
  let sum = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const cur = bars[i], prev = bars[i - 1];
    sum += Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
  }
  return sum / period;
}

// ADX last value
function computeADXLast(bars: Kline[], period = 14): number {
  const series = computeADXSeries(bars, period);
  return series.length > 0 ? series[series.length - 1].value : 0;
}

export function classifyRegime(bars: Kline[]): RegimeResult {
  const n = bars.length;
  const rsiSeries = computeRSI(bars);
  const rsi = rsiSeries.length > 0 ? rsiSeries[rsiSeries.length - 1].value : 50;

  if (n < 51) {
    return { regime: "transition", adx: 0, rsi, chop: 0, ema20: 0, ema50: 0, reason: "Not enough bars" };
  }

  const chop = computeCHOP(bars, 14);
  const adx = computeADXLast(bars, 14);
  const atr = computeATR(bars, 14);
  const ema20s = computeEMA(bars, 20);
  const ema50s = computeEMA(bars, 50);
  const ema20 = ema20s.length > 0 ? ema20s[ema20s.length - 1].value : 0;
  const ema50 = ema50s.length > 0 ? ema50s[ema50s.length - 1].value : 0;

  const emaSpread = ema50 > 0 ? (ema20 - ema50) / ema50 : 0;
  const emaStrong = Math.abs(emaSpread) > 0.02;
  const emaWeak = Math.abs(emaSpread) > 0.01;
  const bull = emaSpread > 0;

  const last = bars[n - 1], prev = bars[n - 2];
  const move = Math.abs(last.close - prev.close);
  const base = { adx, rsi, chop, ema20, ema50 };

  // 1. Chaos
  if (atr > 0 && move > 3 * atr) {
    return { ...base, regime: "chaos", reason: `Bar moved ${(move / atr).toFixed(1)}x ATR` };
  }

  // 2. Primary trend
  if (adx >= 25 && emaStrong) {
    return {
      ...base,
      regime: bull ? "trend-up" : "trend-down",
      reason: `ADX ${adx.toFixed(0)} + EMAs ${(emaSpread * 100).toFixed(1)}%`,
    };
  }

  // 3. Primary range
  if (adx < 20 && !emaStrong) {
    return { ...base, regime: "range", reason: `ADX ${adx.toFixed(0)}, EMAs flat` };
  }

  // 4. CHOP tiebreaker
  if (chop > 61.8) {
    return { ...base, regime: "range", reason: `CHOP ${chop.toFixed(0)} > 61.8` };
  }
  if (chop < 38.2 && emaWeak) {
    return {
      ...base,
      regime: bull ? "trend-up" : "trend-down",
      reason: `CHOP ${chop.toFixed(0)} < 38.2`,
    };
  }

  // 5. Transition
  return { ...base, regime: "transition", reason: `ADX ${adx.toFixed(0)}, CHOP ${chop.toFixed(0)}` };
}
