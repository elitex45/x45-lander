// Live paper-trading engine. Adapted from perps-replay/lib/engine.ts
// but operates on streaming bars instead of a replay cursor.
// Pure functions — no React, no DOM, no fetch.
//
// Simulates: taker fees on open/close, 8-hourly funding rate.

export type Side = "long" | "short";
export type OrderType = "market" | "limit" | "stop" | "tp" | "sl";

// Fees — Binance-style
export const TAKER_FEE = 0.00045; // 0.045% taker
export const MAKER_FEE = 0.0002;  // 0.02% maker
// Funding rate — average perp funding rate (applied every 8h)
export const DEFAULT_FUNDING_RATE = 0.0001; // 0.01% per 8h (typical)
export const FUNDING_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours

export type Kline = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type Position = {
  id: string;
  symbol: string;
  side: Side;
  size: number;
  entryPx: number;
  leverage: number;
  marginUsed: number;
  liquidationPx: number;
  openedAtMs: number;
  tp?: number;
  sl?: number;
  entryFee: number; // fee paid on entry
  fundingPaid: number; // cumulative funding paid
  lastFundingMs: number; // last time funding was charged
};

export type Order = {
  id: string;
  symbol: string;
  side: Side;
  type: OrderType;
  size: number;
  triggerPx: number;
  reduceOnly: boolean;
  parentPositionId?: string;
  leverage: number;
  createdAtMs: number;
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
  leverage: number;
  margin: number;
  tp: number | null;
  sl: number | null;
  rr: number | null;
  pnlRaw: number; // before fees
  fees: number; // total fees (entry + exit + funding)
  pnl: number; // net PnL after fees
  reason: "manual" | "limit" | "stop" | "tp" | "sl" | "liquidation";
  openedAtMs: number;
  closedAtMs: number;
};

export type EquityPoint = { t: number; equity: number };

export type Account = {
  startingBalance: number;
  balance: number;
  positions: Position[];
  openOrders: Order[];
  closedTrades: ClosedTrade[];
  equityCurve: EquityPoint[];
};

export type LiveEngineState = {
  symbol: string;
  interval: string;
  bars: Kline[];
  account: Account;
  connected: boolean;
};

export type SymbolMeta = {
  symbol: string;
  display: string;
  pricePrecision: number;
  maxLeverage: number;
  mmr: number;
};

export const LIVE_SYMBOLS: SymbolMeta[] = [
  { symbol: "BTCUSDT", display: "BTC-PERP", pricePrecision: 2, maxLeverage: 125, mmr: 0.004 },
  { symbol: "ETHUSDT", display: "ETH-PERP", pricePrecision: 2, maxLeverage: 100, mmr: 0.005 },
  { symbol: "SOLUSDT", display: "SOL-PERP", pricePrecision: 4, maxLeverage: 75, mmr: 0.005 },
  { symbol: "BNBUSDT", display: "BNB-PERP", pricePrecision: 2, maxLeverage: 75, mmr: 0.005 },
  { symbol: "XRPUSDT", display: "XRP-PERP", pricePrecision: 4, maxLeverage: 75, mmr: 0.005 },
  { symbol: "DOGEUSDT", display: "DOGE-PERP", pricePrecision: 5, maxLeverage: 75, mmr: 0.005 },
  { symbol: "SUIUSDT", display: "SUI-PERP", pricePrecision: 4, maxLeverage: 50, mmr: 0.005 },
  { symbol: "AVAXUSDT", display: "AVAX-PERP", pricePrecision: 4, maxLeverage: 75, mmr: 0.005 },
  { symbol: "LINKUSDT", display: "LINK-PERP", pricePrecision: 3, maxLeverage: 75, mmr: 0.005 },
  { symbol: "ADAUSDT", display: "ADA-PERP", pricePrecision: 4, maxLeverage: 75, mmr: 0.005 },
  { symbol: "ARBUSDT", display: "ARB-PERP", pricePrecision: 4, maxLeverage: 50, mmr: 0.005 },
  { symbol: "OPUSDT", display: "OP-PERP", pricePrecision: 4, maxLeverage: 50, mmr: 0.005 },
  { symbol: "APTUSDT", display: "APT-PERP", pricePrecision: 4, maxLeverage: 50, mmr: 0.005 },
  { symbol: "NEARUSDT", display: "NEAR-PERP", pricePrecision: 4, maxLeverage: 50, mmr: 0.005 },
  { symbol: "WIFUSDT", display: "WIF-PERP", pricePrecision: 4, maxLeverage: 50, mmr: 0.005 },
  { symbol: "TRUMPUSDT", display: "TRUMP-PERP", pricePrecision: 3, maxLeverage: 50, mmr: 0.005 },
];

