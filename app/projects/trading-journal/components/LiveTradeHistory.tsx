"use client";

import type { TradingEngine } from "../lib/engineTypes";

type Props = { engine: TradingEngine };

export function LiveTradeHistory({ engine }: Props) {
  const trades = engine.state.account.closedTrades;

  if (trades.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-2">
        &gt; recent trades ({trades.length})
      </p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {trades.slice(0, 20).map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between text-[9px] font-mono border-b border-[var(--border)] py-1.5 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  t.side === "long" ? "text-emerald-400" : "text-red-400"
                }
              >
                {t.side.toUpperCase()}
              </span>
              <span className="text-[var(--muted)]">
                ${t.entryPx.toFixed(2)} → ${t.exitPx.toFixed(2)}
              </span>
              <span className="text-[var(--muted)] uppercase">{t.reason}</span>
            </div>
            <span
              className={`tabular-nums font-bold ${
                t.pnl >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
