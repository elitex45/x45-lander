"use client";

import type { TradingEngine } from "../lib/engineTypes";
import { TAKER_FEE } from "../lib/liveEngine";

type Props = { engine: TradingEngine };

export function LivePositions({ engine }: Props) {
  const { state, close, selectMarkPnl } = engine;
  const mark = engine.selectAccountStats().mark;
  const positions = state.account.positions.filter(
    (p) => p.symbol === state.symbol
  );

  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-2">
        &gt; positions ({positions.length})
      </p>
      {positions.length === 0 ? (
        <p className="text-[10px] font-mono text-[var(--muted)]">no open positions</p>
      ) : (
        <div className="space-y-2">
          {positions.map((pos) => {
            const rawPnl = selectMarkPnl(pos);
            // Estimate what you'd get if you closed now
            const exitNotional = mark * pos.size;
            const exitFee = exitNotional * TAKER_FEE;
            const netPnl = rawPnl - exitFee - pos.fundingPaid;
            const netPnlPct = (netPnl / pos.marginUsed) * 100;
            const totalFeesAccum = pos.entryFee + exitFee + pos.fundingPaid;
            return (
              <div key={pos.id} className="border border-[var(--border)] rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                        pos.side === "long"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      {pos.side} {pos.leverage}x
                    </span>
                  </div>
                  <button
                    onClick={() => close(pos.id)}
                    className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-red-400 hover:border-red-500 transition-colors"
                  >
                    close
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div>
                    <span className="text-[var(--muted)]">size </span>
                    <span className="text-[var(--fg)] tabular-nums">{pos.size.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">entry </span>
                    <span className="text-[var(--fg)] tabular-nums">${pos.entryPx.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">liq </span>
                    <span className="text-red-400 tabular-nums">${pos.liquidationPx.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">margin </span>
                    <span className="text-[var(--fg)] tabular-nums">${pos.marginUsed.toFixed(2)}</span>
                  </div>
                </div>
                {/* PnL breakdown */}
                <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-1 text-[8px] font-mono">
                  <div>
                    <span className="text-[var(--muted)]">raw pnl </span>
                    <span className={`tabular-nums ${rawPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {rawPnl >= 0 ? "+" : ""}${rawPnl.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">fees </span>
                    <span className="text-red-400 tabular-nums">-${totalFeesAccum.toFixed(2)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[var(--muted)]">net if closed now </span>
                    <span className={`tabular-nums font-bold ${netPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)} ({netPnlPct >= 0 ? "+" : ""}{netPnlPct.toFixed(1)}%)
                    </span>
                  </div>
                  {pos.fundingPaid > 0 && (
                    <div className="col-span-2">
                      <span className="text-[var(--muted)]">funding </span>
                      <span className="text-red-400 tabular-nums">-${pos.fundingPaid.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
