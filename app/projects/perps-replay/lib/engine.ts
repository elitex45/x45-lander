// Pure paper-trading engine. No React, no DOM, no fetch.
// Each transition is a pure function that returns a new EngineState.

import type { Kline } from "./kline";
import { getSymbolMeta } from "./symbols";

export type Side = "long" | "short";
export type OrderType = "market" | "limit" | "stop" | "tp" | "sl";

export type Position = {
  id: string;
  symbol: string;
  side: Side;
  size: number; // base asset units
  entryPx: number;
  leverage: number;
  marginUsed: number; // USDT, isolated
  liquidationPx: number;
  openedAtMs: number;
};

export type Order = {
  id: string;
  symbol: string;
  side: Side; // direction the order will execute (long = buy, short = sell)
  type: OrderType;
  size: number; // base asset units
  triggerPx: number;
  reduceOnly: boolean;
  parentPositionId?: string;
  leverage: number;
  createdAtMs: number;
  // For limit/stop orders, the user may pre-attach TP/SL prices that should
  // be wired up to the resulting position once the order fires.
  pendingTp?: number;
  pendingSl?: number;
};

export type ClosedTrade = {
  id: string;
  symbol: string;
  side: Side;
  size: number;
  entryPx: number;
  exitPx: number;
  pnl: number; // realized USDT
  reason: "manual" | "limit" | "stop" | "tp" | "sl" | "liquidation";
  openedAtMs: number;
  closedAtMs: number;
};

export type EquityPoint = { t: number; equity: number };

export type Account = {
  startingBalance: number;
  balance: number; // realized USDT (free + margin used; we subtract margin to get free)
  positions: Position[];
  openOrders: Order[];
  closedTrades: ClosedTrade[];
  equityCurve: EquityPoint[];
};

export type EngineState = {
  symbol: string;
  interval: string;
  bars: Kline[]; // full loaded range — chart only sees bars.slice(0, cursor+1)
  cursor: number; // current bar index
  playing: boolean;
  speedBarsPerSec: number;
  account: Account;
};

export const DEFAULT_BALANCE = 10_000;

export function freshAccount(): Account {
  return {
    startingBalance: DEFAULT_BALANCE,
    balance: DEFAULT_BALANCE,
    positions: [],
    openOrders: [],
    closedTrades: [],
    equityCurve: [],
  };
}

export function freshState(symbol: string, interval: string): EngineState {
  return {
    symbol,
    interval,
    bars: [],
    cursor: 0,
    playing: false,
    speedBarsPerSec: 2,
    account: freshAccount(),
  };
}

// ───────────────────────── helpers ─────────────────────────

