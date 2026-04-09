"use client";

import { useCallback } from "react";
import {
  REGIME_META,
  type Regime,
} from "../../lib/regime";
import type { HistoryEntry } from "../../lib/trainerStorage";
import { MiniChart } from "./MiniChart";
import { downloadHistoryCSV } from "../lib/exportHistory";

type Props = {
  history: HistoryEntry[];
  onClear: () => void;
};

export function TrainerHistory({ history, onClear }: Props) {
  const handleCSV = useCallback(() => {
    if (history.length === 0) return;
    downloadHistoryCSV(history);
  }, [history]);

  const handlePDF = useCallback(() => {
    // Same trick as the readme viewer — set the title for the print
    // dialog filename, then call window.print(). Print stylesheet
    // takes care of hiding the active quiz and laying the history
    // out as a printable document.
    const stamp = new Date().toISOString().slice(0, 10);
    const original = document.title;
    document.title = `regime-trainer-history-${stamp}`;
    const restore = () => {
      document.title = original;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }, []);

  if (history.length === 0) {
    return (
      <div className="glass-card p-6 text-center print:hidden">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
          no history yet — answer a few rounds to start your training log
        </p>
      </div>
    );
  }

  return (
    <div id="trainer-history-root">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-1">
            &gt; training history
          </p>
          <p className="text-xs text-[var(--muted)]">
            {history.length} round{history.length === 1 ? "" : "s"} logged.
            Each card shows what you saw + what happened next.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCSV}
            className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors"
            title="Download as CSV"
          >
            export csv ↓
          </button>
          <button
            type="button"
            onClick={handlePDF}
            className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
            title="Print to PDF"
          >
            export pdf ↓
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-red-400 hover:border-red-400 transition-colors"
            title="Clear history (keeps stats)"
          >
            clear
          </button>
        </div>
      </div>

      {/* Print-only header that only shows up in the PDF */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-black">
          Regime Trainer — Training History
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          {history.length} rounds · exported {new Date().toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="space-y-3">
        {history.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Print-only footer */}
      <footer className="hidden print:block mt-8 pt-4 text-center text-[10px] text-gray-500 font-mono">
        <div className="border-t border-gray-300 mb-2" />
        Exported from <strong>x45.in</strong>
      </footer>
    </div>
  );
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const c = entry.classification;
  const userMeta = REGIME_META[entry.userAnswer];
  const correctMeta = REGIME_META[c.regime];
  const fromDate = new Date(entry.windowBars[0]?.openTime ?? 0)
    .toISOString()
    .slice(0, 10);
  const toDate = new Date(
    entry.windowBars[entry.windowBars.length - 1]?.openTime ?? 0
  )
    .toISOString()
    .slice(0, 10);
  const tsLocal = new Date(entry.timestamp).toLocaleString();

  return (
    <div className="glass-card p-4 print:break-inside-avoid print:border print:border-gray-200 print:rounded-md print:shadow-none print:bg-white">
      {/* Header row: symbol, dates, verdict */}
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--fg)] print:text-black">
              {entry.symbol}
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)] print:text-gray-600">
              {entry.interval}
            </span>
            <span className="text-[10px] text-[var(--border)] print:text-gray-300">
              ·
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)] print:text-gray-600">
              {fromDate} → {toDate}
            </span>
          </div>
          <p className="text-[10px] font-mono text-[var(--muted)] mt-0.5 print:text-gray-500">
            {tsLocal}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <Badge
            label="you"
            value={userMeta.label}
            color={userMeta.color}
          />
          <Badge
            label="algo"
            value={correctMeta.label}
            color={correctMeta.color}
          />
          <span
            className="text-base font-bold"
            style={{ color: entry.correct ? "#22c55e" : "#ef4444" }}
            aria-label={entry.correct ? "correct" : "wrong"}
          >
            {entry.correct ? "✓" : "✗"}
          </span>
        </div>
      </div>

      {/* Mini chart — labeling window + future reveal with separator */}
      <div className="mb-3 rounded-md overflow-hidden border border-[var(--border)] print:border-gray-200 bg-[var(--bg)]/30 print:bg-white">
        <MiniChart
          windowBars={entry.windowBars}
          futureBars={entry.futureBars}
        />
      </div>

      {/* Reason + metric strip */}
      <div className="text-[11px] text-[var(--fg)] mb-2 border-l-2 border-[var(--accent)] pl-2 py-0.5 print:text-black print:border-l-2 print:border-gray-400">
        {c.reason}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        <Stat label="CHOP" value={c.chop.toFixed(1)} />
        <Stat label="ADX" value={c.adx.toFixed(1)} />
        <Stat
          label="EMA20/50"
          value={
            c.ema50 > 0 ? `${(c.ema20 / c.ema50).toFixed(3)}×` : "—"
          }
        />
        <Stat label="ATR" value={c.atr.toFixed(2)} />
      </div>
    </div>
  );
}

function Badge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[9px] uppercase tracking-widest text-[var(--muted)] print:text-gray-500">
        {label}
      </span>
      <span style={{ color }} className="font-medium text-[11px]">
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[var(--muted)] uppercase tracking-widest text-[9px] mb-0.5 print:text-gray-500">
        {label}
      </p>
      <p className="text-[var(--fg)] tabular-nums print:text-black">{value}</p>
    </div>
  );
}

// keep types referenced
export type { Regime };
