"use client";

import type { ReplayHook } from "../hooks/useReplayEngine";
import { getSymbolMeta } from "../lib/symbols";

export function OpenOrdersTable({ engine }: { engine: ReplayHook }) {
  const { state, cancel } = engine;
  const meta = getSymbolMeta(state.symbol);
  const prec = meta?.pricePrecision ?? 2;
  const qtyPrec = meta?.qtyPrecision ?? 3;
  const orders = state.account.openOrders.filter((o) => o.symbol === state.symbol);

  return (
    <div className="glass-card p-4 text-xs font-mono">
      <div className="text-[var(--muted)] uppercase tracking-wider mb-2">
        open orders ({orders.length})
      </div>
      {orders.length === 0 ? (
        <div className="text-[var(--muted)] opacity-60">no open orders</div>
      ) : (
        <div className="space-y-1">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between border border-[var(--border)] rounded px-2 py-1"
            >
              <div className="flex items-center gap-2">
                <span className="uppercase text-[var(--muted)]">{o.type}</span>
                <span
                  className={
                    o.side === "long"
                      ? "text-[var(--accent)]"
                      : "text-[var(--purple)]"
                  }
                >
                  {o.side}
                </span>
                <span className="text-[var(--fg)]">
                  {o.size.toFixed(qtyPrec)} @ {o.triggerPx.toFixed(prec)}
                </span>
              </div>
              <button
                onClick={() => cancel(o.id)}
                className="text-[10px] text-[var(--muted)] hover:text-[#ef4444] uppercase"
              >
                cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
