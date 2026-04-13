"use client";

// Replay engine: loads historical bars, advances cursor bar-by-bar,
// processes order fills/liquidations on each tick. Same trading math
// as the live engine but with a replay cursor instead of WebSocket.

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  type LiveEngineState,
  type Kline,
  type OrderDraft,
  type ClosedTrade,
  freshState,
  freshAccount,
  placeOrder,
  cancelOrder,
  closePosition,
  checkFills,
  recordEquity,
  chargeFunding,
  resetAccount as resetAccountFn,
  selectAccountStats,
  selectMarkPnl,
  DEFAULT_BALANCE,
} from "../lib/liveEngine";

// ─── Replay state extends engine state with cursor ───

type ReplayEngineState = LiveEngineState & {
  cursor: number;
  playing: boolean;
  speed: number;
};

type Action =
  | { type: "loadBars"; bars: Kline[] }
  | { type: "tick" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "step" }
  | { type: "seek"; cursor: number }
  | { type: "speed"; value: number }
  | { type: "place"; draft: OrderDraft }
  | { type: "cancel"; orderId: string }
  | { type: "close"; positionId: string; fraction?: number }
  | { type: "resetAccount"; balance: number }
  | { type: "switchPair"; symbol: string; interval: string }
  | { type: "restoreCursor"; cursor: number };

