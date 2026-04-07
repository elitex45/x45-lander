"use client";

import type { ReplayHook } from "../hooks/useReplayEngine";
import { selectMarkPnl } from "../lib/engine";
import { getSymbolMeta } from "../lib/symbols";

export function PositionsTable({ engine }: { engine: ReplayHook }) {
  const { state, close } = engine;
  const meta = getSymbolMeta(state.symbol);
  const pricePrec = meta?.pricePrecision ?? 2;
  const qtyPrec = meta?.qtyPrecision ?? 3;
  const positions = state.account.positions.filter((p) => p.symbol === state.symbol);

  return (
    <div className="glass-card p-4 text-xs font-mono">
      <div className="text-[var(--muted)] uppercase tracking-wider mb-2">
        positions ({positions.length})
      </div>
      {positions.length === 0 ? (
        <div className="text-[var(--muted)] opacity-60">no open positions</div>
      ) : (
        <div className="space-y-2">
          {positions.map((p) => {
            const pnl = selectMarkPnl(state, p);
            const pnlColor =
              pnl >= 0 ? "text-[var(--accent)]" : "text-[#ef4444]";
            return (
              <div
                key={p.id}
                className="border border-[var(--border)] rounded p-2 space-y-1"
              >
                <div className="flex justify-between">
                  <span
                    className={
                      p.side === "long"
                        ? "text-[var(--accent)]"
                        : "text-[var(--purple)]"
                    }
                  >
                    {p.side.toUpperCase()} {p.leverage}×
                  </span>
                  <button
                    onClick={() => close(p.id, 1)}
                    className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] uppercase"
                  >
                    close
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[10px] text-[var(--muted)]">
                  <span>size</span>
                  <span className="text-right text-[var(--fg)]">
                    {p.size.toFixed(qtyPrec)}
                  </span>
                  <span>entry</span>
                  <span className="text-right text-[var(--fg)]">
                    {p.entryPx.toFixed(pricePrec)}
                  </span>
                  <span>liq</span>
                  <span className="text-right text-[#ef4444]">
                    {p.liquidationPx.toFixed(pricePrec)}
                  </span>
                  <span>margin</span>
                  <span className="text-right text-[var(--fg)]">
                    {p.marginUsed.toFixed(2)}
                  </span>
                  <span>upnl</span>
                  <span className={`text-right ${pnlColor}`}>
                    {pnl >= 0 ? "+" : ""}
                    {pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
