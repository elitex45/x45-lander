"use client";

// Core engine hook — manages paper trading state independent of data source.
// Used by both Live mode (WebSocket bars) and Replay mode (historical bars).

import { useCallback, useReducer, useRef, useEffect } from "react";
import {
  type LiveEngineState,
  type Kline,
  type OrderDraft,
  type ClosedTrade,
  freshState,
  placeOrder,
  cancelOrder,
  closePosition,
  checkFills,
  recordEquity,
  chargeFunding,
  updateBars,
  resetAccount as resetAccountFn,
  selectAccountStats,
  selectMarkPnl,
  DEFAULT_BALANCE,
} from "../lib/liveEngine";

const STORAGE_KEY = "x45.trading-journal.engine.v2";

type Action =
  | { type: "loadBars"; bars: Kline[] }
  | { type: "barUpdate"; bar: Kline; isClosed: boolean }
  | { type: "place"; draft: OrderDraft }
  | { type: "cancel"; orderId: string }
  | { type: "close"; positionId: string; fraction?: number }
  | { type: "resetAccount"; balance: number }
  | { type: "switchPair"; symbol: string; interval: string }
  | { type: "hydrate"; account: LiveEngineState["account"] };

function reducer(state: LiveEngineState, action: Action): LiveEngineState {
  switch (action.type) {
    case "loadBars":
      return { ...state, bars: action.bars };
    case "barUpdate": {
      const newBars = updateBars(state.bars, action.bar, action.isClosed);
      let s = { ...state, bars: newBars };
      s = checkFills(s, action.bar);
      s = chargeFunding(s, Date.now());
      if (action.isClosed) {
        s = recordEquity(s, action.bar);
      }
      return s;
    }
    case "place":
      return placeOrder(state, action.draft);
    case "cancel":
      return cancelOrder(state, action.orderId);
    case "close":
      return closePosition(state, action.positionId, action.fraction);
    case "resetAccount":
      return resetAccountFn(state, action.balance);
    case "switchPair":
      return { ...state, symbol: action.symbol, interval: action.interval, bars: [] };
    case "hydrate":
      return { ...state, account: action.account };
    default:
      return state;
  }
}

function loadPersistedAccount(): LiveEngineState["account"] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const account = JSON.parse(raw) as LiveEngineState["account"];
    account.positions = account.positions.map((p) => ({
      ...p,
      entryFee: p.entryFee ?? 0,
      fundingPaid: p.fundingPaid ?? 0,
      lastFundingMs: p.lastFundingMs ?? p.openedAtMs ?? Date.now(),
    }));
    account.closedTrades = account.closedTrades.map((t) => ({
      ...t,
      leverage: t.leverage ?? 10,
      margin: t.margin ?? 0,
      tp: t.tp ?? null,
      sl: t.sl ?? null,
      rr: t.rr ?? null,
      pnlRaw: t.pnlRaw ?? t.pnl ?? 0,
      fees: t.fees ?? 0,
    }));
    return account;
  } catch {
    return null;
  }
}

export function useEngine(initialSymbol = "BTCUSDT", initialInterval = "5m", initialBalance = DEFAULT_BALANCE) {
  const [state, dispatch] = useReducer(
    reducer,
    null,
    () => freshState(initialSymbol, initialInterval, initialBalance)
  );

  const prevClosedCountRef = useRef(-1);
  const onNewTradeRef = useRef<((trade: ClosedTrade) => void) | null>(null);
  // Track hydration: 0 = not started, 1 = dispatched, 2 = applied
  const hydratePhase = useRef(0);

  // Hydrate on mount
  useEffect(() => {
    const saved = loadPersistedAccount();
    if (saved) {
      dispatch({ type: "hydrate", account: saved });
      prevClosedCountRef.current = saved.closedTrades.length;
      hydratePhase.current = 1; // dispatched, waiting for re-render
    } else {
      prevClosedCountRef.current = 0;
      hydratePhase.current = 2; // nothing to hydrate, ready immediately
    }
  }, []);

  // Persist — skip until hydration is fully applied (phase 2)
  useEffect(() => {
    if (hydratePhase.current === 0) return; // not started yet
    if (hydratePhase.current === 1) {
      // Hydrate was dispatched but this render still has the old state.
      // The NEXT render will have the hydrated state. Skip this one.
      hydratePhase.current = 2;
      return;
    }
    // Phase 2: safe to persist
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.account)); } catch { /* */ }
  }, [state.account]);

  // Detect new closed trades — inline (not in effect) for reliability
  const currentClosedCount = state.account.closedTrades.length;
  if (prevClosedCountRef.current >= 0 && currentClosedCount > prevClosedCountRef.current) {
    const newCount = currentClosedCount - prevClosedCountRef.current;
    const newTrades = state.account.closedTrades.slice(0, newCount);
    Promise.resolve().then(() => {
      for (const trade of newTrades) {
        onNewTradeRef.current?.(trade);
      }
    });
  }
  if (prevClosedCountRef.current >= 0) {
    prevClosedCountRef.current = currentClosedCount;
  }

  // Public API
  const loadBars = useCallback((bars: Kline[]) => dispatch({ type: "loadBars", bars }), []);
  const barUpdate = useCallback((bar: Kline, isClosed: boolean) => dispatch({ type: "barUpdate", bar, isClosed }), []);
  const place = useCallback((draft: OrderDraft) => dispatch({ type: "place", draft }), []);
  const cancel = useCallback((orderId: string) => dispatch({ type: "cancel", orderId }), []);
  const close = useCallback(
    (positionId: string, fraction = 1) => dispatch({ type: "close", positionId, fraction }),
    []
  );
  const switchPair = useCallback(
    (symbol: string, interval: string) => dispatch({ type: "switchPair", symbol, interval }),
    []
  );
  const doResetAccount = useCallback(
    (balance = DEFAULT_BALANCE) => {
      dispatch({ type: "resetAccount", balance });
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
      prevClosedCountRef.current = 0;
    },
    []
  );
  const setOnNewTrade = useCallback((cb: (trade: ClosedTrade) => void) => {
    onNewTradeRef.current = cb;
  }, []);

  return {
    state,
    loadBars,
    barUpdate,
    place,
    cancel,
    close,
    switchPair,
    resetAccount: doResetAccount,
    selectAccountStats: () => selectAccountStats(state),
    selectMarkPnl: (pos: LiveEngineState["account"]["positions"][0]) => selectMarkPnl(state, pos),
    setOnNewTrade,
  };
}

export type EngineHook = ReturnType<typeof useEngine>;
