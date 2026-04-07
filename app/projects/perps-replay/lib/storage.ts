// localStorage persistence for the paper-trading account.
//
// We persist ONLY the account (positions, orders, history, equity curve) +
// indicator visibility preferences, keyed by symbol+interval. We do NOT
// persist `bars` or `cursor` — those are derived from the chosen date range
// and the user's replay progress, and the bars themselves are large.

import type { Account } from "./engine";
import { freshAccount } from "./engine";
import type { IndicatorVisibility } from "./indicators";
import { DEFAULT_INDICATOR_VISIBILITY } from "./indicators";

const NS = "x45.perps-replay.v1";

type Persisted = {
  v: 1;
  account: Account;
  cursor: number;
  fromMonth: string;
  toMonth: string;
  // Optional so older v1 saves still load. Drawings used to live here too —
  // we silently ignore them now.
  indicators?: IndicatorVisibility;
};

function key(symbol: string, interval: string) {
  return `${NS}:${symbol}:${interval}`;
}

export function save(
  symbol: string,
  interval: string,
  data: {
    account: Account;
    cursor: number;
    fromMonth: string;
    toMonth: string;
    indicators: IndicatorVisibility;
  }
) {
  if (typeof window === "undefined") return;
  try {
    const payload: Persisted = { v: 1, ...data };
    window.localStorage.setItem(key(symbol, interval), JSON.stringify(payload));
  } catch {
    // quota / disabled — silently ignore
  }
}

export function load(
  symbol: string,
  interval: string
): {
  account: Account;
  cursor: number;
  fromMonth: string;
  toMonth: string;
  indicators: IndicatorVisibility;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(symbol, interval));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed.v !== 1) return null;
    return {
      account: parsed.account,
      cursor: parsed.cursor,
      fromMonth: parsed.fromMonth,
      toMonth: parsed.toMonth,
      indicators: parsed.indicators ?? DEFAULT_INDICATOR_VISIBILITY,
    };
  } catch {
    return null;
  }
}

export function reset(symbol: string, interval: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(symbol, interval));
  } catch {
    /* noop */
  }
}

export function resetAll() {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(NS + ":")) toRemove.push(k);
    }
    for (const k of toRemove) window.localStorage.removeItem(k);
  } catch {
    /* noop */
  }
}

// Default empty session for a symbol/interval pair.
export function emptySessionDefaults() {
  return {
    account: freshAccount(),
    cursor: 0,
  };
}
