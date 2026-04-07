// localStorage persistence for the paper-trading account.
//
// We persist ONLY the account (positions, orders, history, equity curve) keyed
// by symbol+interval. We do NOT persist `bars` or `cursor` — those are derived
// from the chosen date range and the user's replay progress, and the bars
// themselves are large.

import type { Account } from "./engine";
import { freshAccount } from "./engine";
import type { Drawing } from "./drawings";

const NS = "x45.perps-replay.v1";

type Persisted = {
  v: 1;
  account: Account;
  cursor: number;
  fromMonth: string;
  toMonth: string;
  // Optional so existing v1 saves (which predate drawings) still load.
  drawings?: Drawing[];
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
    drawings: Drawing[];
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
  drawings: Drawing[];
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
      drawings: parsed.drawings ?? [],
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
