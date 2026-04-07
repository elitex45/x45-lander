import { describe, expect, it } from "vitest";
import {
  computeEMA,
  computeVWAP,
} from "@/app/projects/perps-replay/lib/indicators";
import type { Kline } from "@/app/projects/perps-replay/lib/kline";

function bar(
  openTime: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): Kline {
  return {
    openTime,
    open,
    high,
    low,
    close,
    volume,
    closeTime: openTime + 60_000 - 1,
  };
}

// ─────────────────────────── VWAP ───────────────────────────

describe("computeVWAP", () => {
  it("returns empty array for empty input", () => {
    expect(computeVWAP([])).toEqual([]);
  });

  it("first point equals typical price when volume > 0", () => {
    // typical = (110 + 90 + 100) / 3 = 100
    const bars = [bar(0, 100, 110, 90, 100, 50)];
    const out = computeVWAP(bars);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBeCloseTo(100, 8);
  });

  it("two-bar manual computation", () => {
    // bar1: typical=(120+80+100)/3 = 100, vol=10 → cumPV=1000, cumV=10
    //   vwap = 100
    // bar2: typical=(220+180+200)/3 = 200, vol=10 → cumPV=3000, cumV=20
    //   vwap = 150
    const bars = [
      bar(0, 100, 120, 80, 100, 10),
      bar(60_000, 200, 220, 180, 200, 10),
    ];
    const out = computeVWAP(bars);
    expect(out).toHaveLength(2);
    expect(out[0].value).toBeCloseTo(100, 8);
    expect(out[1].value).toBeCloseTo(150, 8);
  });

  it("weights by volume — heavier later bar pulls VWAP toward it", () => {
    // bar1 vol=1, bar2 vol=99 → vwap should be much closer to bar2's typical
    const bars = [
      bar(0, 100, 100, 100, 100, 1),
      bar(60_000, 200, 200, 200, 200, 99),
    ];
    const out = computeVWAP(bars);
    // typical bar1 = 100, typical bar2 = 200
    // cumPV = 100*1 + 200*99 = 19900, cumV = 100, vwap = 199
    expect(out[1].value).toBeCloseTo(199, 8);
  });

  it("time field is openTime / 1000 (seconds)", () => {
    const bars = [bar(60_000, 100, 110, 90, 100, 10)];
    const out = computeVWAP(bars);
    expect(out[0].time).toBe(60);
  });

  it("falls back to close when cumulative volume is zero", () => {
    // Edge case: zero-volume bar (rare but possible). cumV=0 → use close.
    const bars = [bar(0, 100, 110, 90, 105, 0)];
    const out = computeVWAP(bars);
    expect(out[0].value).toBe(105);
  });
});

// ─────────────────────────── EMA ───────────────────────────

describe("computeEMA", () => {
  it("returns empty for empty input", () => {
    expect(computeEMA([], 20)).toEqual([]);
  });

  it("returns empty for invalid period", () => {
    const bars = [bar(0, 100, 100, 100, 100, 1)];
    expect(computeEMA(bars, 0)).toEqual([]);
  });

  it("EMA on a flat series equals the constant", () => {
    const bars = Array.from({ length: 30 }, (_, i) =>
      bar(i * 60_000, 100, 100, 100, 100, 10)
    );
    const out = computeEMA(bars, 5);
    // After warmup, every value should be 100
    for (const p of out) {
      expect(p.value).toBeCloseTo(100, 8);
    }
  });

  it("warm-up: skips the first (period - 1) bars", () => {
    const bars = Array.from({ length: 30 }, (_, i) =>
      bar(i * 60_000, 100, 100, 100, 100, 10)
    );
    const out = computeEMA(bars, 5);
    // 30 bars, period 5 → we get points starting at index 4 → 26 points
    expect(out).toHaveLength(26);
  });

  it("matches hand-computed EMA(3) on a known sequence", () => {
    // EMA(3): k = 2 / (3+1) = 0.5
    // closes: 10, 20, 30, 40, 50
    // i=0: ema = 10
    // i=1: ema = 20*0.5 + 10*0.5 = 15
    // i=2: ema = 30*0.5 + 15*0.5 = 22.5  ← first published (i >= period-1 = 2)
    // i=3: ema = 40*0.5 + 22.5*0.5 = 31.25
    // i=4: ema = 50*0.5 + 31.25*0.5 = 40.625
    const closes = [10, 20, 30, 40, 50];
    const bars = closes.map((c, i) => bar(i * 60_000, c, c, c, c, 10));
    const out = computeEMA(bars, 3);
    expect(out).toHaveLength(3);
    expect(out[0].value).toBeCloseTo(22.5, 8);
    expect(out[1].value).toBeCloseTo(31.25, 8);
    expect(out[2].value).toBeCloseTo(40.625, 8);
  });

  it("EMA reacts faster than the equivalent SMA on a step change", () => {
    // 10 bars at 100 then 10 bars at 200. After the step, EMA should be
    // somewhere between 100 and 200 well before the SMA would catch up.
    const closes = [
      ...Array(10).fill(100),
      ...Array(10).fill(200),
    ];
    const bars = closes.map((c, i) => bar(i * 60_000, c, c, c, c, 10));
    const out = computeEMA(bars, 5);
    const lastVal = out[out.length - 1].value;
    // After 10 bars at 200, EMA(5) should be very close to 200
    expect(lastVal).toBeGreaterThan(180);
    expect(lastVal).toBeLessThanOrEqual(200);
  });
});
