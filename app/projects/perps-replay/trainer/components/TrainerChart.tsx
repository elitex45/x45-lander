"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickData,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import { useTheme } from "@/app/lib/theme";
import type { Kline } from "../../lib/kline";
import { computeEMA } from "../../lib/indicators";

type Props = {
  // The bars the user is currently labeling. Always rendered.
  bars: Kline[];
  // Bars after the labeling window — only rendered after the user has
  // answered, so they can see what happened next without spoiling the
  // quiz. Drawn with the same candle treatment, no separator (the chart
  // is meant to read continuously).
  futureBars?: Kline[];
  // When true, overlay 20 EMA + 50 EMA so the user can see what the
  // algorithmic classifier was reading. Hidden during the quiz to keep
  // the chart "blank of hints".
  showIndicators: boolean;
};

// Hard-coded so candles read familiar regardless of theme accent and
// avoid stale-CSS-var races on theme toggles. Mirrors ReplayChart.
const CANDLE_UP = "#22c55e";
const CANDLE_DOWN = "#ef4444";
const EMA20_COLOR = "#06b6d4"; // cyan
const EMA50_COLOR = "#a855f7"; // purple

function readVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TrainerChart({ bars, futureBars = [], showIndicators }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { theme } = useTheme();

  // ─── chart lifecycle (mount once, dispose on unmount) ───
  useEffect(() => {
    if (!containerRef.current) return;

    const fg = readVar("--fg") || "#e0e4ec";
    const muted = readVar("--muted") || "#6e7681";
    const border = readVar("--border") || "rgba(255,255,255,0.06)";

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: muted,
        fontFamily:
          "var(--font-geist-mono), ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: border, style: 0 },
        horzLines: { color: border, style: 0 },
      },
      rightPriceScale: {
        borderColor: border,
        textColor: muted,
      },
      timeScale: {
        borderColor: border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CANDLE_UP,
      downColor: CANDLE_DOWN,
      borderUpColor: CANDLE_UP,
      borderDownColor: CANDLE_DOWN,
      wickUpColor: CANDLE_UP,
      wickDownColor: CANDLE_DOWN,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Suppress unused-var lint for `fg` (kept around so future tweaks
    // can re-color the body text without re-reading the var).
    void fg;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
    };
    // We deliberately remount on theme so the chart picks up new vars.
  }, [theme]);

  // ─── push bars to the candle series ───
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    const all = [...bars, ...futureBars];
    const data: CandlestickData<UTCTimestamp>[] = all.map((b) => ({
      time: Math.floor(b.openTime / 1000) as UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    series.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [bars, futureBars]);

  // ─── EMA overlay (only when showIndicators is true) ───
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Tear down any previous EMA lines so we can re-render cleanly when
    // the visible bars or showIndicators flag change.
    if (ema20SeriesRef.current) {
      chart.removeSeries(ema20SeriesRef.current);
      ema20SeriesRef.current = null;
    }
    if (ema50SeriesRef.current) {
      chart.removeSeries(ema50SeriesRef.current);
      ema50SeriesRef.current = null;
    }

    if (!showIndicators) return;

    // Compute EMAs over the bars the user was actually labeling — NOT
    // the future bars — so the lines reflect what the classifier read.
    const ema20 = computeEMA(bars, 20);
    const ema50 = computeEMA(bars, 50);

    if (ema20.length > 0) {
      const s = chart.addSeries(LineSeries, {
        color: EMA20_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(
        ema20.map<LineData<UTCTimestamp>>((p) => ({
          time: Math.floor(p.time) as UTCTimestamp,
          value: p.value,
        }))
      );
      ema20SeriesRef.current = s;
    }
    if (ema50.length > 0) {
      const s = chart.addSeries(LineSeries, {
        color: EMA50_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(
        ema50.map<LineData<UTCTimestamp>>((p) => ({
          time: Math.floor(p.time) as UTCTimestamp,
          value: p.value,
        }))
      );
      ema50SeriesRef.current = s;
    }
  }, [bars, showIndicators]);

  return <div ref={containerRef} className="w-full h-full" />;
}
