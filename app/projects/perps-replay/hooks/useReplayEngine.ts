"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  EngineState,
  OrderDraft,
  cancelOrder,
  closePosition,
  freshState,
  loadSession,
  placeOrder,
  resetAccount,
  seekTo,
  setPlaying,
  setSpeed,
  tickForward,
} from "../lib/engine";
import { Kline, defaultMonthRange, loadKlinesRange } from "../lib/kline";
import { Interval } from "../lib/symbols";
import { load, save } from "../lib/storage";

type Action =
  | { type: "loadBars"; bars: Kline[] }
  | { type: "tick" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "speed"; value: number }
  | { type: "seek"; cursor: number }
  | { type: "place"; draft: OrderDraft }
  | { type: "cancel"; orderId: string }
  | { type: "close"; positionId: string; fraction?: number }
  | { type: "resetAccount" }
  | { type: "switchPair"; symbol: string; interval: Interval }
  | { type: "hydrate"; cursor: number; account: EngineState["account"] };

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case "loadBars":
      return loadSession(state, action.bars);
    case "tick":
      return tickForward(state);
    case "play":
      return setPlaying(state, true);
    case "pause":
      return setPlaying(state, false);
    case "speed":
      return setSpeed(state, action.value);
    case "seek":
      return seekTo(state, action.cursor);
    case "place":
      return placeOrder(state, action.draft);
    case "cancel":
      return cancelOrder(state, action.orderId);
    case "close":
      return closePosition(state, action.positionId, action.fraction ?? 1);
    case "resetAccount":
      return resetAccount(state);
    case "switchPair":
      return freshState(action.symbol, action.interval);
    case "hydrate":
      return { ...state, cursor: action.cursor, account: action.account };
  }
}

export type ReplayHook = ReturnType<typeof useReplayEngine>;

export function useReplayEngine(initialSymbol: string, initialInterval: Interval) {
  const [state, dispatch] = useReducer(
    reducer,
    null,
    () => freshState(initialSymbol, initialInterval)
  );

  // ───── range pickers (separate from bars so the user can change range) ─────
  const initialRangeRef = useRef(defaultMonthRange(3));
  const rangeRef = useRef(initialRangeRef.current);
  const [, forceRerender] = useReducer((x: number) => x + 1, 0);

  const setRange = useCallback((from: string, to: string) => {
    rangeRef.current = { from, to };
    forceRerender();
  }, []);

  // ───── play loop ─────
  useEffect(() => {
    if (!state.playing) return;
    if (state.bars.length === 0) return;
    const ms = Math.max(16, 1000 / Math.max(0.5, state.speedBarsPerSec));
    const id = setInterval(() => dispatch({ type: "tick" }), ms);
    return () => clearInterval(id);
  }, [state.playing, state.speedBarsPerSec, state.bars.length]);

  // ───── bar loader: re-fetch when symbol/interval/range changes ─────
  const loadingRef = useRef(false);
  const [loadKey, bumpLoadKey] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    let cancelled = false;
    loadingRef.current = true;
    bumpLoadKey();
    (async () => {
      try {
        const bars = await loadKlinesRange(
          state.symbol,
          state.interval as Interval,
          rangeRef.current.from,
          rangeRef.current.to
        );
        if (cancelled) return;
        dispatch({ type: "loadBars", bars });

        // Try to hydrate persisted account/cursor for this symbol+interval, but
        // ONLY if the persisted range matches — otherwise the cursor index is
        // meaningless against the new bar set.
        const persisted = load(state.symbol, state.interval);
        if (
          persisted &&
          persisted.fromMonth === rangeRef.current.from &&
          persisted.toMonth === rangeRef.current.to &&
          persisted.cursor < bars.length
        ) {
          dispatch({
            type: "hydrate",
            cursor: persisted.cursor,
            account: persisted.account,
          });
        }
      } finally {
        loadingRef.current = false;
        bumpLoadKey();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.symbol, state.interval, rangeRef.current.from, rangeRef.current.to]);

  // ───── persist on change (debounced via rIC) ─────
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.bars.length === 0) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      save(state.symbol, state.interval, {
        account: state.account,
        cursor: state.cursor,
        fromMonth: rangeRef.current.from,
        toMonth: rangeRef.current.to,
      });
    }, 250);
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [state.account, state.cursor, state.symbol, state.interval, state.bars.length]);

  // ───── action helpers ─────
  const play = useCallback(() => dispatch({ type: "play" }), []);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const step = useCallback(() => dispatch({ type: "tick" }), []);
  const setSpeedFn = useCallback(
    (v: number) => dispatch({ type: "speed", value: v }),
    []
  );
  const seek = useCallback(
    (cursor: number) => dispatch({ type: "seek", cursor }),
    []
  );
  const place = useCallback(
    (draft: OrderDraft) => dispatch({ type: "place", draft }),
    []
  );
  const cancel = useCallback(
    (orderId: string) => dispatch({ type: "cancel", orderId }),
    []
  );
  const close = useCallback(
    (positionId: string, fraction = 1) =>
      dispatch({ type: "close", positionId, fraction }),
    []
  );
  const resetAcct = useCallback(
    () => dispatch({ type: "resetAccount" }),
    []
  );
  const switchPair = useCallback(
    (symbol: string, interval: Interval) =>
      dispatch({ type: "switchPair", symbol, interval }),
    []
  );

  return {
    state,
    range: rangeRef.current,
    setRange,
    loading: loadingRef.current,
    loadKey,
    play,
    pause,
    step,
    setSpeed: setSpeedFn,
    seek,
    place,
    cancel,
    close,
    resetAccount: resetAcct,
    switchPair,
  };
}
