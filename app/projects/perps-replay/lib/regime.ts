// Pure regime classification math.
//
// Built around the textbook "confluence of indicators" approach used
// by production crypto systems. Three signals vote:
//
//   1. ADX(14) — Wilder's original. Trend STRENGTH (not direction).
//        ADX < 20  →  weak / no trend
//        ADX > 25  →  strong trend
//        20-25     →  developing
//
//   2. 20 EMA vs 50 EMA spread — trend DIRECTION + magnitude.
//        |spread| > 2%  →  EMAs meaningfully aligned, real direction
//        |spread| ≤ 2%  →  EMAs flat, no clear direction
//
//   3. Choppiness Index (CHOP, Dreiss 1993) — RECENT chop detector.
//        CHOP > 61.8  →  recent action is choppy
//        CHOP < 38.2  →  recent action is directional
//        38.2-61.8    →  grey zone
//
// ADX + EMA together are the PRIMARY trend signal (the canonical
// Wilder approach). CHOP is a secondary "is the right edge ranging"
// check used when the primary signal is ambiguous.
//
// Decision tree (in priority order):
//   1. Last bar > 3× ATR                          →  chaos
//   2. ADX ≥ 25 AND |EMA spread| > 2%             →  trend (EMA dir)
//   3. ADX < 20 AND |EMA spread| < 2%             →  range
//   4. Tiebreaker zone (one of the primaries unclear), use CHOP:
//        CHOP > 61.8                              →  range
//        CHOP < 38.2 AND |EMA spread| > 1%        →  trend (EMA dir)
//        else                                     →  transition
//
// All thresholds are industry-standard:
//   - ADX 20/25: Wilder's original (1978)
//   - CHOP 38.2/61.8: Dreiss's Fibonacci ratios (1993)
//   - EMA spread 2%: standard "meaningfully separated" filter used
//     in confluence approaches
//   - ATR 3×: standard single-bar shock filter

import type { Kline } from "./kline";
import { computeEMA } from "./indicators";

export type Regime =
  | "trend-up"
  | "trend-down"
  | "range"
  | "transition"
  | "chaos";

export const REGIMES: Regime[] = [
  "trend-up",
  "trend-down",
  "range",
  "transition",
  "chaos",
];

export const REGIME_META: Record<
  Regime,
  { label: string; short: string; color: string; description: string }
> = {
  "trend-up": {
    label: "Trend Up",
    short: "↑",
    color: "#22c55e",
    description: "CHOP < 38.2 (or grey zone + ADX > 25), 20 EMA above 50 EMA.",
  },
  "trend-down": {
    label: "Trend Down",
    short: "↓",
    color: "#ef4444",
    description: "CHOP < 38.2 (or grey zone + ADX > 25), 20 EMA below 50 EMA.",
  },
  range: {
    label: "Range",
    short: "↔",
    color: "var(--cyan)",
    description: "CHOP > 61.8 — price chops without directional progress.",
  },
  transition: {
    label: "Transition",
    short: "~",
    color: "var(--purple)",
    description: "CHOP grey zone (38.2-61.8), ADX inconclusive — no decisive signal.",
  },
  chaos: {
    label: "Chaos",
    short: "✦",
    color: "#facc15",
    description: "Single bar moved > 3× ATR — news shock or liquidation.",
  },
};

// ─────────────────────────── Constants ───────────────────────────
//
// All thresholds are industry-standard. No tuning. If the classifier
// disagrees with the eye, the lesson is in reading the chart, not in
// changing these values.

const CHOP_PERIOD = 14;
const CHOP_TREND = 38.2; // below this = trending (Fibonacci 0.382)
const CHOP_RANGE = 61.8; // above this = ranging (Fibonacci 0.618)

const ADX_PERIOD = 14;
const ADX_TREND = 25; // Wilder's original "strong trend" threshold
const ADX_RANGE = 20; // Wilder's original "no trend" threshold

