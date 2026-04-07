"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickData,
  CandlestickSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  LineData,
  LineSeries,
  Time,
  UTCTimestamp,
  createChart,
  createSeriesMarkers,
  ISeriesMarkersPluginApi,
  SeriesMarker,
} from "lightweight-charts";
import { useTheme } from "@/app/lib/theme";
import type { Kline } from "../lib/kline";
import type { ClosedTrade, Order, Position } from "../lib/engine";
import {
  ALL_INDICATORS,
  INDICATOR_META,
  IndicatorId,
  IndicatorVisibility,
  computeEMA,
  computeVWAP,
} from "../lib/indicators";

type Props = {
  bars: Kline[]; // already sliced to [0..cursor]
  positions: Position[];
  openOrders: Order[];
  closedTrades: ClosedTrade[];
  symbol: string;
  loading: boolean;
  indicators: IndicatorVisibility;
  toggleIndicator: (id: IndicatorId) => void;
};

function readVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function readPalette() {
  return {
    accent: readVar("--accent") || "#00ff41",
    fg: readVar("--fg") || "#e0e4ec",
    muted: readVar("--muted") || "#6e7681",
    border: readVar("--border") || "rgba(255,255,255,0.06)",
    purple: readVar("--purple") || "#a855f7",
    cyan: readVar("--cyan") || "#06b6d4",
  };
}

// Candle colors are intentionally hard-coded so the chart reads as familiar
// green/red regardless of theme accent, and avoids stale-CSS-var races on
// theme toggle.
const CANDLE_UP = "#22c55e";
const CANDLE_DOWN = "#ef4444";

const LOADING_QUOTES = [
  "summoning candles from the binance vault…",
  "asking the price gods nicely…",
  "decompressing your future PnL…",
  "borrowing wicks from past you…",
  "warming up the rekt machine…",
  "convincing 2024 to load faster…",
  "wiping dust off old liquidations…",
  "teaching bytes how to be candles…",
  "shouting into the orderbook void…",
  "loading 10,000 ways to get stopped out…",
  "fetching candles, dodging FOMO…",
  "this would be free on tradingview if it weren't…",
];

