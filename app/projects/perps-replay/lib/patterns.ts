// Pure candlestick pattern detection. No DOM, no React, no chart deps.
//
// Each detector takes raw bars and returns a list of matches keyed by the
// bar index where the pattern resolves. The chart renderer projects matches
// into series markers.
//
// Detection rules are intentionally simple and well-defined so that the
// unit tests can pin every threshold. Quality filters (volume, location at
// S/R) are deliberately out of scope here — the user should use these as
// signals to investigate, not auto-trade.

import type { Kline } from "./kline";

export type PatternKind =
  | "bullish-engulfing"
  | "bearish-engulfing"
  | "hammer"
  | "shooting-star"
  | "inside-bar"
  | "doji"
  | "dragonfly"
  | "gravestone";

export type PatternDirection = "bullish" | "bearish" | "neutral";

export type PatternMatch = {
  index: number; // bar index where the pattern resolves
  kind: PatternKind;
  direction: PatternDirection;
};

// ───────────────────────── candle anatomy helpers ─────────────────────────

export function body(b: Kline): number {
  return Math.abs(b.close - b.open);
}

export function range(b: Kline): number {
  return b.high - b.low;
}

export function upperWick(b: Kline): number {
  return b.high - Math.max(b.open, b.close);
}

export function lowerWick(b: Kline): number {
  return Math.min(b.open, b.close) - b.low;
}

export function isBullish(b: Kline): boolean {
  return b.close > b.open;
}

export function isBearish(b: Kline): boolean {
  return b.close < b.open;
}

// ───────────────────────── individual detectors ─────────────────────────

// Tunable thresholds. Pulled out so the unit tests can pin them and so the
// rules read as one block instead of being scattered through the detectors.
//
// The previous version of the engulfing detector had three real bugs that
// caused false positives on BTC 1D data:
//   1. No minimum body on the prior candle — a near-doji red would qualify
//      as "engulfed" by any larger green, even though visually nothing was
//      engulfed. This was the most common false positive.
//   2. Non-strict inequalities allowed cur.open == prev.close (a tie, not a
//      gap-down open). The strict TradingView/textbook definition uses `<`.
//   3. body(cur) > body(prev) only required the current body to be a hair
//      larger. We now require clear dominance.
const ENGULF_PREV_MIN_BODY_RATIO = 0.3; // prev must be a "real" red/green, not a doji
const ENGULF_CUR_MIN_BODY_RATIO = 0.5; // current must be a decisive candle
const ENGULF_BODY_DOMINANCE = 1.2; // current body ≥ 1.2× prev body

// Bullish engulfing: previous candle red, current candle green, current body
// strictly swallows previous body, both candles have meaningful bodies, and
// the current body clearly dominates the previous one.
export function isBullishEngulfing(prev: Kline, cur: Kline): boolean {
  if (!isBearish(prev) || !isBullish(cur)) return false;
  const pr = range(prev);
  const cr = range(cur);
  if (pr <= 0 || cr <= 0) return false;
  // both candles must be "real" — not doji-like
  if (body(prev) / pr < ENGULF_PREV_MIN_BODY_RATIO) return false;
  if (body(cur) / cr < ENGULF_CUR_MIN_BODY_RATIO) return false;
  // strict body engulf: open BELOW prev close, close ABOVE prev open
  if (cur.open >= prev.close) return false;
  if (cur.close <= prev.open) return false;
  // current body must clearly dominate prev body
  if (body(cur) < ENGULF_BODY_DOMINANCE * body(prev)) return false;
  return true;
}

export function isBearishEngulfing(prev: Kline, cur: Kline): boolean {
  if (!isBullish(prev) || !isBearish(cur)) return false;
  const pr = range(prev);
  const cr = range(cur);
  if (pr <= 0 || cr <= 0) return false;
  if (body(prev) / pr < ENGULF_PREV_MIN_BODY_RATIO) return false;
  if (body(cur) / cr < ENGULF_CUR_MIN_BODY_RATIO) return false;
  // strict body engulf: open ABOVE prev close, close BELOW prev open
  if (cur.open <= prev.close) return false;
  if (cur.close >= prev.open) return false;
  if (body(cur) < ENGULF_BODY_DOMINANCE * body(prev)) return false;
  return true;
}

// Pin bar (hammer / shooting star) thresholds.
//
// Bulkowski's definition uses lower wick ≥ 2× body for the hammer; we keep
// that rule and add stricter wick + body-position constraints so we don't
// flag any small-bodied candle with a noisy opposing wick.
const PIN_MIN_DOMINANT_WICK_TO_BODY = 2; // dominant wick ≥ 2× body
const PIN_MAX_OPPOSING_WICK_TO_RANGE = 0.1; // opposing wick ≤ 10% of range
const PIN_MIN_BODY_TO_RANGE = 0.05; // exclude doji-like bars
const PIN_BODY_POSITION_RATIO = 0.66; // body anchored to top/bottom third

