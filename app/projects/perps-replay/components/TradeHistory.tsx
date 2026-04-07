"use client";

import type { ReplayHook } from "../hooks/useReplayEngine";
import { getSymbolMeta } from "../lib/symbols";

export function TradeHistory({ engine }: { engine: ReplayHook }) {
  const { state } = engine;
  const meta = getSymbolMeta(state.symbol);
  const prec = meta?.pricePrecision ?? 2;
  const trades = state.account.closedTrades.filter(
    (t) => t.symbol === state.symbol
  );

  return (
    <div className="glass-card p-4 text-xs font-mono">
      <div className="text-[var(--muted)] uppercase tracking-wider mb-2">
        trade history ({trades.length})
      </div>
      {trades.length === 0 ? (
        <div className="text-[var(--muted)] opacity-60">no closed trades</div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {trades.map((t) => {
            const pnlColor =
              t.pnl >= 0 ? "text-[var(--accent)]" : "text-[#ef4444]";
            return (
              <div
                key={t.id}
                className="flex items-center justify-between border border-[var(--border)] rounded px-2 py-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      t.side === "long"
                        ? "text-[var(--accent)]"
                        : "text-[var(--purple)]"
                    }
                  >
                    {t.side}
                  </span>
                  <span className="text-[var(--muted)] uppercase text-[10px]">
                    {t.reason}
                  </span>
                  <span className="text-[var(--fg)]">
                    {t.entryPx.toFixed(prec)} → {t.exitPx.toFixed(prec)}
                  </span>
                </div>
                <span className={pnlColor}>
                  {t.pnl >= 0 ? "+" : ""}
                  {t.pnl.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