// EMA spread thresholds — how far apart 20 EMA and 50 EMA need to be
// to count as "meaningfully aligned." 2% is the standard cut-off used
// in confluence-based crypto systems. Below 1% the EMAs are basically
// touching and there's no real direction.
const EMA_SPREAD_STRONG = 0.02;
const EMA_SPREAD_WEAK = 0.01;

const ATR_PERIOD = 14;
const CHAOS_ATR_MULTIPLE = 3;

// ─────────────────────────── ATR ───────────────────────────
// Simple average of true range over the last `period` bars.
export function computeATR(bars: Kline[], period = ATR_PERIOD): number {
  if (bars.length < period + 1) return 0;
  let sum = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    sum += tr;
  }
  return sum / period;
}

// ─────────────────────────── Choppiness Index ───────────────────────────
//
// Bill Dreiss (1993). The textbook range/trend discriminator.
//
//   CHOP = 100 × log10(SUM(TR, n) / (MaxHigh(n) − MinLow(n))) / log10(n)
//
// Where TR is the per-bar true range and the sum / max / min are over
// the last `period` bars. Range: 0-100.
//
// Intuition: SUM(TR) is the total "path length" of the price over n bars.
// MaxHigh - MinLow is the straight-line distance from the highest to the
// lowest point. If the path is straight (pure trend), they're equal and
// log10(1) = 0 → CHOP ≈ 0. If the path zigzags many times within a tight
// range, the sum is much larger than the range → CHOP ≈ 100.
export function computeCHOP(bars: Kline[], period = CHOP_PERIOD): number {
  const n = bars.length;
  if (n < period + 1) return 0;

  const startIdx = n - period;
  let sumTR = 0;
  let maxHigh = -Infinity;
  let minLow = Infinity;

  for (let i = startIdx; i < n; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    sumTR += tr;
    if (cur.high > maxHigh) maxHigh = cur.high;
    if (cur.low < minLow) minLow = cur.low;
  }

  const range = maxHigh - minLow;
  if (range <= 0 || sumTR <= 0) return 0;

  return (100 * Math.log10(sumTR / range)) / Math.log10(period);
}

// ─────────────────────────── ADX ───────────────────────────
// Returns the most recent ADX value using Wilder's smoothing — the
// textbook implementation. Returns 0 if there aren't enough bars to
// produce a meaningful reading.
export function computeADXLast(bars: Kline[], period = ADX_PERIOD): number {
  const n = bars.length;
  if (n < period * 2 + 1) return 0;

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

  const dxValues: number[] = [];

  for (let i = period + 1; i < n; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    const denom = smoothTR || 1;
    const plusDI = 100 * (smoothPlusDM / denom);
    const minusDI = 100 * (smoothMinusDM / denom);
    const sum = plusDI + minusDI;
    const dx = sum > 0 ? (100 * Math.abs(plusDI - minusDI)) / sum : 0;
    dxValues.push(dx);
  }

  if (dxValues.length < period) return 0;

  let adx = 0;
  for (let i = 0; i < period; i++) adx += dxValues[i];
  adx = adx / period;

  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  return adx;
}

// ─────────────────────────── Classifier ───────────────────────────
export type Classification = {
  regime: Regime;
  // Primary: Choppiness Index over the last 14 bars
  chop: number;
  // Secondary: ADX(14), used only as tiebreaker in the CHOP grey zone
  adx: number;
  // Direction signal (used only after a trend has been confirmed)
  ema20: number;
  ema50: number;
  // Volatility baseline + chaos detector
  atr: number;
  recentBarMove: number;
  // Plain-English explanation of which rule fired
  reason: string;
};