export const LIVE_INTERVALS = ["1m", "5m", "15m", "1h", "4h"] as const;
export type LiveInterval = (typeof LIVE_INTERVALS)[number];

export function getSymbolMeta(symbol: string): SymbolMeta | undefined {
  return LIVE_SYMBOLS.find((s) => s.symbol === symbol);
}

export const DEFAULT_BALANCE = 10_000;

export function freshAccount(balance = DEFAULT_BALANCE): Account {
  return {
    startingBalance: balance,
    balance,
    positions: [],
    openOrders: [],
    closedTrades: [],
    equityCurve: [],
  };
}

export function freshState(symbol: string, interval: string, balance = DEFAULT_BALANCE): LiveEngineState {
  return { symbol, interval, bars: [], account: freshAccount(balance), connected: false };
}

// ─── helpers ───

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

export function calcLiquidationPx(side: Side, entryPx: number, leverage: number, mmr: number): number {
  if (side === "long") return entryPx * (1 - 1 / leverage + mmr);
  return entryPx * (1 + 1 / leverage - mmr);
}

export function computeOrderSize(marginUsdt: number, leverage: number, fillPx: number): { exposure: number; size: number } {
  if (marginUsdt <= 0 || leverage <= 0 || fillPx <= 0) return { exposure: 0, size: 0 };
  const exposure = marginUsdt * leverage;
  const size = exposure / fillPx;
  return { exposure, size };
}

// ─── transitions ───

export type OrderDraft = {
  side: Side;
  type: OrderType;
  size: number;
  triggerPx?: number;
  leverage: number;
  reduceOnly?: boolean;
  parentPositionId?: string;
  tp?: number;
  sl?: number;
};

export function placeOrder(state: LiveEngineState, draft: OrderDraft): LiveEngineState {
  if (state.bars.length === 0) return state;
  const bar = state.bars[state.bars.length - 1];
  const meta = getSymbolMeta(state.symbol);
  if (!meta || draft.size <= 0) return state;
  if (draft.leverage < 1 || draft.leverage > meta.maxLeverage) return state;

  if (draft.type === "market") {
    const opened = openPositionAt(state, draft.side, draft.size, draft.leverage, bar.close, Date.now(), draft.tp, draft.sl);
    if (!opened.position) return opened.state;
    return attachTpSl(opened.state, opened.position, draft.tp, draft.sl, Date.now());
  }

  if (draft.triggerPx === undefined || draft.triggerPx <= 0) return state;
  const order: Order = {
    id: newId("ord"), symbol: state.symbol, side: draft.side, type: draft.type,
    size: draft.size, triggerPx: draft.triggerPx,
    reduceOnly: draft.reduceOnly ?? (draft.type === "tp" || draft.type === "sl"),
    parentPositionId: draft.parentPositionId, leverage: draft.leverage,
    createdAtMs: Date.now(), pendingTp: draft.tp, pendingSl: draft.sl,
  };
  return { ...state, account: { ...state.account, openOrders: [...state.account.openOrders, order] } };
}

