// Pure regime classification math.
//
// Used by the trainer to compute "ground truth" for the user's quiz answer.
// Also unit-testable in isolation since there's no DOM, React, or async work.
//
// The classifier reads three signals from the visible window of bars:
//   - ADX(14)            — trend strength (NOT direction)
//   - 20 EMA vs 50 EMA   — direction of trend
//   - recent bar vs ATR  — chaos / capitulation detector
//
// Decision tree:
//   recent bar moved > 3 × ATR  →  chaos
//   ADX > 25 and 20 EMA > 50 EMA → trend-up
//   ADX > 25 and 20 EMA < 50 EMA → trend-down
//   ADX < 20                     → range
//   ADX in [20, 25]              → transition
//
// All thresholds are the textbook values from the user's `learning/readme.md`
// (Phase 4 — regime detection). They're tunable from one place.

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
    description: "Higher highs, higher lows. ADX > 25, 20 EMA above 50 EMA.",
  },
  "trend-down": {
    label: "Trend Down",
    short: "↓",
    color: "#ef4444",
    description: "Lower highs, lower lows. ADX > 25, 20 EMA below 50 EMA.",
  },
  range: {
    label: "Range",
    short: "↔",
    color: "var(--cyan)",
    description: "Bouncing between S/R. ADX < 20, no clear trend direction.",
  },
  transition: {
    label: "Transition",
    short: "~",
    color: "var(--purple)",
    description: "Old regime breaking, new not confirmed. ADX between 20-25.",
  },
  chaos: {
    label: "Chaos",
    short: "✦",
    color: "#facc15",
    description: "Liquidation cascade or news shock. Recent bar > 3× ATR.",
  },
};

const ADX_PERIOD = 14;
const ATR_PERIOD = 14;
const ADX_TREND = 25;
const ADX_RANGE = 20;
// For conflict detection: "old trend now wandering" requires ADX to be
// MEANINGFULLY above 25, not just noise around the line. Real established
// trends show ADX > 30. Below that, a low ER honestly means range, not
// "trend breaking down." 25.8 is not a trend that broke; it's noise.
const ADX_STRONG = 30;
// Dominant trend: ADX values this high indicate a trend so overwhelming
// that a brief late-window pause doesn't break it. The conflict rule
// (which would otherwise call this "transition") is overridden — we
// trust ADX + EMA cross instead. ADX 45+ is rare and meaningful; only
// genuinely strong sustained moves produce it.
const ADX_DOMINANT = 45;
// When the dominant rule fires, we still sanity-check the recent direction.
// If the recent net move is more than 1 ATR AGAINST the trend direction,
// it's not a brief pause — it's the start of a reversal, and we should
// fall through to other rules instead of stamping it as the old trend.
const DOMINANT_TREND_RECENT_TOLERANCE = 1;
const CHAOS_ATR_MULTIPLE = 3;

// Recent directional momentum check.
//
// ADX is a smoothed, lagging trend-strength indicator. On charts where a
// long range suddenly breaks out (chop → breakout), ADX often hasn't had
// time to climb above 25 by the time a human can clearly see the trend.
// To catch those, we also look at the net price move over the last
// TREND_LOOKBACK bars expressed in ATRs. If that move is large enough,
// we call it a trend regardless of ADX.
//
// 15 bars × 4 ATR threshold means: the last 15 bars have moved
// (on average) > ~0.27 ATR per bar in one direction. That's a clear
// directional bias even if individual bars chop around the path.
//
// BUT: net move alone isn't enough — we also require the PATH to be
// directionally efficient (ER >= TREND_MOVE_MIN_ER). Without this gate,
// the rule fires on low-volatility charts where a small absolute
// pullback happens to be 4× a tiny ATR. That's a fluke, not a trend.
const TREND_LOOKBACK = 15;
const TREND_MOVE_ATR_MULTIPLE = 4;
const TREND_MOVE_MIN_ER = 0.3;

// Kaufman's Efficiency Ratio over the last ER_LOOKBACK bars.
//
// ER = |net move| / sum of bar-to-bar moves
//
// High ER (most movement was in one direction) = trending.
// Low ER (lots of movement, almost zero net progress) = ranging.
//
// This is the primary range/trend discriminator because ADX is too
// noisy in the 18-25 zone — it can't distinguish "actually ranging
// with some swings" from "weakly trending". ER answers that directly.
const ER_LOOKBACK = 20;
const ER_TREND = 0.45;
const ER_RANGE = 0.2;
// Soft range: ER is mildly elevated but ADX confirms no trend strength.
// In this case the chart is just noisy chop, not a true transition. The
// strict ER_RANGE (0.20) misses these because the ER happens to land
// just above the line. ER < 0.30 AND ADX below the trend floor catches
// them as range, which is the correct call.
const ER_SOFT_RANGE = 0.3;