let idCounter = 0;
function newId(prefix: string) {
  idCounter++;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

function freeMargin(account: Account): number {
  const used = account.positions.reduce((s, p) => s + p.marginUsed, 0);
  return account.balance - used;
}

function unrealizedPnl(p: Position, mark: number): number {
  return p.side === "long"
    ? (mark - p.entryPx) * p.size
    : (p.entryPx - mark) * p.size;
}

// Exported so the UI can preview liq before the user submits an order.
// Simplified isolated-margin liquidation:
//   long:  entry * (1 - 1/lev + mmr)
//   short: entry * (1 + 1/lev - mmr)
export function calcLiquidationPx(
  side: Side,
  entryPx: number,
  leverage: number,
  mmr: number
): number {
  if (side === "long") return entryPx * (1 - 1 / leverage + mmr);
  return entryPx * (1 + 1 / leverage - mmr);
}

// Single source of truth for translating the user's input (margin in USDT)
// into a position size (base units). Exported so:
//   1. OrderTicket can compute size + exposure for display & submission
//   2. tests can verify the relationship is consistent with engine PnL math
//
// Definition: the user always types the COLLATERAL they're putting on the
// line. Exposure (notional) = margin × leverage. Size in base units =
// exposure / fillPx.
export function computeOrderSize(
  marginUsdt: number,
  leverage: number,
  fillPx: number
): { exposure: number; size: number } {
  if (marginUsdt <= 0 || leverage <= 0 || fillPx <= 0) {
    return { exposure: 0, size: 0 };
  }
  const exposure = marginUsdt * leverage;
  const size = exposure / fillPx;
  return { exposure, size };
}

function totalEquity(account: Account, mark: number, symbol: string): number {
  let unreal = 0;
  for (const p of account.positions) {
    if (p.symbol === symbol) unreal += unrealizedPnl(p, mark);
  }
  return account.balance + unreal;
}

// ───────────────────────── transitions ─────────────────────────

export function loadSession(state: EngineState, bars: Kline[]): EngineState {
  // New data — keep account (positions persist across sessions), reset cursor.
  return { ...state, bars, cursor: 0, playing: false };
}

export function setSpeed(state: EngineState, speedBarsPerSec: number): EngineState {
  return { ...state, speedBarsPerSec };
}

export function setPlaying(state: EngineState, playing: boolean): EngineState {
  return { ...state, playing };
}

export function seekTo(state: EngineState, cursor: number): EngineState {
  if (state.bars.length === 0) return state;
  const c = Math.max(0, Math.min(state.bars.length - 1, cursor));
  return { ...state, cursor: c };
}

export function resetAccount(state: EngineState): EngineState {
  return { ...state, account: freshAccount() };
}

export type OrderDraft = {
  side: Side;
  type: OrderType;
  size: number; // base asset units
  triggerPx?: number; // required for non-market
  leverage: number;
  reduceOnly?: boolean;
  parentPositionId?: string;
  // Optional auto-attached TP/SL prices. For market orders these wire up to
  // the resulting position immediately. For limit/stop orders they are stored
  // on the pending order and attached the moment it fires.
  tp?: number;
  sl?: number;
};

export function placeOrder(state: EngineState, draft: OrderDraft): EngineState {
  if (state.bars.length === 0) return state;
  const bar = state.bars[state.cursor];
  if (!bar) return state;
  const meta = getSymbolMeta(state.symbol);
  if (!meta) return state;
  if (draft.size <= 0) return state;
  if (draft.leverage < 1 || draft.leverage > meta.maxLeverage) return state;

  if (draft.type === "market") {
    const opened = openPositionAt(
      state,
      draft.side,
      draft.size,
      draft.leverage,
      bar.close,
      bar.closeTime
    );
    if (!opened.position) return opened.state;
    return attachTpSl(opened.state, opened.position, draft.tp, draft.sl, bar.closeTime);
  }

  // Pending order
  if (draft.triggerPx === undefined || draft.triggerPx <= 0) return state;
  const order: Order = {
    id: newId("ord"),
    symbol: state.symbol,
    side: draft.side,
    type: draft.type,
    size: draft.size,
    triggerPx: draft.triggerPx,
    reduceOnly: draft.reduceOnly ?? (draft.type === "tp" || draft.type === "sl"),
    parentPositionId: draft.parentPositionId,
    leverage: draft.leverage,
    createdAtMs: bar.closeTime,
    pendingTp: draft.tp,
    pendingSl: draft.sl,
  };
  return {
    ...state,
    account: { ...state.account, openOrders: [...state.account.openOrders, order] },
  };
}

// Register reduceOnly TP/SL orders against an existing position.
function attachTpSl(
  state: EngineState,
  pos: Position,
  tp: number | undefined,
  sl: number | undefined,
  ts: number
): EngineState {
  let s = state;
  const closeSide: Side = pos.side === "long" ? "short" : "long";
  const newOrders: Order[] = [];
  if (tp && tp > 0) {
    newOrders.push({
      id: newId("ord"),
      symbol: pos.symbol,
      side: closeSide,
      type: "tp",
      size: pos.size,
      triggerPx: tp,
      reduceOnly: true,
      parentPositionId: pos.id,
      leverage: pos.leverage,
      createdAtMs: ts,
    });
  }
  if (sl && sl > 0) {
    newOrders.push({
      id: newId("ord"),
      symbol: pos.symbol,
      side: closeSide,
      type: "sl",
      size: pos.size,
      triggerPx: sl,
      reduceOnly: true,
      parentPositionId: pos.id,
      leverage: pos.leverage,
      createdAtMs: ts,
    });
  }
  if (newOrders.length === 0) return s;
  s = {
    ...s,
    account: {
      ...s.account,
      openOrders: [...s.account.openOrders, ...newOrders],
    },
  };
  return s;
}

export function cancelOrder(state: EngineState, orderId: string): EngineState {
  return {
    ...state,
    account: {
      ...state.account,
      openOrders: state.account.openOrders.filter((o) => o.id !== orderId),
    },
  };
}

export function closePosition(
  state: EngineState,
  positionId: string,
  fraction = 1
): EngineState {
  const bar = state.bars[state.cursor];
  if (!bar) return state;
  const pos = state.account.positions.find((p) => p.id === positionId);
  if (!pos) return state;
  return realizeClose(state, pos, bar.close, Math.max(0, Math.min(1, fraction)), bar.closeTime, "manual");
}

// Open a new position at price `px`. The fill price is whatever the caller
// passes (close for market opens, trigger for limit/stop fills).
// Returns both the new state AND the new position object so callers can
// attach reduceOnly TP/SL orders to it without searching the array.
function openPositionAt(
  state: EngineState,
  side: Side,
  size: number,
  leverage: number,
  px: number,
  ts: number
): { state: EngineState; position: Position | null } {
  const meta = getSymbolMeta(state.symbol);
  if (!meta) return { state, position: null };
  const notional = px * size;
  const margin = notional / leverage;
  if (margin > freeMargin(state.account)) {
    // not enough free margin — silently no-op (UI should pre-check)
    return { state, position: null };
  }
  const liquidationPx = calcLiquidationPx(side, px, leverage, meta.mmr);
  const pos: Position = {
    id: newId("pos"),
    symbol: state.symbol,
    side,
    size,
    entryPx: px,
    leverage,
    marginUsed: margin,
    liquidationPx,
    openedAtMs: ts,
  };
  return {
    state: {
      ...state,
      account: {
        ...state.account,
        positions: [...state.account.positions, pos],
      },
    },
    position: pos,
  };
}

function realizeClose(
  state: EngineState,
  pos: Position,
  exitPx: number,
  fraction: number,
  ts: number,
  reason: ClosedTrade["reason"]
): EngineState {
  const closeSize = pos.size * fraction;
  const pnl =
    pos.side === "long"
      ? (exitPx - pos.entryPx) * closeSize
      : (pos.entryPx - exitPx) * closeSize;
  const releasedMargin = pos.marginUsed * fraction;

  const closed: ClosedTrade = {
    id: newId("cls"),
    symbol: pos.symbol,
    side: pos.side,
    size: closeSize,
    entryPx: pos.entryPx,
    exitPx,
    pnl,
    reason,
    openedAtMs: pos.openedAtMs,
    closedAtMs: ts,
  };

  let newPositions: Position[];
  if (fraction >= 0.9999) {
    newPositions = state.account.positions.filter((p) => p.id !== pos.id);
  } else {
    newPositions = state.account.positions.map((p) =>
      p.id === pos.id
        ? {
            ...p,
            size: p.size - closeSize,
            marginUsed: p.marginUsed - releasedMargin,
          }
        : p
    );
  }

  // If the position is fully closed, also drop any TP/SL children pointing at it.
  const newOrders =
    fraction >= 0.9999
      ? state.account.openOrders.filter((o) => o.parentPositionId !== pos.id)
      : state.account.openOrders;

  return {
    ...state,
    account: {
      ...state.account,
      balance: state.account.balance + pnl,
      positions: newPositions,
      openOrders: newOrders,
      closedTrades: [closed, ...state.account.closedTrades],
    },
  };
}

// Advance one bar. Order matters: trigger orders, then check liquidations,
// then mark equity curve. We use the new bar's [low, high] range to decide
// fills (simple but reasonable for replay practice).
export function tickForward(state: EngineState): EngineState {
  if (state.bars.length === 0) return state;
  if (state.cursor >= state.bars.length - 1) {
    return { ...state, playing: false };
  }
  let s = { ...state, cursor: state.cursor + 1 };
  const bar = s.bars[s.cursor];

  // 1. Snapshot orders that fire on this bar, then remove them up-front so the
  //    application steps below operate on a clean openOrders list.
  const fired: Order[] = [];
  const surviving: Order[] = [];
  for (const o of s.account.openOrders) {
    if (
      o.symbol === s.symbol &&
      bar.low <= o.triggerPx &&
      o.triggerPx <= bar.high
    ) {
      fired.push(o);
    } else {
      surviving.push(o);
    }
  }
  s = { ...s, account: { ...s.account, openOrders: surviving } };

  for (const o of fired) {
    if (o.reduceOnly && o.parentPositionId) {
      const parent = s.account.positions.find((p) => p.id === o.parentPositionId);
      if (parent) {
        const fraction = Math.min(1, o.size / parent.size);
        const reason: ClosedTrade["reason"] =
          o.type === "tp" ? "tp" : o.type === "sl" ? "sl" : "limit";
        s = realizeClose(s, parent, o.triggerPx, fraction, bar.closeTime, reason);
      }
    } else {
      const opened = openPositionAt(
        s,
        o.side,
        o.size,
        o.leverage,
        o.triggerPx,
        bar.closeTime
      );
      s = opened.state;
      if (opened.position && (o.pendingTp || o.pendingSl)) {
        s = attachTpSl(s, opened.position, o.pendingTp, o.pendingSl, bar.closeTime);
      }
    }
  }

  // 2. Check liquidations on every open position for this symbol.
  for (const pos of [...s.account.positions]) {
    if (pos.symbol !== s.symbol) continue;
    const liq =
      pos.side === "long"
        ? bar.low <= pos.liquidationPx
        : bar.high >= pos.liquidationPx;
    if (liq) {
      s = realizeClose(s, pos, pos.liquidationPx, 1, bar.closeTime, "liquidation");
    }
  }

  // 3. Equity curve point.
  const equity = totalEquity(s.account, bar.close, s.symbol);
  s = {
    ...s,
    account: {
      ...s.account,
      equityCurve: [...s.account.equityCurve, { t: bar.closeTime, equity }],
    },
  };

  return s;
}

// Convenience selector for the UI.
export function selectAccountStats(state: EngineState) {
  const bar = state.bars[state.cursor];
  const mark = bar?.close ?? 0;
  const used = state.account.positions.reduce((s, p) => s + p.marginUsed, 0);
  const unreal = state.account.positions.reduce(
    (s, p) => (p.symbol === state.symbol ? s + unrealizedPnl(p, mark) : s),
    0
  );
  return {
    balance: state.account.balance,
    equity: state.account.balance + unreal,
    marginUsed: used,
    freeMargin: state.account.balance - used,
    unrealizedPnl: unreal,
    mark,
  };
}

export function selectMarkPnl(state: EngineState, pos: Position): number {
  const bar = state.bars[state.cursor];
  if (!bar) return 0;
  return unrealizedPnl(pos, bar.close);
}