function reducer(state: ReplayEngineState, action: Action): ReplayEngineState {
  switch (action.type) {
    case "loadBars":
      // Start with enough bars visible to fill the chart (50 bars or 10% of total)
      return { ...state, bars: action.bars, cursor: Math.min(50, Math.floor(action.bars.length * 0.1)), playing: false };
    case "tick": {
      if (state.bars.length === 0 || state.cursor >= state.bars.length - 1) {
        return { ...state, playing: false };
      }
      const newCursor = state.cursor + 1;
      const bar = state.bars[newCursor];
      let s: LiveEngineState = { ...state, cursor: newCursor } as ReplayEngineState;
      // Process fills against the new bar
      s = checkFills(s, bar);
      s = chargeFunding(s, bar.closeTime);
      s = recordEquity(s, bar);
      return s as ReplayEngineState;
    }
    case "play":
      return { ...state, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "step": {
      if (state.bars.length === 0 || state.cursor >= state.bars.length - 1) return state;
      const newCursor = state.cursor + 1;
      const bar = state.bars[newCursor];
      let s: LiveEngineState = { ...state, cursor: newCursor, playing: false } as ReplayEngineState;
      s = checkFills(s, bar);
      s = chargeFunding(s, bar.closeTime);
      s = recordEquity(s, bar);
      return s as ReplayEngineState;
    }
    case "seek": {
      const target = Math.max(0, Math.min(state.bars.length - 1, action.cursor));
      if (target <= state.cursor) {
        // Seeking backward — don't process fills (would need to undo trades)
        return { ...state, cursor: target };
      }
      // Seeking forward — process each bar for fills so TP/SL trigger
      let s = state as LiveEngineState;
      for (let i = state.cursor + 1; i <= target; i++) {
        s = { ...s, cursor: i } as ReplayEngineState;
        s = checkFills(s, state.bars[i]);
      }
      return { ...s, cursor: target, playing: false } as ReplayEngineState;
    }
    case "speed":
      return { ...state, speed: action.value };
    case "place": {
      // For market orders, the engine uses bars[bars.length-1].close as fill price.
      // In replay mode, we need to temporarily set bars to the visible slice
      // so placeOrder fills at the cursor's bar close.
      const visibleBars = state.bars.slice(0, state.cursor + 1);
      const tempState: LiveEngineState = { ...state, bars: visibleBars };
      const result = placeOrder(tempState, action.draft);
      return { ...state, account: result.account } as ReplayEngineState;
    }
    case "cancel":
      return { ...state, ...cancelOrder(state, action.orderId) } as ReplayEngineState;
    case "close": {
      const visibleBars = state.bars.slice(0, state.cursor + 1);
      const tempState: LiveEngineState = { ...state, bars: visibleBars };
      const result = closePosition(tempState, action.positionId, action.fraction);
      return { ...state, account: result.account } as ReplayEngineState;
    }
    case "resetAccount":
      return { ...state, account: freshAccount(action.balance) } as ReplayEngineState;
    case "switchPair":
      return {
        ...freshState(action.symbol, action.interval, state.account.startingBalance),
        cursor: 0, playing: false, speed: state.speed,
        account: state.account,
      } as ReplayEngineState;
    case "restoreCursor":
      return { ...state, cursor: Math.min(action.cursor, Math.max(0, state.bars.length - 1)) };
    default:
      return state;
  }
}

// Fetch bars from our proxy
async function fetchBars(symbol: string, interval: string, from: string, to: string): Promise<Kline[]> {
  // Load month by month and concatenate
  const months: string[] = [];
  const [fromY, fromM] = from.split("-").map(Number);
  const [toY, toM] = to.split("-").map(Number);
  let y = fromY, m = fromM;
  while (y < toY || (y === toY && m <= toM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  const results = await Promise.all(
    months.map(async (month) => {
      try {
        const res = await fetch(`/api/binance-klines?symbol=${symbol}&interval=${interval}&month=${month}`);
        if (!res.ok) return [];
        return (await res.json()) as Kline[];
      } catch {
        return [];
      }
    })
  );

  return results.flat().sort((a, b) => a.openTime - b.openTime);
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  return {
    from: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
    to: `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}`,
  };
}

const REPLAY_STORAGE_KEY = "x45.trading-journal.replay.v1";

type PersistedReplay = {
  account: ReplayEngineState["account"];
  cursor: number;
  symbol: string;
  interval: string;
  range: { from: string; to: string };
  speed: number;
};

function loadPersisted(): PersistedReplay | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REPLAY_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedReplay;
    // Migrate old positions
    data.account.positions = data.account.positions.map((p) => ({
      ...p, entryFee: p.entryFee ?? 0, fundingPaid: p.fundingPaid ?? 0,
      lastFundingMs: p.lastFundingMs ?? p.openedAtMs ?? Date.now(),
    }));
    data.account.closedTrades = data.account.closedTrades.map((t) => ({
      ...t, leverage: t.leverage ?? 10, margin: t.margin ?? 0,
      tp: t.tp ?? null, sl: t.sl ?? null, rr: t.rr ?? null,
      pnlRaw: t.pnlRaw ?? t.pnl ?? 0, fees: t.fees ?? 0,
    }));
    return data;
  } catch { return null; }
}

function persist(state: ReplayEngineState, range: { from: string; to: string }) {
  try {
    const data: PersistedReplay = {
      account: state.account,
      cursor: state.cursor,
      symbol: state.symbol,
      interval: state.interval,
      range,
      speed: state.speed,
    };
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota */ }
}

export function useReplayEngine(initialBalance = DEFAULT_BALANCE) {
  const saved = useRef(loadPersisted());

  const [state, dispatch] = useReducer(
    reducer,
    null,
    () => {
      const p = saved.current;
      if (p) {
        return {
          ...freshState(p.symbol, p.interval, initialBalance),
          account: p.account,
          cursor: p.cursor,
          playing: false,
          speed: p.speed,
        } as ReplayEngineState;
      }
      return {
        ...freshState("BTCUSDT", "1h", initialBalance),
        cursor: 0, playing: false, speed: 2,
      } as ReplayEngineState;
    }
  );

  const [range, setRange] = useState(() => saved.current?.range ?? defaultRange());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevClosedCountRef = useRef(state.account.closedTrades.length);
  const onNewTradeRef = useRef<((trade: ClosedTrade) => void) | null>(null);

  // Persist state on changes — immediate save for account (critical data),
  // debounced for cursor/range (non-critical, changes rapidly during play)
  useEffect(() => {
    persist(state, range);
  }, [state.account, state.symbol, state.interval, range]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(state, range), 1000);
  }, [state.cursor, state.speed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play loop
  useEffect(() => {
    if (!state.playing || state.bars.length === 0) return;
    const ms = Math.max(16, 1000 / state.speed);
    const timer = setInterval(() => dispatch({ type: "tick" }), ms);
    return () => clearInterval(timer);
  }, [state.playing, state.speed, state.bars.length]);

  // Load bars when symbol/interval/range changes
  const loadBars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bars = await fetchBars(state.symbol, state.interval, range.from, range.to);
      if (bars.length === 0) {
        setError("No data for this range");
        return;
      }
      dispatch({ type: "loadBars", bars });

      // Restore cursor if the persisted session matches
      const p = saved.current;
      if (
        p && p.symbol === state.symbol && p.interval === state.interval &&
        p.range.from === range.from && p.range.to === range.to &&
        p.cursor < bars.length
      ) {
        dispatch({ type: "restoreCursor", cursor: p.cursor });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [state.symbol, state.interval, range]);

  // Auto-load on mount and when range/pair changes
  useEffect(() => { loadBars(); }, [loadBars]);

  // Detect new closed trades — runs on EVERY render to catch batched updates
  const currentClosedCount = state.account.closedTrades.length;
  if (currentClosedCount > prevClosedCountRef.current) {
    const newCount = currentClosedCount - prevClosedCountRef.current;
    const newTrades = state.account.closedTrades.slice(0, newCount);
    // Schedule callback in a microtask so it runs after this render
    // but before the next paint — more reliable than useEffect for batched updates
    Promise.resolve().then(() => {
      for (const trade of newTrades) {
        onNewTradeRef.current?.(trade);
      }
    });
  }
  prevClosedCountRef.current = currentClosedCount;

  // Visible bars = bars[0..cursor]
  const visibleBars = state.bars.length > 0
    ? state.bars.slice(0, state.cursor + 1)
    : [];

  // Current bar timestamp
  const currentBar = state.bars[state.cursor];
  const timestamp = currentBar
    ? new Date(currentBar.openTime).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "—";

  return {
    state,
    visibleBars,
    timestamp,
    range,
    setRange,
    loading,
    error,
    play: useCallback(() => dispatch({ type: "play" }), []),
    pause: useCallback(() => dispatch({ type: "pause" }), []),
    step: useCallback(() => dispatch({ type: "step" }), []),
    seek: useCallback((c: number) => dispatch({ type: "seek", cursor: c }), []),
    setSpeed: useCallback((v: number) => dispatch({ type: "speed", value: v }), []),
    place: useCallback((draft: OrderDraft) => dispatch({ type: "place", draft }), []),
    cancel: useCallback((orderId: string) => dispatch({ type: "cancel", orderId }), []),
    close: useCallback((positionId: string, fraction = 1) => dispatch({ type: "close", positionId, fraction }), []),
    switchPair: useCallback((symbol: string, interval: string) => dispatch({ type: "switchPair", symbol, interval }), []),
    resetAccount: useCallback((balance = DEFAULT_BALANCE) => {
      dispatch({ type: "resetAccount", balance });
      try { localStorage.removeItem(REPLAY_STORAGE_KEY); } catch { /* */ }
      prevClosedCountRef.current = 0;
    }, []),
    selectAccountStats: () => {
      const vis = state.bars.slice(0, state.cursor + 1);
      const tempState: LiveEngineState = { ...state, bars: vis };
      return selectAccountStats(tempState);
    },
    selectMarkPnl: (pos: LiveEngineState["account"]["positions"][0]) => {
      const vis = state.bars.slice(0, state.cursor + 1);
      const tempState: LiveEngineState = { ...state, bars: vis };
      return selectMarkPnl(tempState, pos);
    },
    setOnNewTrade: useCallback((cb: (trade: ClosedTrade) => void) => { onNewTradeRef.current = cb; }, []),
  };
}

export type ReplayEngineHook = ReturnType<typeof useReplayEngine>;