// ─────────────────────────── Efficiency Ratio ───────────────────────────
// Kaufman's Efficiency Ratio: net directional progress divided by total
// path length over `lookback` bars. Pure, no allocations beyond a sum.
export function efficiencyRatio(bars: Kline[], lookback: number): number {
  const n = bars.length;
  if (n < lookback + 1) return 0;
  const start = n - 1 - lookback;
  const netMove = Math.abs(bars[n - 1].close - bars[start].close);
  let totalMove = 0;
  for (let i = start + 1; i < n; i++) {
    totalMove += Math.abs(bars[i].close - bars[i - 1].close);
  }
  return totalMove > 0 ? netMove / totalMove : 0;
}

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

// ─────────────────────────── ADX ───────────────────────────
// Returns the most recent ADX value using Wilder's smoothing — the
// textbook implementation. Returns 0 if there aren't enough bars to
// produce a meaningful reading.
export function computeADXLast(bars: Kline[], period = ADX_PERIOD): number {
  const n = bars.length;
  // ADX needs roughly 2 × period + 1 bars to settle. Below that, return 0.
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

  // Wilder's smoothing — seed with the sum of the first `period` values,
  // then `next = prev - prev/period + current` for each subsequent bar.
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

  // First ADX = simple average of first `period` DX values
  let adx = 0;
  for (let i = 0; i < period; i++) adx += dxValues[i];
  adx = adx / period;

  // Wilder smooth subsequent DX values
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  return adx;
}

// ─────────────────────────── classifier ───────────────────────────
export type Classification = {
  regime: Regime;
  adx: number;
  ema20: number;
  ema50: number;
  atr: number;
  recentBarMove: number; // |close - prev_close| of the last bar
  // Net close-to-close move over the last TREND_LOOKBACK bars, signed.
  // Positive = price moved up. In ATRs (so it's volatility-normalized
  // and comparable across pairs / timeframes).
  recentMoveATR: number;
  // Kaufman's Efficiency Ratio over the last ER_LOOKBACK bars.
  // 0 = pure noise / range. 1 = perfectly directional / trend.
  er: number;
  reason: string;
};