export function classifyRegime(bars: Kline[]): Classification {
  const n = bars.length;
  if (n < 51) {
    return {
      regime: "transition",
      chop: 0,
      adx: 0,
      ema20: 0,
      ema50: 0,
      atr: 0,
      recentBarMove: 0,
      reason: "not enough bars to classify (need 51+)",
    };
  }

  const chop = computeCHOP(bars, CHOP_PERIOD);
  const adx = computeADXLast(bars, ADX_PERIOD);
  const atr = computeATR(bars, ATR_PERIOD);

  const ema20Series = computeEMA(bars, 20);
  const ema50Series = computeEMA(bars, 50);
  const ema20 = ema20Series[ema20Series.length - 1].value;
  const ema50 = ema50Series[ema50Series.length - 1].value;

  const last = bars[n - 1];
  const prev = bars[n - 2];
  const recentBarMove = Math.abs(last.close - prev.close);

  // EMA spread as a fraction (signed: positive = bullish, negative = bearish)
  const emaSpread = ema50 > 0 ? (ema20 - ema50) / ema50 : 0;
  const emaStronglyAligned = Math.abs(emaSpread) > EMA_SPREAD_STRONG;
  const emaWeaklyAligned = Math.abs(emaSpread) > EMA_SPREAD_WEAK;
  const emaBullish = emaSpread > 0;

  const base = { chop, adx, ema20, ema50, atr, recentBarMove };

  // ─── 1. Chaos: single huge bar ───
  if (atr > 0 && recentBarMove > CHAOS_ATR_MULTIPLE * atr) {
    return {
      ...base,
      regime: "chaos",
      reason: `Last bar moved ${(recentBarMove / atr).toFixed(1)}× ATR`,
    };
  }

  // ─── 2. PRIMARY trend signal: ADX strong + EMAs strongly aligned ───
  // This is the canonical Wilder approach. When both signals confirm,
  // the chart is trending — no matter what CHOP says (CHOP only sees
  // the last 14 bars, which may be a local consolidation inside a
  // longer trend).
  if (adx >= ADX_TREND && emaStronglyAligned) {
    if (emaBullish) {
      return {
        ...base,
        regime: "trend-up",
        reason: `ADX ${adx.toFixed(1)} ≥ ${ADX_TREND}, EMAs ${(emaSpread * 100).toFixed(1)}% bullish`,
      };
    }
    return {
      ...base,
      regime: "trend-down",
      reason: `ADX ${adx.toFixed(1)} ≥ ${ADX_TREND}, EMAs ${(emaSpread * 100).toFixed(1)}% bearish`,
    };
  }

  // ─── 3. PRIMARY range signal: ADX weak AND EMAs flat ───
  // Both signals saying "no trend." Definitively a range.
  if (adx < ADX_RANGE && !emaStronglyAligned) {
    return {
      ...base,
      regime: "range",
      reason: `ADX ${adx.toFixed(1)} < ${ADX_RANGE}, EMAs ${(Math.abs(emaSpread) * 100).toFixed(1)}% — no trend strength`,
    };
  }

  // ─── 4. Tiebreaker zone: use CHOP as the secondary signal ───
  // The primary signals disagreed or were ambiguous. CHOP tells us
  // whether the recent action is choppy or directional.

  // CHOP says clearly choppy
  if (chop > CHOP_RANGE) {
    return {
      ...base,
      regime: "range",
      reason: `CHOP ${chop.toFixed(1)} > ${CHOP_RANGE} — recent action choppy`,
    };
  }

  // CHOP says clearly directional + EMAs at least weakly point one way
  if (chop < CHOP_TREND && emaWeaklyAligned) {
    if (emaBullish) {
      return {
        ...base,
        regime: "trend-up",
        reason: `CHOP ${chop.toFixed(1)} < ${CHOP_TREND}, EMAs ${(emaSpread * 100).toFixed(1)}% bullish`,
      };
    }
    return {
      ...base,
      regime: "trend-down",
      reason: `CHOP ${chop.toFixed(1)} < ${CHOP_TREND}, EMAs ${(emaSpread * 100).toFixed(1)}% bearish`,
    };
  }

  // Everything ambiguous → genuine transition
  return {
    ...base,
    regime: "transition",
    reason: `ADX ${adx.toFixed(1)}, CHOP ${chop.toFixed(1)}, EMAs ${(emaSpread * 100).toFixed(1)}% — no decisive signal`,
  };
}
