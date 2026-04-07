"use client";

import { useMemo } from "react";
import type { ReplayHook } from "../hooks/useReplayEngine";
import { selectAccountStats } from "../lib/engine";

export function AccountStats({ engine }: { engine: ReplayHook }) {
  const { state, resetAccount } = engine;
  const stats = useMemo(() => selectAccountStats(state), [state]);
  const pnlTotal = stats.equity - state.account.startingBalance;
  const pnlPct = (pnlTotal / state.account.startingBalance) * 100;
  const pnlColor = pnlTotal >= 0 ? "text-[var(--accent)]" : "text-[#ef4444]";

  return (
    <div className="glass-card p-4 text-xs font-mono space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[var(--muted)] uppercase tracking-wider">account</span>
        <button
          onClick={() => {
            if (confirm("Reset account? All positions, orders, and history will be wiped."))
              resetAccount();
          }}
          className="text-[10px] text-[var(--muted)] hover:text-[#ef4444] transition uppercase"
        >
          reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-y-1">
        <span className="text-[var(--muted)]">equity</span>
        <span className="text-right text-[var(--fg)]">{stats.equity.toFixed(2)}</span>

        <span className="text-[var(--muted)]">balance</span>
        <span className="text-right text-[var(--fg)]">{stats.balance.toFixed(2)}</span>

        <span className="text-[var(--muted)]">free margin</span>
        <span className="text-right text-[var(--fg)]">{stats.freeMargin.toFixed(2)}</span>

        <span className="text-[var(--muted)]">used margin</span>
        <span className="text-right text-[var(--fg)]">{stats.marginUsed.toFixed(2)}</span>

        <span className="text-[var(--muted)]">unrealized</span>
        <span className={`text-right ${stats.unrealizedPnl >= 0 ? "text-[var(--accent)]" : "text-[#ef4444]"}`}>
          {stats.unrealizedPnl >= 0 ? "+" : ""}{stats.unrealizedPnl.toFixed(2)}
        </span>

        <span className="text-[var(--muted)]">total pnl</span>
        <span className={`text-right ${pnlColor}`}>
          {pnlTotal >= 0 ? "+" : ""}{pnlTotal.toFixed(2)}{" "}
          <span className="opacity-60">({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)</span>
        </span>
      </div>
    </div>
  );
}
