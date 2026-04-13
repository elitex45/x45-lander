"use client";

import { useState, useMemo, useCallback } from "react";
import type { Trade } from "../lib/types";
import { formatUsd, formatPct } from "../lib/compute";

type Props = {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
};

type FilterState = {
  pair: string;
  result: string;
  setup: string;
};

function exportCSV(trades: Trade[]) {
  const headers = [
    "Date Opened", "Date Closed", "Pair", "Side", "Leverage",
    "Entry Price", "Exit Price", "SL", "TP", "Size (USD)", "Margin",
    "R:R", "PnL", "PnL %", "Fees", "Result", "Exit Reason",
    "Setup", "Risk USD", "Risk %", "Account Balance", "Notes",
  ];
  const rows = trades.map((t) => [
    new Date(t.openedAt).toISOString(),
    new Date(t.closedAt).toISOString(),
    t.pair, t.side, t.leverage,
    t.entryPx, t.exitPx,
    t.sl ?? "", t.tp ?? "",
    t.sizeUsd.toFixed(2), t.margin.toFixed(2),
    t.rr?.toFixed(2) ?? "",
    t.pnl.toFixed(2), t.pnlPct.toFixed(2),
    t.fees.toFixed(2), t.result, t.exitReason,
    t.setup, t.riskUsd.toFixed(2), t.riskPct.toFixed(2),
    t.accountBalance.toFixed(0),
    `"${(t.notes || "").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trading-journal-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TradeList({ trades, onEdit, onDelete }: Props) {
  const [filter, setFilter] = useState<FilterState>({
    pair: "all",
    result: "all",
    setup: "all",
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pairs = useMemo(() => [...new Set(trades.map((t) => t.pair))], [trades]);
  const setups = useMemo(
    () => [...new Set(trades.filter((t) => t.setup).map((t) => t.setup))],
    [trades]
  );

  const filtered = useMemo(() => {
    return [...trades]
      .sort((a, b) => b.closedAt - a.closedAt)
      .filter((t) => filter.pair === "all" || t.pair === filter.pair)
      .filter((t) => filter.result === "all" || t.result === filter.result)
      .filter((t) => filter.setup === "all" || t.setup === filter.setup);
  }, [trades, filter]);

  if (trades.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-xs font-mono text-[var(--muted)]">
          No trades logged yet. Start by logging your first trade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Pair"
          value={filter.pair}
          options={pairs}
          onChange={(v) => setFilter((f) => ({ ...f, pair: v }))}
        />
        <FilterSelect
          label="Result"
          value={filter.result}
          options={["win", "loss", "breakeven"]}
          onChange={(v) => setFilter((f) => ({ ...f, result: v }))}
        />
        <FilterSelect
          label="Setup"
          value={filter.setup}
          options={setups}
          onChange={(v) => setFilter((f) => ({ ...f, setup: v }))}
        />
        <span className="text-[10px] font-mono text-[var(--muted)] self-center">
          {filtered.length} / {trades.length} trades
        </span>
        <button
          onClick={() => exportCSV(filtered)}
          className="text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors ml-auto"
        >
          export csv
        </button>
      </div>

      {/* Trade cards */}
      {filtered.map((trade) => (
        <TradeCard
          key={trade.id}
          trade={trade}
          expanded={expandedId === trade.id}
          onToggle={() =>
            setExpandedId((id) => (id === trade.id ? null : trade.id))
          }
          onEdit={() => onEdit(trade)}
          onDelete={() => onDelete(trade.id)}
        />
      ))}
    </div>
  );
}

function TradeCard({
  trade,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  trade: Trade;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resultColor =
    trade.result === "win"
      ? "text-emerald-400"
      : trade.result === "loss"
        ? "text-red-400"
        : "text-[var(--muted)]";

  const sideBg =
    trade.side === "long"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      : "bg-red-500/10 text-red-400 border-red-500/30";

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${sideBg}`}
            >
              {trade.side}
            </span>
            <span className="text-sm font-semibold text-[var(--fg)] truncate">
              {trade.pair}
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)]">
              {trade.leverage}x
            </span>
            {trade.setup && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] hidden sm:inline">
                {trade.setup}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-sm font-bold tabular-nums ${resultColor}`}>
              {formatUsd(trade.pnl)}
            </span>
            <span className={`text-[10px] font-mono tabular-nums ${resultColor}`}>
              {formatPct(trade.pnlPct)}
            </span>
            <svg
              className={`w-3 h-3 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-[var(--muted)]">
          <span>{new Date(trade.closedAt).toLocaleDateString()}</span>
          <span>{new Date(trade.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span className={`uppercase ${resultColor}`}>{trade.result}</span>
          <span>{trade.exitReason.replace("-", " ")}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono mb-3">
            <DetailItem label="Entry" value={`$${trade.entryPx}`} />
            <DetailItem label="Exit" value={`$${trade.exitPx}`} />
            <DetailItem label="SL" value={trade.sl ? `$${trade.sl}` : "—"} />
            <DetailItem label="TP" value={trade.tp ? `$${trade.tp}` : "—"} />
            <DetailItem label="Margin" value={`$${trade.margin.toFixed(2)}`} />
            <DetailItem label="Size" value={`$${trade.sizeUsd.toFixed(0)}`} />
            <DetailItem label="Fees" value={`$${trade.fees.toFixed(2)}`} />
            <DetailItem label="R:R" value={trade.rr ? `${trade.rr.toFixed(2)}R` : "—"} />
            <DetailItem label="Risk" value={`${trade.riskPct.toFixed(1)}%`} />
            <DetailItem label="Risk $" value={`$${trade.riskUsd.toFixed(2)}`} />
            <DetailItem label="Balance" value={`$${trade.accountBalance.toFixed(0)}`} />
            <DetailItem label="Duration" value={formatDuration(trade.closedAt - trade.openedAt)} />
          </div>
          {trade.notes && (
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-3 border-l-2 border-[var(--border)] pl-3">
              {trade.notes}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
            >
              edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-md border border-red-500/30 text-red-400/70 hover:text-red-400 hover:border-red-500 transition-colors"
            >
              delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[var(--muted)] uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-[var(--fg)] tabular-nums">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-field text-[10px] py-1 px-2"
    >
      <option value="all">All {label}s</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}
