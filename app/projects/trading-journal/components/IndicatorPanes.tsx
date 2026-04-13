"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  ColorType,
  LineStyle,
} from "lightweight-charts";
import type { Kline } from "../lib/liveEngine";
import { computeRSI, computeADXSeries, type IndicatorPoint } from "../lib/indicators";

type Level = { value: number; color: string; label?: string };

type PaneProps = {
  data: IndicatorPoint[];
  color: string;
  height: number;
  label: string;
  levels: Level[];
};

function IndicatorPane({ data, color, height, label, levels }: PaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lastLenRef = useRef(0);
  const lastFirstTimeRef = useRef(0);
  const initedRef = useRef(false);

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#555",
        fontFamily: "'Geist Mono', monospace",
        fontSize: 9,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.02)" },
        horzLines: { color: "rgba(255,255,255,0.02)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.05)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        visible: false,
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { color: "rgba(255,255,255,0.1)", width: 1 },
      },
    });

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // Add level lines
    for (const lvl of levels) {
      series.createPriceLine({
        price: lvl.value,
        color: lvl.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: lvl.label ?? "",
      });
    }

    chartRef.current = chart;
    seriesRef.current = series;
    lastLenRef.current = 0;
    initedRef.current = true;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      initedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount once only — color/height/levels are stable for each instance

  // Update data
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !initedRef.current || data.length === 0) return;

    const lineData: LineData[] = data.map((d) => ({
      time: d.time as LineData["time"],
      value: d.value,
    }));

    const firstTime = lineData.length > 0 ? (lineData[0].time as number) : 0;
    const timeChanged = firstTime !== lastFirstTimeRef.current;
    lastFirstTimeRef.current = firstTime;

    if (timeChanged || data.length < lastLenRef.current || lastLenRef.current === 0) {
      // Full reset on timeframe change or first load
      series.setData(lineData);
    } else {
      // Incremental — update the last point (current candle) + any new points
      const startIdx = Math.max(0, lastLenRef.current - 1);
      for (let i = startIdx; i < lineData.length; i++) {
        series.update(lineData[i]);
      }
    }
    lastLenRef.current = data.length;
  }, [data]);

  return (
    <div className="relative glass-card p-1 overflow-hidden">
      <span className="absolute top-2 left-3 text-[8px] font-mono uppercase tracking-widest text-[var(--muted)] z-10">
        {label}
      </span>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

// Stable level arrays — defined outside component to avoid re-creation
const RSI_LEVELS: Level[] = [
  { value: 70, color: "rgba(239,68,68,0.3)", label: "70" },
  { value: 30, color: "rgba(34,197,94,0.3)", label: "30" },
  { value: 50, color: "rgba(255,255,255,0.1)" },
];

const ADX_LEVELS: Level[] = [
  { value: 25, color: "rgba(139,92,246,0.3)", label: "25" },
  { value: 20, color: "rgba(255,255,255,0.1)", label: "20" },
];

type Props = {
  bars: Kline[];
  showRSI: boolean;
  showADX: boolean;
};

export function IndicatorPanes({ bars, showRSI, showADX }: Props) {
  const rsiData = useMemo(() => (showRSI ? computeRSI(bars) : []), [bars, showRSI]);
  const adxData = useMemo(() => (showADX ? computeADXSeries(bars) : []), [bars, showADX]);

  if (!showRSI && !showADX) return null;

  return (
    <div className="space-y-1">
      {showRSI && (
        <IndicatorPane
          data={rsiData}
          color="#f59e0b"
          height={80}
          label="RSI (14)"
          levels={RSI_LEVELS}
        />
      )}
      {showADX && (
        <IndicatorPane
          data={adxData}
          color="#8b5cf6"
          height={80}
          label="ADX (14)"
          levels={ADX_LEVELS}
        />
      )}
    </div>
  );
}
