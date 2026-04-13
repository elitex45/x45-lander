"use client";

import type { TradingEngine } from "../lib/engineTypes";

type Props = { engine: TradingEngine };

export function LiveAccountStats({ engine }: Props) {
  const { state } = engine;
  const stats = engine.selectAccountStats();
  const totalPnl = stats.equity - state.account.startingBalance;
  const totalPnlPct = (totalPnl / state.account.startingBalance) * 100;

  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-2">
        &gt; account
      </p>
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
        <Stat label="equity" value={`$${stats.equity.toFixed(2)}`} />
        <Stat label="balance" value={`$${stats.balance.toFixed(2)}`} />
        <Stat label="free margin" value={`$${stats.freeMargin.toFixed(2)}`} />
        <Stat label="used margin" value={`$${stats.marginUsed.toFixed(2)}`} />
        <Stat
          label="unrealized"
          value={`${stats.unrealizedPnl >= 0 ? "+" : ""}$${stats.unrealizedPnl.toFixed(2)}`}
          color={stats.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Stat
          label="total pnl"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)} (${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(1)}%)`}
          color={totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>
      {/* Fee summary */}
      {state.account.closedTrades.length > 0 && (() => {
        const totalFees = state.account.closedTrades.reduce((s, t) => s + (t.fees ?? 0), 0);
        const openFunding = state.account.positions.reduce((s, p) => s + (p.fundingPaid ?? 0), 0);
        return (
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono mt-2 pt-2 border-t border-[var(--border)]">
            <Stat
              label="total fees"
              value={`-$${totalFees.toFixed(2)}`}
              color="text-red-400"
            />
            <Stat
              label="open funding"
              value={`$${openFunding.toFixed(4)}`}
              color="text-[var(--muted)]"
            />
          </div>
        );
      })()}
      <div className="mt-2 pt-2 border-t border-[var(--border)] flex justify-between items-center">
        <span className="text-[9px] font-mono text-[var(--muted)]">
          {state.account.closedTrades.length} closed trades
        </span>
        <button
          onClick={() => {
            if (window.confirm("Reset account? All positions and history will be cleared.")) {
              engine.resetAccount();
            }
          }}
          className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] hover:text-red-400 transition-colors"
        >
          reset
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[var(--muted)] uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`tabular-nums font-medium ${color ?? "text-[var(--fg)]"}`}>{value}</p>
    </div>
  );
}
