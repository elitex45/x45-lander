"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { JournalSettings } from "../lib/types";
import type { ClosedTrade } from "../lib/liveEngine";
import { getSymbolMeta } from "../lib/liveEngine";
import { useReplayEngine } from "../hooks/useReplayEngine";
import { LiveChart, type PlacementMode } from "./LiveChart";
import { LiveOrderTicket } from "./LiveOrderTicket";
import { LivePositions } from "./LivePositions";
import { LiveOrders } from "./LiveOrders";
import { LiveAccountStats } from "./LiveAccountStats";
import { LiveTradeHistory } from "./LiveTradeHistory";
import { RegimeBadge } from "./RegimeBadge";
import { ReplayControls } from "./ReplayControls";

type Props = {
  onTradeClose: (trade: ClosedTrade) => void;
  settings: JournalSettings;
};

export function ReplayTradingView({ onTradeClose, settings }: Props) {
  const engine = useReplayEngine(settings.defaultBalance);
  const { state, visibleBars, loading } = engine;

  const [placementMode, setPlacementMode] = useState<PlacementMode>("none");
  const [tpPrice, setTpPrice] = useState<number | null>(null);
  const [slPrice, setSlPrice] = useState<number | null>(null);
  const [showRegime, setShowRegime] = useState(true);

  const meta = getSymbolMeta(state.symbol);

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
      {/* Replay controls — matches perps-replay UI */}
      <ReplayControls engine={engine} />

      {/* Toggles */}
      <div className="flex gap-1">
        <button
          onClick={() => setShowRegime((v) => !v)}
          className={`px-2 py-1 text-[8px] font-mono uppercase tracking-widest rounded-md border transition-all ${
            showRegime ? "border-[#06b6d4] text-[#06b6d4]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)]"
          }`}
        >
          Regime
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        <div className="space-y-1 min-w-0">
          <div className="glass-card p-2 overflow-hidden">
            <LiveChart
              bars={visibleBars}
              positions={state.account.positions}
              openOrders={state.account.openOrders}
              symbol={state.symbol}
              connected={!loading && visibleBars.length > 0}
              placementMode={placementMode}
              tpPrice={tpPrice}
              slPrice={slPrice}
              onChartClick={handleChartClick}
              onTpDrag={handleTpDrag}
              onSlDrag={handleSlDrag}
            />
          </div>
          <div className="hidden lg:block mt-2">
            <LiveTradeHistory engine={engine} />
          </div>
        </div>

        <div className="space-y-3 min-w-0">
          {showRegime && visibleBars.length > 50 && (
            <RegimeBadge bars={visibleBars} />
          )}
          <LiveOrderTicket
            engine={engine}
            tpPrice={tpPrice}
            slPrice={slPrice}
            placementMode={placementMode}
            onSetPlacementMode={setPlacementMode}
            onSetTp={setTpPrice}
            onSetSl={setSlPrice}
            defaultLeverage={settings.defaultLeverage}
          />
          <LivePositions engine={engine} />
          <LiveOrders engine={engine} />
          <LiveAccountStats engine={engine} />
          <div className="lg:hidden">
            <LiveTradeHistory engine={engine} />
          </div>
        </div>
      </div>
    </div>
  );
}
