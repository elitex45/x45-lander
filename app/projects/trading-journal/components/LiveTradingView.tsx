"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { JournalSettings } from "../lib/types";
import type { ClosedTrade, LiveInterval, Kline } from "../lib/liveEngine";
import { LIVE_SYMBOLS, LIVE_INTERVALS, getSymbolMeta } from "../lib/liveEngine";
import { useEngine } from "../hooks/useEngine";
import { useBinanceStream } from "../hooks/useBinanceStream";
import { useBinanceDepth } from "../hooks/useBinanceDepth";
import { LiveChart, type PlacementMode } from "./LiveChart";
import { LiveOrderTicket } from "./LiveOrderTicket";
import { LivePositions } from "./LivePositions";
import { LiveOrders } from "./LiveOrders";
import { LiveAccountStats } from "./LiveAccountStats";
import { LiveTradeHistory } from "./LiveTradeHistory";
import { RegimeBadge } from "./RegimeBadge";
import { OrderBook } from "./OrderBook";

type Props = {
  onTradeClose: (trade: ClosedTrade) => void;
  settings: JournalSettings;
};

export function LiveTradingView({ onTradeClose, settings }: Props) {
  const engine = useEngine("BTCUSDT", "5m", settings.defaultBalance);
  const { state, switchPair, loadBars, barUpdate } = engine;
  const [symbol, setSymbol] = useState(state.symbol);
  const [interval, setInterval] = useState<LiveInterval>(state.interval as LiveInterval);

  const [placementMode, setPlacementMode] = useState<PlacementMode>("none");
  const [tpPrice, setTpPrice] = useState<number | null>(null);
  const [slPrice, setSlPrice] = useState<number | null>(null);
  const [showRegime, setShowRegime] = useState(true);
  const [showOrderBook, setShowOrderBook] = useState(false);

  const depth = useBinanceDepth(symbol, showOrderBook);
  const meta = getSymbolMeta(symbol);
  const mark = engine.selectAccountStats().mark;

  useEffect(() => { engine.setOnNewTrade(onTradeClose); }, [engine, onTradeClose]);

  // Clear draft TP/SL lines when:
  // 1. A new trade closes (TP/SL hit by engine)
  // 2. Position count drops to zero while draft lines exist
  const closedCount = state.account.closedTrades.length;
  const prevClosedCount = useRef(closedCount);
  const posCount = state.account.positions.filter((p) => p.symbol === state.symbol).length;
  const prevPosCount = useRef(posCount);

  useEffect(() => {
    const newClose = closedCount > prevClosedCount.current;
    const posDropped = prevPosCount.current > 0 && posCount === 0;
    prevClosedCount.current = closedCount;
    prevPosCount.current = posCount;

    if (newClose || posDropped) {
      setTpPrice(null);
      setSlPrice(null);
      setPlacementMode("none");
    }
  }, [closedCount, posCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire Binance stream to engine
  const onBar = useCallback((kline: Kline, isClosed: boolean) => {
    barUpdate(kline, isClosed);
  }, [barUpdate]);
  const onHistoryLoaded = useCallback((bars: Kline[]) => {
    loadBars(bars);
  }, [loadBars]);
  const onConnectionChange = useCallback(() => {}, []);

  const { connected } = useBinanceStream(symbol, interval, true, {
    onBar, onHistoryLoaded, onConnectionChange,
  });

  const handleSymbolChange = useCallback((s: string) => {
    setSymbol(s); switchPair(s, interval);
    setTpPrice(null); setSlPrice(null); setPlacementMode("none");
  }, [interval, switchPair]);

  const handleIntervalChange = useCallback((iv: LiveInterval) => {
    setInterval(iv); switchPair(symbol, iv);
  }, [symbol, switchPair]);

  const roundToTick = useCallback((price: number) => {
    const prec = meta?.pricePrecision ?? 2;
    const factor = Math.pow(10, prec);
    return Math.round(price * factor) / factor;
  }, [meta]);

  const handleChartClick = useCallback((price: number) => {
    const r = roundToTick(price);
    if (placementMode === "tp") { setTpPrice(r); setPlacementMode("none"); }
    else if (placementMode === "sl") { setSlPrice(r); setPlacementMode("none"); }
  }, [placementMode, roundToTick]);

  const handleTpDrag = useCallback((p: number | null) => setTpPrice(p !== null ? roundToTick(p) : null), [roundToTick]);
  const handleSlDrag = useCallback((p: number | null) => setSlPrice(p !== null ? roundToTick(p) : null), [roundToTick]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={symbol} onChange={(e) => handleSymbolChange(e.target.value)} className="input-field text-xs py-1.5 w-32">
          {LIVE_SYMBOLS.map((s) => <option key={s.symbol} value={s.symbol}>{s.display}</option>)}
        </select>
        <div className="flex gap-1">
          {LIVE_INTERVALS.map((iv) => (
            <button key={iv} onClick={() => handleIntervalChange(iv)}
              className={`px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest rounded-md border transition-all ${interval === iv ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)]"}`}>
              {iv}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {[
            { key: "book", label: "Book", active: showOrderBook, toggle: () => setShowOrderBook((v) => !v), color: "#22c55e" },
            { key: "regime", label: "Regime", active: showRegime, toggle: () => setShowRegime((v) => !v), color: "#06b6d4" },
          ].map((ind) => (
            <button key={ind.key} onClick={ind.toggle}
              className={`px-2 py-1 text-[8px] font-mono uppercase tracking-widest rounded-md border transition-all ${ind.active ? "border-current text-current" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)]"}`}
              style={ind.active ? { color: ind.color, borderColor: ind.color } : undefined}>
              {ind.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-[9px] font-mono text-[var(--muted)]">{connected ? "LIVE" : "..."}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex gap-2">
            {showOrderBook && (
              <div className="w-52 flex-shrink-0 hidden md:block" style={{ maxHeight: 480 }}>
                <OrderBook depth={depth} pricePrecision={meta?.pricePrecision ?? 2} mark={mark} bars={state.bars} />
              </div>
            )}
            <div className="flex-1 min-w-0 glass-card p-2 overflow-hidden">
              <LiveChart bars={state.bars} positions={state.account.positions} openOrders={state.account.openOrders}
                symbol={state.symbol} connected={connected} placementMode={placementMode}
                tpPrice={tpPrice} slPrice={slPrice} onChartClick={handleChartClick}
                onTpDrag={handleTpDrag} onSlDrag={handleSlDrag} />
            </div>
          </div>
          {showOrderBook && (
            <div className="md:hidden">
              <OrderBook depth={depth} pricePrecision={meta?.pricePrecision ?? 2} mark={mark} bars={state.bars} />
            </div>
          )}
          <div className="hidden lg:block mt-2"><LiveTradeHistory engine={engine} /></div>
        </div>
        <div className="space-y-3 min-w-0">
          {showRegime && state.bars.length > 50 && <RegimeBadge bars={state.bars} />}
          <LiveOrderTicket engine={engine} tpPrice={tpPrice} slPrice={slPrice}
            placementMode={placementMode} onSetPlacementMode={setPlacementMode}
            onSetTp={setTpPrice} onSetSl={setSlPrice} defaultLeverage={settings.defaultLeverage} />
          <LivePositions engine={engine} />
          <LiveOrders engine={engine} />
          <LiveAccountStats engine={engine} />
          <div className="lg:hidden"><LiveTradeHistory engine={engine} /></div>
        </div>
      </div>
    </div>
  );
}