function openPositionAt(
  state: LiveEngineState, side: Side, size: number, leverage: number,
  px: number, ts: number, tp?: number, sl?: number
): { state: LiveEngineState; position: Position | null } {
  const meta = getSymbolMeta(state.symbol);
  if (!meta) return { state, position: null };
  const notional = px * size;
  const margin = notional / leverage;
  const entryFee = notional * TAKER_FEE;
  // Check margin + entry fee fit, but DON'T deduct fee from balance now.
  // All fees are deducted at close time so PnL is the true net number.
  if (margin + entryFee > freeMargin(state.account)) return { state, position: null };
  const liquidationPx = calcLiquidationPx(side, px, leverage, meta.mmr);
  const pos: Position = {
    id: newId("pos"), symbol: state.symbol, side, size, entryPx: px,
    leverage, marginUsed: margin, liquidationPx, openedAtMs: ts,
    tp, sl, entryFee, fundingPaid: 0, lastFundingMs: ts,
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

function attachTpSl(state: LiveEngineState, pos: Position, tp: number | undefined, sl: number | undefined, ts: number): LiveEngineState {
  const closeSide: Side = pos.side === "long" ? "short" : "long";
  const newOrders: Order[] = [];
  if (tp && tp > 0) {
    newOrders.push({
      id: newId("ord"), symbol: pos.symbol, side: closeSide, type: "tp",
      size: pos.size, triggerPx: tp, reduceOnly: true, parentPositionId: pos.id,
      leverage: pos.leverage, createdAtMs: ts,
    });
  }
  if (sl && sl > 0) {
    newOrders.push({
      id: newId("ord"), symbol: pos.symbol, side: closeSide, type: "sl",
      size: pos.size, triggerPx: sl, reduceOnly: true, parentPositionId: pos.id,
      leverage: pos.leverage, createdAtMs: ts,
    });
  }
  if (newOrders.length === 0) return state;
  return { ...state, account: { ...state.account, openOrders: [...state.account.openOrders, ...newOrders] } };
}

export function cancelOrder(state: LiveEngineState, orderId: string): LiveEngineState {
  return { ...state, account: { ...state.account, openOrders: state.account.openOrders.filter((o) => o.id !== orderId) } };
}

export function closePosition(state: LiveEngineState, positionId: string, fraction = 1): LiveEngineState {
  if (state.bars.length === 0) return state;
  const bar = state.bars[state.bars.length - 1];
  const pos = state.account.positions.find((p) => p.id === positionId);
  if (!pos) return state;
  return realizeClose(state, pos, bar.close, Math.max(0, Math.min(1, fraction)), Date.now(), "manual");
}

function realizeClose(
  state: LiveEngineState, pos: Position, exitPx: number,
  fraction: number, ts: number, reason: ClosedTrade["reason"]
): LiveEngineState {
  const closeSize = pos.size * fraction;
  const notional = exitPx * closeSize;
  const pnlRaw = pos.side === "long"
    ? (exitPx - pos.entryPx) * closeSize
    : (pos.entryPx - exitPx) * closeSize;

  // ALL fees deducted at close time — entry fee, exit fee, funding.
  // This makes `pnl` the true net PnL with no hidden deductions.
  const exitFee = notional * TAKER_FEE;
  const entryFeeShare = pos.entryFee * fraction;
  const fundingShare = pos.fundingPaid * fraction;
  const totalFees = entryFeeShare + exitFee + fundingShare;
  const pnl = pnlRaw - totalFees;

  const releasedMargin = pos.marginUsed * fraction;

  // Compute R:R from actual entry/exit vs SL
  let rr: number | null = null;
  if (pos.sl) {
    const riskPerUnit = Math.abs(pos.entryPx - pos.sl);
    const rewardPerUnit = Math.abs(exitPx - pos.entryPx);
    if (riskPerUnit > 0) {
      rr = rewardPerUnit / riskPerUnit;
      if (pnlRaw < 0) rr = -rr;
    }
  }

  const closed: ClosedTrade = {
    id: newId("cls"), symbol: pos.symbol, side: pos.side, size: closeSize,
    entryPx: pos.entryPx, exitPx, leverage: pos.leverage, margin: releasedMargin,
    tp: pos.tp ?? null, sl: pos.sl ?? null, rr,
    pnlRaw, fees: totalFees, pnl, reason,
    openedAtMs: pos.openedAtMs, closedAtMs: ts,
  };

  let newPositions: Position[];
  if (fraction >= 0.9999) {
    newPositions = state.account.positions.filter((p) => p.id !== pos.id);
  } else {
    newPositions = state.account.positions.map((p) =>
      p.id === pos.id
        ? { ...p, size: p.size - closeSize, marginUsed: p.marginUsed - releasedMargin,
            entryFee: p.entryFee * (1 - fraction), fundingPaid: p.fundingPaid * (1 - fraction) }
        : p
    );
  }

  const newOrders = fraction >= 0.9999
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

// ─── Funding rate ───
// Charges funding every 8 hours on open positions. Longs pay, shorts receive
// (simplified — in reality it depends on the rate sign, but longs-pay is the
// dominant case for crypto perps).
export function chargeFunding(state: LiveEngineState, now: number): LiveEngineState {
  let s = state;
  const newPositions = s.account.positions.map((pos) => {
    if (pos.symbol !== s.symbol) return pos;
    const elapsed = now - pos.lastFundingMs;
    if (elapsed < FUNDING_INTERVAL_MS) return pos;

    // How many funding periods have passed
    const periods = Math.floor(elapsed / FUNDING_INTERVAL_MS);
    const notional = pos.size * pos.entryPx;
    const fundingPerPeriod = notional * DEFAULT_FUNDING_RATE;
    const totalFunding = fundingPerPeriod * periods;

    // Longs pay funding, shorts receive
    const charge = pos.side === "long" ? totalFunding : -totalFunding;

    return {
      ...pos,
      fundingPaid: pos.fundingPaid + charge,
      lastFundingMs: pos.lastFundingMs + periods * FUNDING_INTERVAL_MS,
    };
  });

  // Funding accumulates on the position and is deducted from PnL at
  // close time. Don't touch balance here — avoids double-counting.
  return {
    ...s,
    account: {
      ...s.account,
      positions: newPositions,
    },
  };
}

// ─── Tick processing ───

// Check order fills and liquidations. Called on EVERY tick.
export function checkFills(state: LiveEngineState, bar: Kline): LiveEngineState {
  let s = state;

  const fired: Order[] = [];
  const surviving: Order[] = [];
  for (const o of s.account.openOrders) {
    if (o.symbol === s.symbol && bar.low <= o.triggerPx && o.triggerPx <= bar.high) {
      fired.push(o);
    } else {
      surviving.push(o);
    }
  }
  if (fired.length === 0) return checkLiquidations(s, bar);

  s = { ...s, account: { ...s.account, openOrders: surviving } };

  for (const o of fired) {
    if (o.reduceOnly && o.parentPositionId) {
      const parent = s.account.positions.find((p) => p.id === o.parentPositionId);
      if (parent) {
        const fraction = Math.min(1, o.size / parent.size);
        const reason: ClosedTrade["reason"] =
          o.type === "tp" ? "tp" : o.type === "sl" ? "sl" : "limit";
        s = realizeClose(s, parent, o.triggerPx, fraction, Date.now(), reason);
      }
    } else {
      const opened = openPositionAt(s, o.side, o.size, o.leverage, o.triggerPx, Date.now(), o.pendingTp, o.pendingSl);
      s = opened.state;
      if (opened.position && (o.pendingTp || o.pendingSl)) {
        s = attachTpSl(s, opened.position, o.pendingTp, o.pendingSl, Date.now());
      }
    }
  }

  return checkLiquidations(s, bar);
}

function checkLiquidations(state: LiveEngineState, bar: Kline): LiveEngineState {
  let s = state;
  for (const pos of [...s.account.positions]) {
    if (pos.symbol !== s.symbol) continue;
    const liq = pos.side === "long"
      ? bar.low <= pos.liquidationPx
      : bar.high >= pos.liquidationPx;
    if (liq) {
      s = realizeClose(s, pos, pos.liquidationPx, 1, Date.now(), "liquidation");
    }
  }
  return s;
}

// Record equity curve point. Called only on candle close.
// Matches selectAccountStats: equity = balance + unrealized - pendingFees
export function recordEquity(state: LiveEngineState, bar: Kline): LiveEngineState {
  const mark = bar.close;
  let unreal = 0;
  let pendingFees = 0;
  for (const p of state.account.positions) {
    if (p.symbol !== state.symbol) continue;
    unreal += unrealizedPnl(p, mark);
    const exitNotional = mark * p.size;
    pendingFees += p.entryFee + (exitNotional * TAKER_FEE) + p.fundingPaid;
  }
  const equity = state.account.balance + unreal - pendingFees;
  return {
    ...state,
    account: {
      ...state.account,
      equityCurve: [...state.account.equityCurve, { t: bar.closeTime, equity }],
    },
  };
}

// Update bars array
export function updateBars(bars: Kline[], incoming: Kline, isClosed: boolean): Kline[] {
  if (bars.length === 0) return [incoming];
  const last = bars[bars.length - 1];
  if (last.openTime === incoming.openTime) {
    return [...bars.slice(0, -1), incoming];
  }
  return [...bars, incoming];
}

// ─── Selectors ───

export function selectAccountStats(state: LiveEngineState) {
  const mark = state.bars.length > 0 ? state.bars[state.bars.length - 1].close : 0;
  const used = state.account.positions.reduce((s, p) => s + p.marginUsed, 0);
  // Unrealized PnL includes estimated fees (entry + exit + funding) so the
  // numbers match what you'd actually get if you closed right now.
  let unreal = 0;
  let pendingFees = 0;
  for (const p of state.account.positions) {
    if (p.symbol !== state.symbol) continue;
    unreal += unrealizedPnl(p, mark);
    const exitNotional = mark * p.size;
    pendingFees += p.entryFee + (exitNotional * TAKER_FEE) + p.fundingPaid;
  }
  const netUnreal = unreal - pendingFees;
  return {
    balance: state.account.balance,
    equity: state.account.balance + netUnreal,
    marginUsed: used,
    freeMargin: state.account.balance - used,
    unrealizedPnl: netUnreal,
    mark,
  };
}

export function selectMarkPnl(state: LiveEngineState, pos: Position): number {
  const mark = state.bars.length > 0 ? state.bars[state.bars.length - 1].close : 0;
  return unrealizedPnl(pos, mark);
}

export function resetAccount(state: LiveEngineState, balance = DEFAULT_BALANCE): LiveEngineState {
  return { ...state, account: freshAccount(balance) };
}