// Hammer: small body in the upper third of the range, long lower wick
// (≥ 2 × body), almost no upper wick. Bullish reversal candidate at support.
export function isHammer(b: Kline): boolean {
  const bd = body(b);
  const r = range(b);
  if (bd <= 0 || r <= 0) return false;
  if (bd / r < PIN_MIN_BODY_TO_RANGE) return false; // exclude dojis
  const lw = lowerWick(b);
  const uw = upperWick(b);
  if (lw < PIN_MIN_DOMINANT_WICK_TO_BODY * bd) return false;
  if (uw / r > PIN_MAX_OPPOSING_WICK_TO_RANGE) return false;
  // body must sit in the upper third — top of body anchored near the high
  const bodyTop = Math.max(b.open, b.close);
  if ((bodyTop - b.low) / r < PIN_BODY_POSITION_RATIO) return false;
  return true;
}

// Shooting star: mirror of hammer. Long upper wick, small body in lower
// third, almost no lower wick.
export function isShootingStar(b: Kline): boolean {
  const bd = body(b);
  const r = range(b);
  if (bd <= 0 || r <= 0) return false;
  if (bd / r < PIN_MIN_BODY_TO_RANGE) return false;
  const lw = lowerWick(b);
  const uw = upperWick(b);
  if (uw < PIN_MIN_DOMINANT_WICK_TO_BODY * bd) return false;
  if (lw / r > PIN_MAX_OPPOSING_WICK_TO_RANGE) return false;
  // body must sit in the lower third — bottom of body anchored near the low
  const bodyBottom = Math.min(b.open, b.close);
  if ((b.high - bodyBottom) / r < PIN_BODY_POSITION_RATIO) return false;
  return true;
}

// Inside bar: current candle's full range fits inside the previous candle's
// full range. Volatility compression — not a directional signal on its own.
// Strict inequality avoids edge cases where current matches previous exactly.
export function isInsideBar(prev: Kline, cur: Kline): boolean {
  return cur.high < prev.high && cur.low > prev.low;
}

// Generic doji: body is tiny relative to total range. We use 10% as the
// threshold which catches typical doji shapes without false-flagging
// every small-body candle.
export function isDoji(b: Kline): boolean {
  const r = range(b);
  if (r <= 0) return false;
  return body(b) / r < 0.1;
}

// Dragonfly doji: doji with a long lower wick and almost no upper wick.
// Bullish at support — looks like a hammer that went all the way back.
export function isDragonfly(b: Kline): boolean {
  if (!isDoji(b)) return false;
  const r = range(b);
  return lowerWick(b) / r > 0.6 && upperWick(b) / r < 0.1;
}

// Gravestone doji: doji with a long upper wick and almost no lower wick.
// Bearish at resistance.
export function isGravestone(b: Kline): boolean {
  if (!isDoji(b)) return false;
  const r = range(b);
  return upperWick(b) / r > 0.6 && lowerWick(b) / r < 0.1;
}

// ───────────────────────── orchestrator ─────────────────────────

export function detectPatterns(bars: Kline[]): PatternMatch[] {
  const out: PatternMatch[] = [];
  for (let i = 0; i < bars.length; i++) {
    const cur = bars[i];

    // Single-candle patterns. Doji variants are checked first because
    // dragonfly/gravestone are strictly more specific than plain doji.
    if (isDragonfly(cur)) {
      out.push({ index: i, kind: "dragonfly", direction: "bullish" });
    } else if (isGravestone(cur)) {
      out.push({ index: i, kind: "gravestone", direction: "bearish" });
    } else if (isDoji(cur)) {
      out.push({ index: i, kind: "doji", direction: "neutral" });
    }

    if (isHammer(cur)) {
      out.push({ index: i, kind: "hammer", direction: "bullish" });
    }
    if (isShootingStar(cur)) {
      out.push({ index: i, kind: "shooting-star", direction: "bearish" });
    }

    // Two-candle patterns
    if (i > 0) {
      const prev = bars[i - 1];
      if (isBullishEngulfing(prev, cur)) {
        out.push({ index: i, kind: "bullish-engulfing", direction: "bullish" });
      }
      if (isBearishEngulfing(prev, cur)) {
        out.push({ index: i, kind: "bearish-engulfing", direction: "bearish" });
      }
      if (isInsideBar(prev, cur)) {
        out.push({ index: i, kind: "inside-bar", direction: "neutral" });
      }
    }
  }
  return out;
}

// ───────────────────────── display metadata ─────────────────────────

// Used by the chart renderer to pick marker shape, color, and label.
export const PATTERN_META: Record<
  PatternKind,
  { label: string; short: string; color: string }
> = {
  "bullish-engulfing": { label: "Bullish Engulfing", short: "BE", color: "#22c55e" },
  "bearish-engulfing": { label: "Bearish Engulfing", short: "BE", color: "#ef4444" },
  hammer: { label: "Hammer", short: "H", color: "#22c55e" },
  "shooting-star": { label: "Shooting Star", short: "SS", color: "#ef4444" },
  "inside-bar": { label: "Inside Bar", short: "IB", color: "#94a3b8" },
  doji: { label: "Doji", short: "D", color: "#facc15" },
  dragonfly: { label: "Dragonfly", short: "DF", color: "#22c55e" },
  gravestone: { label: "Gravestone", short: "GS", color: "#ef4444" },
};