// Classifies the regime of the visible bar window. Pure function — does
// not look beyond `bars`. Used as the algorithmic ground truth for the
// trainer quiz. Returns the same shape regardless of regime so the UI
// can always render the underlying numbers.
export function classifyRegime(bars: Kline[]): Classification {
  const n = bars.length;
  if (n < 51) {
    return {
      regime: "transition",
      adx: 0,
      ema20: 0,
      ema50: 0,
      atr: 0,
      recentBarMove: 0,
      recentMoveATR: 0,
      er: 0,
      reason: "not enough bars to classify (need 51+)",
    };
  }

  const adx = computeADXLast(bars, ADX_PERIOD);
  const atr = computeATR(bars, ATR_PERIOD);

  const ema20Series = computeEMA(bars, 20);
  const ema50Series = computeEMA(bars, 50);
  const ema20 = ema20Series[ema20Series.length - 1].value;
  const ema50 = ema50Series[ema50Series.length - 1].value;

  const last = bars[n - 1];
  const prev = bars[n - 2];
  const recentBarMove = Math.abs(last.close - prev.close);

  // Net move over the last TREND_LOOKBACK bars, expressed in ATRs.
  // Signed: positive = price moved up. Catches strong recent breakouts.
  const lookbackIdx = n - 1 - TREND_LOOKBACK;
  const lookbackClose =
    lookbackIdx >= 0 ? bars[lookbackIdx].close : bars[0].close;
  const recentNetMove = last.close - lookbackClose;
  const recentMoveATR = atr > 0 ? recentNetMove / atr : 0;

  // Efficiency ratio — how much of the recent total movement was
  // directional. The single best signal for "ranging vs trending."
  const er = efficiencyRatio(bars, ER_LOOKBACK);

  const base = {
    adx,
    ema20,
    ema50,
    atr,
    recentBarMove,
    recentMoveATR,
    er,
  };

  // ─── 1. Chaos check (single huge bar) ───
  if (atr > 0 && recentBarMove > CHAOS_ATR_MULTIPLE * atr) {
    return {
      ...base,
      regime: "chaos",
      reason: `Last bar moved ${(recentBarMove / atr).toFixed(1)}× ATR`,
    };
  }

  // ─── 2. Strong recent breakout (intuitive explanation) ───
  // Net move > 4 ATR alone isn't enough — we also require ER >= 0.3
  // so the path was directionally efficient. Without this gate, the
  // rule fires on low-volatility charts where a small absolute
  // pullback happens to be 4× a tiny ATR. ER catches the fluke.
  if (recentMoveATR > TREND_MOVE_ATR_MULTIPLE && er >= TREND_MOVE_MIN_ER) {
    return {
      ...base,
      regime: "trend-up",
      reason: `Last ${TREND_LOOKBACK} bars moved +${recentMoveATR.toFixed(1)}× ATR (ER ${er.toFixed(2)})`,
    };
  }
  if (recentMoveATR < -TREND_MOVE_ATR_MULTIPLE && er >= TREND_MOVE_MIN_ER) {
    return {
      ...base,
      regime: "trend-down",
      reason: `Last ${TREND_LOOKBACK} bars moved ${recentMoveATR.toFixed(1)}× ATR (ER ${er.toFixed(2)})`,
    };
  }

  // ─── 3. Dominant trend (very strong ADX overrides conflict rule) ───
  // When ADX is extraordinarily high (45+), the trend is so overwhelming
  // that a brief late-window consolidation doesn't constitute a transition.
  // It's just a pause within the dominant move. Trust ADX + EMA cross.
  // Sanity check: the recent direction must NOT strongly contradict the
  // trend direction (otherwise ADX is lagging behind a real reversal).
  if (
    adx >= ADX_DOMINANT &&
    Math.abs(recentMoveATR) < DOMINANT_TREND_RECENT_TOLERANCE
  ) {
    if (ema20 > ema50) {
      return {
        ...base,
        regime: "trend-up",
        reason: `ADX ${adx.toFixed(1)} dominant, 20 EMA > 50 EMA, recent action flat`,
      };
    }
    return {
      ...base,
      regime: "trend-down",
      reason: `ADX ${adx.toFixed(1)} dominant, 20 EMA < 50 EMA, recent action flat`,
    };
  }

  // ─── 4. Conflict detection — moderately strong ADX but low efficiency ───
  // For ADX in the 30-44 range, a low ER means the trend is genuinely
  // breaking down. (Above 45 is handled by the dominant trend rule.)
  if (adx >= ADX_STRONG && er < ER_RANGE) {
    return {
      ...base,
      regime: "transition",
      reason: `ADX ${adx.toFixed(1)} strong but ER ${er.toFixed(2)} low — trend breaking down`,
    };
  }

  // ─── 4. Efficiency ratio — primary range/trend discriminator ───
  // High ER = directional, low ER = wandering. This catches both the
  // slow-trend case (where ADX may not have settled) and the obvious-
  // range case (where ADX is in the noisy 18-25 zone).
  if (er >= ER_TREND) {
    if (ema20 > ema50) {
      return {
        ...base,
        regime: "trend-up",
        reason: `ER ${er.toFixed(2)} ≥ ${ER_TREND}, 20 EMA > 50 EMA`,
      };
    }
    return {
      ...base,
      regime: "trend-down",
      reason: `ER ${er.toFixed(2)} ≥ ${ER_TREND}, 20 EMA < 50 EMA`,
    };
  }
  if (er < ER_RANGE) {
    return {
      ...base,
      regime: "range",
      reason: `ER ${er.toFixed(2)} < ${ER_RANGE}, price returns to mean`,
    };
  }

  // ─── Soft range: mildly elevated ER but no trend strength ───
  // ER 0.20-0.30 with ADX below the range floor (< 20) = noisy chop,
  // not a transition. There's no trend to be in transition from when
  // ADX is this low. Default to range.
  if (er < ER_SOFT_RANGE && adx < ADX_RANGE) {
    return {
      ...base,
      regime: "range",
      reason: `ER ${er.toFixed(2)} mild, ADX ${adx.toFixed(1)} < ${ADX_RANGE} — no trend strength`,
    };
  }

  // ─── 4. ADX fallback (medium efficiency) ───
  // EMAs are slow and reflect the OLD trend. If recent action strongly
  // contradicts the EMA cross direction, the EMAs are stale and we have
  // a regime in transition, not a clean trend. Catch that case before
  // blindly trusting the EMA cross.
  const RECENT_CONFLICT_ATR = 2;
  if (adx >= ADX_TREND) {
    const emasBearish = ema20 < ema50;
    const emasBullish = ema20 > ema50;

    if (emasBearish && recentMoveATR > RECENT_CONFLICT_ATR) {
      return {
        ...base,
        regime: "transition",
        reason: `EMAs bearish but last ${TREND_LOOKBACK} bars +${recentMoveATR.toFixed(1)}× ATR — direction conflict`,
      };
    }
    if (emasBullish && recentMoveATR < -RECENT_CONFLICT_ATR) {
      return {
        ...base,
        regime: "transition",
        reason: `EMAs bullish but last ${TREND_LOOKBACK} bars ${recentMoveATR.toFixed(1)}× ATR — direction conflict`,
      };
    }

    if (emasBullish) {
      return {
        ...base,
        regime: "trend-up",
        reason: `ADX ${adx.toFixed(1)} ≥ ${ADX_TREND}, 20 EMA > 50 EMA`,
      };
    }
    return {
      ...base,
      regime: "trend-down",
      reason: `ADX ${adx.toFixed(1)} ≥ ${ADX_TREND}, 20 EMA < 50 EMA`,
    };
  }

  // ─── 5. Genuine transition: medium ER + medium ADX (the actual ambiguous zone) ───
  return {
    ...base,
    regime: "transition",
    reason: `ER ${er.toFixed(2)} mid, ADX ${adx.toFixed(1)} mid — no decisive signal`,
  };
}
