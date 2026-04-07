"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useTheme } from "@/app/lib/theme";
import type { Kline } from "../lib/kline";
import type { ClosedTrade, Order, Position } from "../lib/engine";
import type { Drawing, DrawingPoint, DrawingTool } from "../lib/drawings";
import { newDrawingId } from "../lib/drawings";

type Props = {
  bars: Kline[]; // already sliced to [0..cursor]
  positions: Position[];
  openOrders: Order[];
  closedTrades: ClosedTrade[];
  symbol: string;
  loading: boolean;
  drawings: Drawing[];
  addDrawing: (d: Drawing) => void;
  clearDrawings: () => void;
  activeTool: DrawingTool;
  setActiveTool: (t: DrawingTool) => void;
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

// Drawing colors — also hard-coded for theme stability.
const DRAW_COLOR = "#facc15"; // amber

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
  drawings,
  addDrawing,
  clearDrawings,
  activeTool,
  setActiveTool,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastBarsLenRef = useRef(0);
  const lastSymbolRef = useRef(symbol);

  const { resolvedTheme } = useTheme();

  // Re-render counter bumped on every visible-range change so the SVG
  // overlay re-projects drawings without us tracking pixel coords manually.
  const [projectionTick, bumpProjection] = useState(0);

  // In-progress drawing draft (first click captured, second click pending).
  // Stored in DATA space (time/price) so it survives re-projection during
  // mouse move.
  const [draft, setDraft] = useState<{
    type: "trendline" | "rect";
    p1: DrawingPoint;
    p2: DrawingPoint;
  } | null>(null);

  // Funny loading quote — picked once per "loading became true" transition.
  const [loadingQuote, setLoadingQuote] = useState(LOADING_QUOTES[0]);
  useEffect(() => {
    if (!loading) return;
    // Re-roll the quote on each load transition. setState in effect is fine
    // here — we're reacting to an external boolean prop, not driving render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingQuote(
      LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]
    );
  }, [loading]);

  // ───── mount chart once ─────
  useEffect(() => {
    const el = chartContainerRef.current;
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

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;
    markersPluginRef.current = createSeriesMarkers(candle);

    // Re-project drawings on pan/zoom/resize.
    const ts = chart.timeScale();
    const onRangeChange = () => bumpProjection((x) => x + 1);
    ts.subscribeVisibleTimeRangeChange(onRangeChange);

    return () => {
      ts.unsubscribeVisibleTimeRangeChange(onRangeChange);
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
      markersPluginRef.current = null;
      priceLinesRef.current = [];
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

  // ───── feed bars: full reset on shrink/symbol change, incremental on growth ─────
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!candle || !vol) return;

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
          color: b.close >= b.open ? CANDLE_UP + "55" : CANDLE_DOWN + "55",
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
        color: b.close >= b.open ? CANDLE_UP + "55" : CANDLE_DOWN + "55",
      });
    }
    lastBarsLenRef.current = bars.length;
    lastSymbolRef.current = symbol;
  }, [bars, symbol]);

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

  // ───── drawing layer: pixel projection ─────
  // Drawings live in (time, price) space but the SVG needs (x, y) pixels.
  // We project inside an effect (not during render) so we can read the
  // lightweight-charts refs safely under the React 19 ref-access rules.
  // The effect re-runs on every projectionTick (chart pan/zoom/resize),
  // bars change, drawings change, and draft change.
  type Projected =
    | {
        id: string;
        kind: "trendline";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      }
    | { id: string; kind: "hline"; y: number }
    | {
        id: string;
        kind: "rect";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      };

  const [projected, setProjected] = useState<Projected[]>([]);

  useEffect(() => {
    const chart = chartRef.current;
    const candle = candleRef.current;
    if (!chart || !candle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjected([]);
      return;
    }
    const ts = chart.timeScale();

    const projectPoint = (pt: DrawingPoint) => {
      const x = ts.timeToCoordinate(pt.time as UTCTimestamp);
      const y = candle.priceToCoordinate(pt.price);
      if (x === null || y === null) return null;
      return { x, y };
    };

    const out: Projected[] = [];
    for (const d of drawings) {
      if (d.type === "trendline") {
        const a = projectPoint(d.p1);
        const b = projectPoint(d.p2);
        if (!a || !b) continue;
        out.push({ id: d.id, kind: "trendline", x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      } else if (d.type === "hline") {
        const y = candle.priceToCoordinate(d.price);
        if (y === null) continue;
        out.push({ id: d.id, kind: "hline", y });
      } else if (d.type === "rect") {
        const a = projectPoint(d.p1);
        const b = projectPoint(d.p2);
        if (!a || !b) continue;
        out.push({ id: d.id, kind: "rect", x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }

    if (draft) {
      const a = projectPoint(draft.p1);
      const b = projectPoint(draft.p2);
      if (a && b) {
        out.push({
          id: "__draft",
          kind: draft.type,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
        });
      }
    }

    setProjected(out);
  }, [drawings, draft, projectionTick, bars.length]);

  // Pointer → data conversion. Uses the wrapper's bounding rect because the
  // SVG covers exactly the same area.
  const pointerToData = (clientX: number, clientY: number): DrawingPoint | null => {
    const wrap = wrapperRef.current;
    const chart = chartRef.current;
    const candle = candleRef.current;
    if (!wrap || !chart || !candle) return null;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = candle.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time: time as number, price };
  };

  // ───── pointer handlers on the SVG overlay ─────
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === "none") return;
    const pt = pointerToData(e.clientX, e.clientY);
    if (!pt) return;

    if (activeTool === "hline") {
      addDrawing({ id: newDrawingId(), type: "hline", price: pt.price });
      setActiveTool("none");
      return;
    }

    if (activeTool === "trendline" || activeTool === "rect") {
      if (!draft) {
        setDraft({ type: activeTool, p1: pt, p2: pt });
      } else {
        addDrawing(
          activeTool === "trendline"
            ? { id: newDrawingId(), type: "trendline", p1: draft.p1, p2: pt }
            : { id: newDrawingId(), type: "rect", p1: draft.p1, p2: pt }
        );
        setDraft(null);
        setActiveTool("none");
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draft) return;
    const pt = pointerToData(e.clientX, e.clientY);
    if (!pt) return;
    setDraft({ ...draft, p2: pt });
  };

  const onKeyEsc = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDraft(null);
      setActiveTool("none");
    }
  };

  const drawingActive = activeTool !== "none";

  // Reset draft when switching tools.
  useEffect(() => {
    if (activeTool !== "none") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(null);
  }, [activeTool]);

  const tools = useMemo(
    () =>
      [
        { id: "none", label: "select", title: "Crosshair / no draw" },
        { id: "trendline", label: "line", title: "Trend line — click two points" },
        { id: "hline", label: "h-line", title: "Horizontal line — click once" },
        { id: "rect", label: "rect", title: "Rectangle — click two corners" },
      ] as const,
    []
  );

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden"
      onKeyDown={onKeyEsc}
      tabIndex={-1}
    >
      {/* chart canvas mounts here */}
      <div ref={chartContainerRef} className="absolute inset-0" />

      {/* drawing toolbar */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1 text-[10px] font-mono">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id as DrawingTool)}
            title={t.title}
            className={`px-2 py-1 rounded border backdrop-blur-sm transition ${
              activeTool === t.id
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]"
                : "border-[var(--border)] text-[var(--muted)] bg-[var(--bg)]/60 hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            {t.label}
          </button>
        ))}
        {drawings.length > 0 && (
          <button
            onClick={() => {
              if (confirm(`Clear ${drawings.length} drawing${drawings.length === 1 ? "" : "s"}?`))
                clearDrawings();
            }}
            title="Clear all drawings"
            className="px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] bg-[var(--bg)]/60 hover:border-[#ef4444] hover:text-[#ef4444] transition"
          >
            clear ({drawings.length})
          </button>
        )}
      </div>

      {/* SVG drawing overlay — pointer-events only when a tool is active */}
      <svg
        className="absolute inset-0 z-10"
        style={{
          pointerEvents: drawingActive ? "auto" : "none",
          cursor: drawingActive ? "crosshair" : "default",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {projected.map((p) => {
          const isDraft = p.id === "__draft";
          const stroke = isDraft ? DRAW_COLOR : DRAW_COLOR;
          const opacity = isDraft ? 0.6 : 1;
          if (p.kind === "trendline") {
            return (
              <line
                key={p.id}
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={stroke}
                strokeWidth={1.5}
                opacity={opacity}
                strokeDasharray={isDraft ? "4 3" : undefined}
              />
            );
          }
          if (p.kind === "hline") {
            return (
              <line
                key={p.id}
                x1={0}
                y1={p.y}
                x2="100%"
                y2={p.y}
                stroke={stroke}
                strokeWidth={1}
                opacity={opacity}
                strokeDasharray="2 4"
              />
            );
          }
          // rect
          const x = Math.min(p.x1, p.x2);
          const y = Math.min(p.y1, p.y2);
          const w = Math.abs(p.x2 - p.x1);
          const h = Math.abs(p.y2 - p.y1);
          return (
            <rect
              key={p.id}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={DRAW_COLOR}
              fillOpacity={isDraft ? 0.08 : 0.12}
              stroke={stroke}
              strokeWidth={1}
              opacity={opacity}
              strokeDasharray={isDraft ? "4 3" : undefined}
            />
          );
        })}
      </svg>

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
