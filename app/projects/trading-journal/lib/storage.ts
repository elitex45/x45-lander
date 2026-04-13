import type { Trade, JournalSettings } from "./types";
import { DEFAULT_MAKER_FEE, DEFAULT_TAKER_FEE, DEFAULT_SETUPS } from "./pairs";

const NS = "x45.trading-journal.v1";
const TRADES_KEY = `${NS}.trades`;
const SETTINGS_KEY = `${NS}.settings`;

// --- Trades ---

export function loadTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRADES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Trade[];
  } catch {
    return [];
  }
}

function persistTrades(trades: Trade[]): void {
  try {
    localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
  } catch {
    // quota exceeded — drop oldest trades until it fits
    const trimmed = trades.slice(-500);
    try {
      localStorage.setItem(TRADES_KEY, JSON.stringify(trimmed));
    } catch {
      /* truly out of space */
    }
  }
}

export function saveTrade(trade: Trade): Trade[] {
  const trades = loadTrades();
  trades.push(trade);
  trades.sort((a, b) => a.closedAt - b.closedAt);
  persistTrades(trades);
  return trades;
}

export function updateTrade(updated: Trade): Trade[] {
  const trades = loadTrades().map((t) =>
    t.id === updated.id ? updated : t
  );
  trades.sort((a, b) => a.closedAt - b.closedAt);
  persistTrades(trades);
  return trades;
}

export function deleteTrade(id: string): Trade[] {
  const trades = loadTrades().filter((t) => t.id !== id);
  persistTrades(trades);
  return trades;
}

// --- Settings ---

export const DEFAULT_SETTINGS: JournalSettings = {
  defaultBalance: 1000,
  makerFee: DEFAULT_MAKER_FEE,
  takerFee: DEFAULT_TAKER_FEE,
  defaultLeverage: 10,
  setups: [...DEFAULT_SETUPS],
};

export function loadSettings(): JournalSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: JournalSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* noop */
  }
}
