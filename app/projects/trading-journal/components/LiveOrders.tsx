"use client";

import type { TradingEngine } from "../lib/engineTypes";

type Props = { engine: TradingEngine };

export function LiveOrders({ engine }: Props) {
  const { state, cancel } = engine;
  const orders = state.account.openOrders.filter(
    (o) => o.symbol === state.symbol
  );

  if (orders.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-2">
        &gt; open orders ({orders.length})
      </p>
      <div className="space-y-1.5">
        {orders.map((ord) => {
          // For TP/SL orders, show the parent position's side (not the
          // execution side which is the opposite). This is what traders expect.
          const isChildOrder = ord.reduceOnly && ord.parentPositionId;
          let displaySide = ord.side;
          if (isChildOrder) {
            const parent = state.account.positions.find(
              (p) => p.id === ord.parentPositionId
            );
            if (parent) displaySide = parent.side;
          }

          return (
            <div
              key={ord.id}
              className="flex items-center justify-between text-[9px] font-mono border border-[var(--border)] rounded-md px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`uppercase tracking-widest ${
                    ord.type === "tp"
                      ? "text-cyan-400"
                      : ord.type === "sl"
                        ? "text-red-400"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {ord.type}
                </span>
                <span
                  className={
                    displaySide === "long"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {displaySide}
                </span>
                <span className="text-[var(--fg)] tabular-nums">
                  {ord.size.toFixed(4)} @ ${ord.triggerPx.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => cancel(ord.id)}
                className="text-[var(--muted)] hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                cancel
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
