"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type IPriceLine,
  ColorType,
  LineStyle,
} from "lightweight-charts";
import type { Kline, Position, Order } from "../lib/liveEngine";

export type PlacementMode = "none" | "tp" | "sl";

type Props = {
  bars: Kline[];
  positions: Position[];
  openOrders: Order[];
  symbol: string;
  connected: boolean;
  placementMode: PlacementMode;
  tpPrice: number | null;
  slPrice: number | null;
  onChartClick: (price: number) => void;
  onTpDrag: (price: number | null) => void;
  onSlDrag: (price: number | null) => void;
};

function barToCandle(b: Kline): CandlestickData {
  return {
    time: (b.openTime / 1000) as CandlestickData["time"],
    open: b.open, high: b.high, low: b.low, close: b.close,
  };
}

function barToVolume(b: Kline): HistogramData {
  return {
    time: (b.openTime / 1000) as HistogramData["time"],
    value: b.volume,
    color: b.close >= b.open ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
  };
}

export function LiveChart({
  bars, positions, openOrders, symbol, connected,
  placementMode, tpPrice, slPrice,
  onChartClick, onTpDrag, onSlDrag,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const previewLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const lastBarsLenRef = useRef(0);
  const lastSymbolRef = useRef(symbol);
  const lastFirstTimeRef = useRef(0);

  const placementModeRef = useRef(placementMode);
  placementModeRef.current = placementMode;
  const onChartClickRef = useRef(onChartClick);
  onChartClickRef.current = onChartClick;
  const onTpDragRef = useRef(onTpDrag);
  onTpDragRef.current = onTpDrag;
  const onSlDragRef = useRef(onSlDrag);
  onSlDragRef.current = onSlDrag;
  const tpPriceRef = useRef(tpPrice);
  tpPriceRef.current = tpPrice;
  const slPriceRef = useRef(slPrice);
  slPriceRef.current = slPrice;

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#888",
        fontFamily: "'Geist Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.1)", width: 1 },
        horzLine: { color: "rgba(255,255,255,0.1)", width: 1 },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.05)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.05)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    // --- Crosshair move: preview line in placement mode ---
    chart.subscribeCrosshairMove((param) => {
      if (placementModeRef.current === "none") {
        if (previewLineRef.current) {
          try { candle.removePriceLine(previewLineRef.current); } catch { /* */ }
          previewLineRef.current = null;
        }
        return;
      }

      const point = param.point;
      if (!point) return;
      const p = candle.coordinateToPrice(point.y);
      if (p === null || p <= 0) return;

      const isTP = placementModeRef.current === "tp";
      const color = isTP ? "#06b6d4" : "#ef4444";
      const title = isTP ? "TP (click to set)" : "SL (click to set)";

      if (previewLineRef.current) {
        previewLineRef.current.applyOptions({ price: p, color, title });
      } else {
        previewLineRef.current = candle.createPriceLine({
          price: p, color, lineWidth: 1, lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true, title,
        });
      }
    });

    // --- Click: set TP/SL in placement mode ---
    // lightweight-charts' subscribeClick only fires on actual clicks,
    // NOT on drag-to-pan — so this won't interfere with chart navigation.
    chart.subscribeClick((param) => {
      if (placementModeRef.current === "none") return;
      const point = param.point;
      if (!point) return;
      const p = candle.coordinateToPrice(point.y);
      if (p === null || p <= 0) return;
      onChartClickRef.current(p);
    });

    // --- Double-click on chart: remove TP or SL if near a line ---
    function onDblClick(e: MouseEvent) {
      const rect = container.getBoundingClientRect();
      const localY = e.clientY - rect.top;
      const threshold = 12;

      if (tpPriceRef.current !== null) {
        const tpY = candle.priceToCoordinate(tpPriceRef.current);
        if (tpY !== null && Math.abs(localY - tpY) < threshold) {
          e.preventDefault();
          onTpDragRef.current(null);
          return;
        }
      }
      if (slPriceRef.current !== null) {
        const slY = candle.priceToCoordinate(slPriceRef.current);
        if (slY !== null && Math.abs(localY - slY) < threshold) {
          e.preventDefault();
          onSlDragRef.current(null);
          return;
        }
      }
    }

    container.addEventListener("dblclick", onDblClick);

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(container);

    return () => {
      container.removeEventListener("dblclick", onDblClick);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, []);

  // Update bar data
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!candle || !vol || bars.length === 0) return;

    const symbolChanged = lastSymbolRef.current !== symbol;
    const firstTimeChanged = bars[0].openTime !== lastFirstTimeRef.current;
    lastSymbolRef.current = symbol;
    lastFirstTimeRef.current = bars[0].openTime;

    const prevLen = lastBarsLenRef.current;
    const bigJump = bars.length - prevLen > 10;
    if (symbolChanged || firstTimeChanged || bars.length < prevLen || bigJump) {
      candle.setData(bars.map(barToCandle));
      vol.setData(bars.map(barToVolume));
      chartRef.current?.timeScale().fitContent();
    } else if (bars.length === prevLen) {
      const last = bars[bars.length - 1];
      candle.update(barToCandle(last));
      vol.update(barToVolume(last));
    } else {
      const newBars = bars.slice(prevLen);
      for (const b of newBars) {
        candle.update(barToCandle(b));
        vol.update(barToVolume(b));
      }
    }
    lastBarsLenRef.current = bars.length;
  }, [bars, symbol]);

  // Price lines for positions and orders
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;

    for (const line of priceLinesRef.current) {
      try { candle.removePriceLine(line); } catch { /* */ }
    }
    priceLinesRef.current = [];

    for (const pos of positions) {
      if (pos.symbol !== symbol) continue;
      priceLinesRef.current.push(
        candle.createPriceLine({
          price: pos.entryPx,
          color: pos.side === "long" ? "#22c55e" : "#a855f7",
          lineWidth: 2, lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${pos.side.toUpperCase()} ${pos.leverage}x`,
        })
      );
      priceLinesRef.current.push(
        candle.createPriceLine({
          price: pos.liquidationPx,
          color: "#ef4444", lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: true, title: "LIQ",
        })
      );
    }

    for (const ord of openOrders) {
      if (ord.symbol !== symbol) continue;
      const color = ord.type === "tp" ? "#06b6d4" : ord.type === "sl" ? "#ef4444" : "#888";
      const label = ord.type === "tp" ? "TP" : ord.type === "sl" ? "SL" : ord.type.toUpperCase();
      priceLinesRef.current.push(
        candle.createPriceLine({
          price: ord.triggerPx, color, lineWidth: 1,
          lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: label,
        })
      );
    }
  }, [positions, openOrders, symbol]);

  // TP/SL draft lines (before order is placed)
  useEffect(() => {
    const candle = candleRef.current;
    if (!candle) return;

    if (tpLineRef.current) {
      try { candle.removePriceLine(tpLineRef.current); } catch { /* */ }
      tpLineRef.current = null;
    }
    if (tpPrice !== null && tpPrice > 0) {
      tpLineRef.current = candle.createPriceLine({
        price: tpPrice, color: "#06b6d4", lineWidth: 2,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true,
        title: `TP $${tpPrice.toFixed(2)}`,
      });
    }

    if (slLineRef.current) {
      try { candle.removePriceLine(slLineRef.current); } catch { /* */ }
      slLineRef.current = null;
    }
    if (slPrice !== null && slPrice > 0) {
      slLineRef.current = candle.createPriceLine({
        price: slPrice, color: "#ef4444", lineWidth: 2,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true,
        title: `SL $${slPrice.toFixed(2)}`,
      });
    }
  }, [tpPrice, slPrice]);

  // Clean up preview line when placement mode ends
  useEffect(() => {
    if (placementMode === "none" && previewLineRef.current && candleRef.current) {
      try { candleRef.current.removePriceLine(previewLineRef.current); } catch { /* */ }
      previewLineRef.current = null;
    }
  }, [placementMode]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ cursor: placementMode !== "none" ? "crosshair" : undefined }}
      />
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {placementMode !== "none" && (
          <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border"
            style={{
              color: placementMode === "tp" ? "#06b6d4" : "#ef4444",
              borderColor: placementMode === "tp" ? "#06b6d4" : "#ef4444",
              backgroundColor: placementMode === "tp" ? "rgba(6,182,212,0.15)" : "rgba(239,68,68,0.15)",
            }}
          >
            Click to set {placementMode.toUpperCase()}
          </span>
        )}
        {(tpPrice || slPrice) && placementMode === "none" && (
          <span className="text-[8px] font-mono text-[var(--muted)]">
            dbl-click line to remove
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-[9px] font-mono text-[var(--muted)]">
            {connected ? "LIVE" : "DISCONNECTED"}
          </span>
        </div>
      </div>
      {bars.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs font-mono text-[var(--muted)]">Loading bars...</p>
        </div>
      )}
    </div>
  );
}
