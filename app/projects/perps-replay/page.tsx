"use client";

import { useMemo } from "react";
import { useReplayEngine } from "./hooks/useReplayEngine";
import { ReplayChart } from "./components/ReplayChart";
import { ReplayControls } from "./components/ReplayControls";
import { OrderTicket } from "./components/OrderTicket";
import { AccountStats } from "./components/AccountStats";
import { PositionsTable } from "./components/PositionsTable";
import { OpenOrdersTable } from "./components/OpenOrdersTable";
import { TradeHistory } from "./components/TradeHistory";
import { EquityCurve } from "./components/EquityCurve";

export default function PerpsReplayPage() {
  const engine = useReplayEngine("BTCUSDT", "1h");
  const { state } = engine;

  // Slice bars to current cursor — the chart never sees the future.
  const visibleBars = useMemo(
    () => (state.bars.length === 0 ? [] : state.bars.slice(0, state.cursor + 1)),
    [state.bars, state.cursor]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
      <header className="mb-6 mt-2">
        <p className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase mb-2">
          &gt; ./projects/perps-replay
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fg)]">
          Perps Replay
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
          Pick a pair, scrub through history, place real orders against past
          price action. Everything stays in your browser.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* LEFT — chart + controls */}
        <div className="space-y-4 min-w-0">
          <div className="glass-card p-2 h-[480px]">
            <ReplayChart
              bars={visibleBars}
              positions={state.account.positions}
              openOrders={state.account.openOrders}
              closedTrades={state.account.closedTrades}
              symbol={state.symbol}
            />
          </div>
          <ReplayControls engine={engine} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PositionsTable engine={engine} />
            <OpenOrdersTable engine={engine} />
          </div>
          <TradeHistory engine={engine} />
        </div>

        {/* RIGHT — order ticket + account */}
        <div className="space-y-4">
          <AccountStats engine={engine} />
          <EquityCurve engine={engine} />
          <OrderTicket engine={engine} />
        </div>
      </div>
    </div>
  );
}
