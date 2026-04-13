"use client";

import { useMemo } from "react";
import type { Trade } from "../lib/types";
import {
  computeStats,
  computeEquityCurve,
  computePairStats,
  computeSetupStats,
  computeHourStats,
  computeDayStats,
  computeCalendar,
} from "../lib/analytics";
import { formatUsd } from "../lib/compute";
import { EquityCurve } from "./EquityCurve";
import { CalendarHeatmap } from "./CalendarHeatmap";

type Props = {
  trades: Trade[];
};

export function Dashboard({ trades }: Props) {
  const stats = useMemo(() => computeStats(trades), [trades]);
  const equity = useMemo(() => computeEquityCurve(trades), [trades]);
  const pairStats = useMemo(() => computePairStats(trades), [trades]);
  const setupStats = useMemo(() => computeSetupStats(trades), [trades]);
  const hourStats = useMemo(() => computeHourStats(trades), [trades]);
  const dayStats = useMemo(() => computeDayStats(trades), [trades]);
  const calendar = useMemo(() => computeCalendar(trades), [trades]);

  if (trades.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-xs font-mono text-[var(--muted)]">
          Log some trades to see your analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total PnL"
          value={formatUsd(stats.totalPnl)}
          color={stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          sub={`${stats.wins}W / ${stats.losses}L / ${stats.breakevens}BE`}
        />
        <StatCard
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? "∞ (no losses)" : stats.profitFactor.toFixed(2)}
          color={stats.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          label="Expectancy"
          value={formatUsd(stats.expectancy)}
          sub="per trade"
          color={stats.expectancy >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg R:R" value={`${stats.avgRR.toFixed(2)}`} />
        <StatCard
          label="Max Drawdown"
          value={formatUsd(-stats.maxDrawdown)}
          sub={`${stats.maxDrawdownPct.toFixed(1)}%`}
          color="text-red-400"
        />
        <StatCard
          label="Best Trade"
          value={stats.totalTrades > 0 ? formatUsd(stats.bestTrade) : "—"}
          color={stats.bestTrade >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          label="Worst Trade"
          value={stats.totalTrades > 0 ? formatUsd(stats.worstTrade) : "—"}
          color={stats.worstTrade >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Current Streak"
          value={`${stats.currentStreak.count} ${stats.currentStreak.type}`}
          color={
            stats.currentStreak.type === "win"
              ? "text-emerald-400"
              : stats.currentStreak.type === "loss"
                ? "text-red-400"
                : "text-[var(--muted)]"
          }
        />
        <StatCard label="Best Win Streak" value={`${stats.longestWinStreak}`} color="text-emerald-400" />
        <StatCard label="Worst Lose Streak" value={`${stats.longestLoseStreak}`} color="text-red-400" />
      </div>

      {/* Equity Curve */}
      {equity.length > 1 && (
        <div className="glass-card p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
            &gt; equity curve
          </p>
          <EquityCurve points={equity} />
        </div>
      )}

      {/* Calendar Heatmap */}
      {calendar.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
            &gt; trading calendar
          </p>
          <CalendarHeatmap days={calendar} />
        </div>
      )}

      {/* Hour of day */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
          &gt; performance by hour
        </p>
        <div className="flex items-end gap-[2px] h-24">
          {hourStats.map((h) => {
            const maxPnl = Math.max(1, ...hourStats.map((x) => Math.abs(x.totalPnl)));
            const heightPct = h.trades > 0 ? Math.max(8, (Math.abs(h.totalPnl) / maxPnl) * 100) : 4;
            const isPositive = h.totalPnl >= 0;
            return (
              <div
                key={h.hour}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: h.trades === 0
                    ? "var(--border)"
                    : isPositive
                      ? "#22c55e"
                      : "#ef4444",
                  opacity: h.trades === 0 ? 0.3 : 0.7,
                }}
                title={`${h.hour}:00 — ${h.trades} trades, ${formatUsd(h.totalPnl)}, ${h.winRate.toFixed(0)}% WR`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] font-mono text-[var(--muted)] mt-1">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </div>

      {/* Day of week */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
          &gt; performance by day
        </p>
        <div className="grid grid-cols-7 gap-2 text-[10px] font-mono">
          {dayStats.map((d) => (
            <div key={d.day} className="text-center">
              <p className="text-[var(--muted)] uppercase mb-1">{d.dayName}</p>
              <p
                className={`text-sm font-bold tabular-nums ${
                  d.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {d.trades > 0 ? formatUsd(d.totalPnl) : "—"}
              </p>
              <p className="text-[var(--muted)] mt-0.5">
                {d.trades > 0 ? `${d.trades}t ${d.winRate.toFixed(0)}%` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Per pair */}
      {pairStats.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
            &gt; by pair
          </p>
          <div className="space-y-2">
            {pairStats.map((p) => (
              <div key={p.pair} className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--fg)] font-semibold w-24">{p.pair}</span>
                  <span className="text-[var(--muted)]">{p.trades} trades</span>
                  <span className="text-[var(--muted)]">{p.winRate.toFixed(0)}% WR</span>
                </div>
                <span
                  className={`font-bold tabular-nums ${
                    p.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatUsd(p.totalPnl)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per setup */}
      {setupStats.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
            &gt; by setup
          </p>
          <div className="space-y-2">
            {setupStats.map((s) => (
              <div key={s.setup} className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--fg)] font-semibold w-32">{s.setup}</span>
                  <span className="text-[var(--muted)]">{s.trades} trades</span>
                  <span className="text-[var(--muted)]">{s.winRate.toFixed(0)}% WR</span>
                  <span className="text-[var(--muted)]">{s.avgRR.toFixed(1)}R avg</span>
                </div>
                <span
                  className={`font-bold tabular-nums ${
                    s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatUsd(s.totalPnl)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fees + totals */}
      <div className="text-[10px] font-mono text-[var(--muted)] flex gap-4 justify-end">
        <span>total fees: ${stats.totalFees.toFixed(2)}</span>
        <span>avg pnl/trade: {formatUsd(stats.avgPnl)}</span>
        <span>avg win: {formatUsd(stats.avgWin)}</span>
        <span>avg loss: {formatUsd(-stats.avgLoss)}</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-card p-3">
      <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums ${color ?? "text-[var(--fg)]"}`}>
        {value}
      </p>
      {sub && (
        <p className="text-[9px] font-mono text-[var(--muted)] mt-0.5">{sub}</p>
      )}
    </div>
  );
}
