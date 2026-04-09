// History export helpers — CSV serialization + browser download trigger.
//
// PDF export is handled separately by window.print() with a print
// stylesheet, so this file only owns the CSV path.

import type { HistoryEntry } from "../../lib/trainerStorage";

const CSV_HEADERS = [
  "timestamp_iso",
  "symbol",
  "interval",
  "from_date",
  "to_date",
  "user_answer",
  "correct_answer",
  "correct",
  "chop",
  "adx",
  "ema20",
  "ema50",
  "ema_ratio",
  "atr",
  "recent_bar_move",
  "reason",
];

// Wrap a single CSV cell — escapes quotes and wraps in quotes if the
// cell contains a comma, quote, or newline.
function csvCell(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function historyToCSV(history: HistoryEntry[]): string {
  const rows: string[] = [];
  rows.push(CSV_HEADERS.join(","));

  for (const e of history) {
    const c = e.classification;
    const fromDate =
      e.windowBars.length > 0 ? fmtDate(e.windowBars[0].openTime) : "";
    const toDate =
      e.windowBars.length > 0
        ? fmtDate(e.windowBars[e.windowBars.length - 1].openTime)
        : "";
    const emaRatio = c.ema50 > 0 ? c.ema20 / c.ema50 : 0;

    rows.push(
      [
        new Date(e.timestamp).toISOString(),
        e.symbol,
        e.interval,
        fromDate,
        toDate,
        e.userAnswer,
        c.regime,
        e.correct,
        c.chop.toFixed(3),
        c.adx.toFixed(3),
        c.ema20.toFixed(6),
        c.ema50.toFixed(6),
        emaRatio.toFixed(4),
        c.atr.toFixed(6),
        c.recentBarMove.toFixed(6),
        c.reason,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  return rows.join("\n");
}

// Triggers a browser download of the given content as a file.
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke a bit so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function downloadHistoryCSV(history: HistoryEntry[]) {
  const csv = historyToCSV(history);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `regime-trainer-history-${stamp}.csv`, "text/csv");
}
