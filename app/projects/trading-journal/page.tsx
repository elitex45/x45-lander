"use client";

import { useCallback, useEffect, useState } from "react";
import type { Trade, JournalSettings } from "./lib/types";
import {
  loadTrades,
  saveTrade,
  updateTrade,
  deleteTrade,
  loadSettings,
  saveSettings,
} from "./lib/storage";
import { TradeForm } from "./components/TradeForm";
import { TradeList } from "./components/TradeList";
import { Dashboard } from "./components/Dashboard";
import { SettingsPanel } from "./components/SettingsPanel";
import { LiveTradingView } from "./components/LiveTradingView";
import { ReplayTradingView } from "./components/ReplayTradingView";

type Tab = "live" | "replay" | "log" | "history" | "dashboard" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "replay", label: "Replay" },
  { id: "log", label: "Log Trade" },
  { id: "history", label: "History" },
  { id: "dashboard", label: "Dashboard" },
  { id: "settings", label: "Settings" },
];

export default function TradingJournalPage() {
  const [tab, setTab] = useState<Tab>("live");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<JournalSettings | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Hydrate
  useEffect(() => {
    setTrades(loadTrades());
    setSettings(loadSettings());
  }, []);

  // Called when live engine closes a trade — auto-log it to the journal
  const handleLiveTradeClose = useCallback(
    (closedTrade: {
      id: string;
      symbol: string;
      side: "long" | "short";
      size: number;
      entryPx: number;
      exitPx: number;
      leverage: number;
      margin: number;
      tp: number | null;
      sl: number | null;
      rr: number | null;
      pnlRaw: number;
      fees: number;
      pnl: number;
      reason: string;
      openedAtMs: number;
      closedAtMs: number;
    }) => {
      if (!settings) return;
      // Dedup: skip if this trade was already logged
      const existing = loadTrades();
      if (existing.some((t) => t.id === closedTrade.id)) return;

      const sizeUsd = closedTrade.size * closedTrade.entryPx;
      const riskUsd = closedTrade.sl
        ? closedTrade.size * Math.abs(closedTrade.entryPx - closedTrade.sl)
        : closedTrade.margin;
      const journalTrade: Trade = {
        id: closedTrade.id,
        pair: closedTrade.symbol,
        side: closedTrade.side,
        leverage: closedTrade.leverage,
        entryPx: closedTrade.entryPx,
        exitPx: closedTrade.exitPx,
        sl: closedTrade.sl,
        tp: closedTrade.tp,
        sizeUsd,
        margin: closedTrade.margin,
        accountBalance: settings.defaultBalance,
        riskUsd,
        riskPct: (riskUsd / settings.defaultBalance) * 100,
        rr: closedTrade.rr,
        pnl: closedTrade.pnl,
        pnlPct: (closedTrade.pnl / closedTrade.margin) * 100,
        fees: closedTrade.fees,
        result:
          closedTrade.pnl > 0.01
            ? "win"
            : closedTrade.pnl < -0.01
              ? "loss"
              : "breakeven",
        exitReason:
          closedTrade.reason === "tp"
            ? "tp-hit"
            : closedTrade.reason === "sl"
              ? "sl-hit"
              : closedTrade.reason === "liquidation"
                ? "liquidated"
                : "manual",
        setup: "",
        notes: "[auto-logged from live paper trade]",
        openedAt: closedTrade.openedAtMs,
        closedAt: closedTrade.closedAtMs,
      };
      setTrades(saveTrade(journalTrade));
    },
    [settings]
  );

  const handleSave = useCallback(
    (trade: Trade) => {
      if (editingTrade) {
        setTrades(updateTrade(trade));
        setEditingTrade(null);
      } else {
        setTrades(saveTrade(trade));
      }
      setTab("history");
    },
    [editingTrade]
  );

  const handleEdit = useCallback((trade: Trade) => {
    setEditingTrade(trade);
    setTab("log");
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTrades(deleteTrade(id));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTrade(null);
  }, []);

  const handleSettingsChange = useCallback((s: JournalSettings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  if (!settings) return null;

  return (
    <div className={`mx-auto px-4 sm:px-6 pb-16 ${tab === "live" || tab === "replay" ? "max-w-6xl" : "max-w-3xl"}`}>
      <header className="mb-4 mt-2">
        <p className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase mb-2">
          &gt; ./projects/trading-journal
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fg)]">
          Trading Journal
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
          Paper trade live Binance perps, or log manually. Track your edge, find
          your leaks. Everything stays in your browser.
        </p>
      </header>

      {/* Quick stats strip */}
      {trades.length > 0 && (
        <div className="flex gap-3 mb-4 text-[10px] font-mono overflow-x-auto">
          <QuickStat label="trades" value={`${trades.length}`} />
          <QuickStat
            label="pnl"
            value={`${trades.reduce((s, t) => s + t.pnl, 0) >= 0 ? "+" : ""}$${Math.abs(trades.reduce((s, t) => s + t.pnl, 0)).toFixed(2)}`}
            color={
              trades.reduce((s, t) => s + t.pnl, 0) >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          />
          <QuickStat
            label="win rate"
            value={`${((trades.filter((t) => t.result === "win").length / trades.length) * 100).toFixed(0)}%`}
          />
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 mb-4 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (t.id !== "log") setEditingTrade(null);
            }}
            className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors border-b-2 -mb-[1px] flex-shrink-0 ${
              tab === t.id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {t.label}
            {t.id === "history" && trades.length > 0 && (
              <span className="ml-1.5 text-[var(--muted)]">
                ({trades.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "live" && (
        <LiveTradingView
          onTradeClose={handleLiveTradeClose}
          settings={settings}
        />
      )}

      {tab === "replay" && (
        <ReplayTradingView
          onTradeClose={handleLiveTradeClose}
          settings={settings}
        />
      )}

      {tab === "log" && (
        <div className="glass-card p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-4">
            {editingTrade ? "> editing trade" : "> new trade"}
          </p>
          <TradeForm
            key={editingTrade?.id ?? "new"}
            settings={settings}
            onSave={handleSave}
            editingTrade={editingTrade}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      )}

      {tab === "history" && (
        <TradeList
          trades={trades}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {tab === "dashboard" && <Dashboard trades={trades} />}

      {tab === "settings" && (
        <SettingsPanel settings={settings} onChange={handleSettingsChange} />
      )}
    </div>
  );
}

function QuickStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="glass-card px-3 py-1.5 flex-shrink-0">
      <span className="text-[var(--muted)] uppercase tracking-widest mr-2">
        {label}
      </span>
      <span
        className={`font-medium tabular-nums ${color ?? "text-[var(--fg)]"}`}
      >
        {value}
      </span>
    </div>
  );
}