export function ReplayChart({
  bars,
  positions,
  openOrders,
  closedTrades,
  symbol,
  loading,
  indicators,
  toggleIndicator,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Record<IndicatorId, ISeriesApi<"Line"> | null>>({
    vwap: null,
    ema20: null,
    ema50: null,
  });
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastBarsLenRef = useRef(0);
  const lastSymbolRef = useRef(symbol);
  // Track the first bar's openTime so we can detect when the underlying bar
  // set has *fundamentally* changed (e.g. timeframe switch from 1h → 5m).
  // Length and symbol alone aren't enough: after a tf change, the empty
  // render briefly resets length to 0, and the next render with the first
  // new bar looks identical to a normal +1 incremental advance — except the
  // timestamps are entirely different, which crashes lightweight-charts.
  const lastFirstTimeRef = useRef<number | null>(null);

  const { resolvedTheme } = useTheme();

  // Funny loading quote — re-rolled on each load transition.
  const [loadingQuote, setLoadingQuote] = useState(LOADING_QUOTES[0]);
  useEffect(() => {
    if (!loading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingQuote(
      LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]
    );
  }, [loading]);

  // ───── mount chart once ─────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const palette = readPalette();

    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor: palette.muted,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: palette.border },
        horzLines: { color: palette.border },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: palette.border },
      timeScale: {
        borderColor: palette.border,
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: CANDLE_UP,
      downColor: CANDLE_DOWN,
      borderUpColor: CANDLE_UP,
      borderDownColor: CANDLE_DOWN,
      wickUpColor: CANDLE_UP,
      wickDownColor: CANDLE_DOWN,
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: palette.muted,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Indicator line series — created once, data fed in a separate effect.
    // priceLineVisible:false keeps them from cluttering the right-axis label.
    for (const id of ALL_INDICATORS) {
      indicatorSeriesRef.current[id] = chart.addSeries(LineSeries, {
        color: INDICATOR_META[id].color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;
    markersPluginRef.current = createSeriesMarkers(candle);

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
      markersPluginRef.current = null;
      priceLinesRef.current = [];
      indicatorSeriesRef.current = { vwap: null, ema20: null, ema50: null };
    };
  }, []);

  // ───── re-apply chart chrome (grid/text) when theme changes ─────
  useEffect(() => {
    const chart = chartRef.current;
    const vol = volRef.current;
    if (!chart || !vol) return;
    const id = requestAnimationFrame(() => {
      const palette = readPalette();
      chart.applyOptions({
        layout: {
          textColor: palette.muted,
          background: { color: "transparent" },
        },
        grid: {
          vertLines: { color: palette.border },
          horzLines: { color: palette.border },
        },
        rightPriceScale: { borderColor: palette.border },
        timeScale: { borderColor: palette.border },
      });
      vol.applyOptions({ color: palette.muted });
    });
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);

  // ───── feed bars: full reset on any fundamental change, incremental on +1 ─────
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!candle || !vol) return;

    const firstTimeNow = bars.length > 0 ? bars[0].openTime : null;
    const symbolChanged = lastSymbolRef.current !== symbol;
    const firstTimeChanged = firstTimeNow !== lastFirstTimeRef.current;
    const shrunkOrJumped =
      bars.length < lastBarsLenRef.current ||
      bars.length > lastBarsLenRef.current + 1;

    const shouldReset = symbolChanged || firstTimeChanged || shrunkOrJumped;

    if (shouldReset) {
      const data: CandlestickData<UTCTimestamp>[] = bars.map((b) => ({
        time: Math.floor(b.openTime / 1000) as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      candle.setData(data);
      vol.setData(
        bars.map((b) => ({
          time: Math.floor(b.openTime / 1000) as UTCTimestamp,
          value: b.volume,
          color: b.close >= b.open ? CANDLE_UP + "55" : CANDLE_DOWN + "55",
        }))
      );
      // Intentionally NOT calling fitContent() here. After any reset
      // (symbol/timeframe/range change), we start at cursor=0 which means
      // `bars` has exactly one candle; fitContent() on a single bar
      // stretches it across the entire chart width. The chart's default
      // barSpacing (~6px) is the right initial look — bars appear at
      // normal width on the right edge and the chart auto-scrolls as the
      // cursor advances.
    } else if (bars.length === lastBarsLenRef.current + 1) {
      const b = bars[bars.length - 1];
      candle.update({
        time: Math.floor(b.openTime / 1000) as UTCTimestamp,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      });
      vol.update({
        time: Math.floor(b.openTime / 1000) as UTCTimestamp,
        value: b.volume,
        color: b.close >= b.open ? CANDLE_UP + "55" : CANDLE_DOWN + "55",
      });
    }
    lastBarsLenRef.current = bars.length;
    lastSymbolRef.current = symbol;
    lastFirstTimeRef.current = firstTimeNow;
  }, [bars, symbol]);

  // ───── feed indicator data ─────
  // Recomputed on every bar advance + visibility toggle. setData is fine
  // since we usually only have hundreds-thousands of points and the chart
  // optimises internally.
  useEffect(() => {
    const series = indicatorSeriesRef.current;
    if (!series.vwap || !series.ema20 || !series.ema50) return;

    if (bars.length === 0) {
      for (const id of ALL_INDICATORS) {
        series[id]?.setData([]);
      }
      return;
    }

    if (indicators.vwap) {
      const data: LineData<UTCTimestamp>[] = computeVWAP(bars).map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
      }));
      series.vwap.setData(data);
      series.vwap.applyOptions({ visible: true });
    } else {
      series.vwap.applyOptions({ visible: false });
    }

    if (indicators.ema20) {
      const data: LineData<UTCTimestamp>[] = computeEMA(bars, 20).map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
      }));
      series.ema20.setData(data);
      series.ema20.applyOptions({ visible: true });
    } else {
      series.ema20.applyOptions({ visible: false });
    }

    if (indicators.ema50) {
      const data: LineData<UTCTimestamp>[] = computeEMA(bars, 50).map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
      }));
      series.ema50.setData(data);
      series.ema50.applyOptions({ visible: true });
    } else {
      series.ema50.applyOptions({ visible: false });
    }
  }, [bars, indicators]);

  // ───── price lines for positions + open orders ─────
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;
    for (const pl of priceLinesRef.current) {
      try {
        candle.removePriceLine(pl);
      } catch {
        /* noop */
      }
    }
    priceLinesRef.current = [];

    const palette = readPalette();

    for (const p of positions) {
      if (p.symbol !== symbol) continue;
      const color = p.side === "long" ? palette.accent : palette.purple;
      priceLinesRef.current.push(
        candle.createPriceLine({
          price: p.entryPx,
          color,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: `${p.side === "long" ? "L" : "S"} ${p.leverage}x`,
        })
      );
      priceLinesRef.current.push(
        candle.createPriceLine({
          price: p.liquidationPx,
          color: "#ef4444",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "liq",
        })
      );
    }

    for (const o of openOrders) {
      if (o.symbol !== symbol) continue;
      const color =
        o.type === "tp"
          ? palette.cyan
          : o.type === "sl"
            ? "#ef4444"
            : palette.muted;
      priceLinesRef.current.push(
        candle.createPriceLine({
          price: o.triggerPx,
          color,
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: o.type,
        })
      );
    }
  }, [positions, openOrders, symbol]);

  // ───── trade markers ─────
  useEffect(() => {
    const plugin = markersPluginRef.current;
    if (!plugin) return;
    const palette = readPalette();
    const markers: SeriesMarker<Time>[] = [];
    for (const t of closedTrades) {
      if (t.symbol !== symbol) continue;
      markers.push({
        time: Math.floor(t.openedAtMs / 1000) as UTCTimestamp,
        position: t.side === "long" ? "belowBar" : "aboveBar",
        color: t.side === "long" ? palette.accent : palette.purple,
        shape: t.side === "long" ? "arrowUp" : "arrowDown",
        text: `${t.side === "long" ? "L" : "S"}`,
      });
      markers.push({
        time: Math.floor(t.closedAtMs / 1000) as UTCTimestamp,
        position: t.side === "long" ? "aboveBar" : "belowBar",
        color: t.pnl >= 0 ? palette.accent : "#ef4444",
        shape: "circle",
        text: `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`,
      });
    }
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    plugin.setMarkers(markers);
  }, [closedTrades, symbol]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden"
    >
      {/* indicator toolbar */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1 text-[10px] font-mono">
        {ALL_INDICATORS.map((id) => {
          const meta = INDICATOR_META[id];
          const on = indicators[id];
          return (
            <button
              key={id}
              onClick={() => toggleIndicator(id)}
              title={`Toggle ${meta.label}`}
              className={`px-2 py-1 rounded border backdrop-blur-sm transition flex items-center gap-1.5 ${
                on
                  ? "border-[var(--border)] text-[var(--fg)] bg-[var(--bg)]/70"
                  : "border-[var(--border)] text-[var(--muted)] bg-[var(--bg)]/40 opacity-60 hover:opacity-100"
              }`}
            >
              <span
                className="inline-block w-2.5 h-[2px] rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" />
            </div>
            <p className="text-xs font-mono text-[var(--muted)]">{loadingQuote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
