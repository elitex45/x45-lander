"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickData,
  CandlestickSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  Time,
  UTCTimestamp,
  createChart,
  createSeriesMarkers,
  ISeriesMarkersPluginApi,
  SeriesMarker,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import type { Kline } from "../lib/kline";
import type { ClosedTrade, Order, Position } from "../lib/engine";

type Props = {
  bars: Kline[];          // already sliced to [0..cursor]
  positions: Position[];
  openOrders: Order[];
  closedTrades: ClosedTrade[];
  symbol: string;
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

export function ReplayChart({
  bars,
  positions,
  openOrders,
  closedTrades,
  symbol,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastBarsLenRef = useRef(0);
  const lastSymbolRef = useRef(symbol);

  const { resolvedTheme } = useTheme();

  // ───── mount chart once ─────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const palette = readPalette();
    const isDark = document.documentElement.classList.contains("dark");

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
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: palette.border,
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: palette.accent,
      downColor: isDark ? "#ef4444" : "#b91c1c",
      borderUpColor: palette.accent,
      borderDownColor: isDark ? "#ef4444" : "#b91c1c",
      wickUpColor: palette.accent,
      wickDownColor: isDark ? "#ef4444" : "#b91c1c",
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: palette.muted,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

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
    };
  }, []);

  // ───── re-apply colors when theme changes ─────
  useEffect(() => {
    const chart = chartRef.current;
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!chart || !candle || !vol) return;
    const palette = readPalette();
    const isDark = resolvedTheme === "dark";
    chart.applyOptions({
      layout: { textColor: palette.muted, background: { color: "transparent" } },
      grid: {
        vertLines: { color: palette.border },
        horzLines: { color: palette.border },
      },
      rightPriceScale: { borderColor: palette.border },
      timeScale: { borderColor: palette.border },
    });
    candle.applyOptions({
      upColor: palette.accent,
      downColor: isDark ? "#ef4444" : "#b91c1c",
      borderUpColor: palette.accent,
      borderDownColor: isDark ? "#ef4444" : "#b91c1c",
      wickUpColor: palette.accent,
      wickDownColor: isDark ? "#ef4444" : "#b91c1c",
    });
    vol.applyOptions({ color: palette.muted });
  }, [resolvedTheme]);

  // ───── feed bars: full reset on shrink/symbol change, incremental on growth ─────
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!candle || !vol) return;

    const isDark = document.documentElement.classList.contains("dark");
    const palette = readPalette();
    const downCol = isDark ? "#ef4444" : "#b91c1c";

    const symbolChanged = lastSymbolRef.current !== symbol;
    const shrunkOrJumped =
      bars.length < lastBarsLenRef.current ||
      bars.length > lastBarsLenRef.current + 1;

    if (symbolChanged || shrunkOrJumped) {
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
          color: b.close >= b.open ? palette.accent + "55" : downCol + "55",
        }))
      );
      if (symbolChanged) {
        chartRef.current?.timeScale().fitContent();
      }
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
        color: b.close >= b.open ? palette.accent + "55" : downCol + "55",
      });
    }
    lastBarsLenRef.current = bars.length;
    lastSymbolRef.current = symbol;
  }, [bars, symbol]);

  // ───── price lines for positions + open orders ─────
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;
    // tear down previous
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
    // Markers must be chronologically sorted.
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    plugin.setMarkers(markers);
  }, [closedTrades, symbol]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] rounded-xl overflow-hidden"
    />
  );
}
