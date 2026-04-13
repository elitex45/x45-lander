import { describe, expect, it } from "vitest";
import {
  freshState,
  placeOrder,
  closePosition,
  cancelOrder,
  checkFills,
  recordEquity,
  chargeFunding,
  updateBars,
  selectAccountStats,
  selectMarkPnl,
  resetAccount,
  calcLiquidationPx,
  computeOrderSize,
  TAKER_FEE,
  DEFAULT_FUNDING_RATE,
  FUNDING_INTERVAL_MS,
  type LiveEngineState,
  type Kline,
} from "@/app/projects/trading-journal/lib/liveEngine";

// ─── helpers ───

function bar(
  openTime: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 100
): Kline {
  return { openTime, open, high, low, close, volume, closeTime: openTime + 60_000 - 1 };
}

function readyState(price = 50000, balance = 10000): LiveEngineState {
  const s = freshState("BTCUSDT", "1h", balance);
  return { ...s, bars: [bar(1000, price, price + 100, price - 100, price)] };
}

function placeMarketLong(
  state: LiveEngineState, margin: number, leverage: number, tp?: number, sl?: number
): LiveEngineState {
  const fillPx = state.bars[state.bars.length - 1].close;
  const { size } = computeOrderSize(margin, leverage, fillPx);
  return placeOrder(state, { side: "long", type: "market", size, leverage, tp, sl });
}

function placeMarketShort(
  state: LiveEngineState, margin: number, leverage: number, tp?: number, sl?: number
): LiveEngineState {
  const fillPx = state.bars[state.bars.length - 1].close;
  const { size } = computeOrderSize(margin, leverage, fillPx);
  return placeOrder(state, { side: "short", type: "market", size, leverage, tp, sl });
}

// ────────────────────────────────────────────────────────────────
// computeOrderSize
// ────────────────────────────────────────────────────────────────

describe("computeOrderSize", () => {
  it("$100 margin × 10x at BTC $50,000", () => {
    const r = computeOrderSize(100, 10, 50000);
    expect(r.exposure).toBe(1000);
    expect(r.size).toBe(1000 / 50000); // exactly 0.02
  });

  it("$200 margin × 50x at BTC $50,000", () => {
    const r = computeOrderSize(200, 50, 50000);
    expect(r.exposure).toBe(10000);
    expect(r.size).toBe(10000 / 50000); // 0.2
  });

  it("$100 margin × 100x at BTC $50,000", () => {
    const r = computeOrderSize(100, 100, 50000);
    expect(r.exposure).toBe(10000);
    expect(r.size).toBe(10000 / 50000); // 0.2
  });

  it("$10 margin × 5x at ETH $3,000", () => {
    const r = computeOrderSize(10, 5, 3000);
    expect(r.exposure).toBe(50);
    expect(r.size).toBeCloseTo(50 / 3000); // 0.01666...
  });

  it("returns zero for invalid inputs", () => {
    expect(computeOrderSize(0, 10, 50000)).toEqual({ exposure: 0, size: 0 });
    expect(computeOrderSize(100, 0, 50000)).toEqual({ exposure: 0, size: 0 });
    expect(computeOrderSize(100, 10, 0)).toEqual({ exposure: 0, size: 0 });
    expect(computeOrderSize(-50, 10, 50000)).toEqual({ exposure: 0, size: 0 });
  });
});

// ────────────────────────────────────────────────────────────────
// calcLiquidationPx — exact values
// ────────────────────────────────────────────────────────────────

describe("calcLiquidationPx", () => {
  // Formula: long = entry * (1 - 1/lev + mmr)
  //          short = entry * (1 + 1/lev - mmr)

  it("long 10x, entry $50,000, mmr 0.004", () => {
    // 50000 * (1 - 0.1 + 0.004) = 50000 * 0.904 = 45200
    expect(calcLiquidationPx("long", 50000, 10, 0.004)).toBe(50000 * 0.904);
  });

  it("short 10x, entry $50,000, mmr 0.004", () => {
    // 50000 * (1 + 0.1 - 0.004) = 50000 * 1.096 = 54800
    expect(calcLiquidationPx("short", 50000, 10, 0.004)).toBe(50000 * 1.096);
  });

  it("long 100x, entry $50,000, mmr 0.004", () => {
    // 50000 * (1 - 0.01 + 0.004) = 50000 * 0.994 = 49700
    expect(calcLiquidationPx("long", 50000, 100, 0.004)).toBe(50000 * 0.994);
  });

  it("short 100x, entry $50,000, mmr 0.004", () => {
    // 50000 * (1 + 0.01 - 0.004) = 50000 * 1.006 = 50300
    expect(calcLiquidationPx("short", 50000, 100, 0.004)).toBe(50000 * 1.006);
  });

  it("long 125x (max BTC), entry $50,000", () => {
    // 50000 * (1 - 0.008 + 0.004) = 50000 * 0.996 = 49800
    expect(calcLiquidationPx("long", 50000, 125, 0.004)).toBe(50000 * 0.996);
  });

  it("higher leverage = tighter liq for longs", () => {
    const liq10 = calcLiquidationPx("long", 50000, 10, 0.004);
    const liq50 = calcLiquidationPx("long", 50000, 50, 0.004);
    const liq100 = calcLiquidationPx("long", 50000, 100, 0.004);
    expect(liq50).toBeGreaterThan(liq10);  // closer to entry
    expect(liq100).toBeGreaterThan(liq50);
  });

  it("higher leverage = tighter liq for shorts", () => {
    const liq10 = calcLiquidationPx("short", 50000, 10, 0.004);
    const liq50 = calcLiquidationPx("short", 50000, 50, 0.004);
    const liq100 = calcLiquidationPx("short", 50000, 100, 0.004);
    expect(liq50).toBeLessThan(liq10);  // closer to entry
    expect(liq100).toBeLessThan(liq50);
  });
});

// ────────────────────────────────────────────────────────────────
// EXACT PnL SCENARIOS — hand-calculated to the penny
// ────────────────────────────────────────────────────────────────

describe("exact PnL: $10 margin, 5x leverage, BTC at $50,000", () => {
  // Setup:
  //   margin = $10, leverage = 5x
  //   notional = $10 * 5 = $50
  //   size = $50 / $50,000 = 0.001 BTC
  //   entry fee = $50 * 0.00045 = $0.0225

  const ENTRY = 50000;
  const MARGIN = 10;
  const LEV = 5;
  const NOTIONAL = MARGIN * LEV; // $50
  const SIZE = NOTIONAL / ENTRY; // 0.001
  const ENTRY_FEE = NOTIONAL * TAKER_FEE; // $0.0225

  it("long — price +2% to $51,000 — manual close", () => {
    let s = readyState(ENTRY, 1000);
    s = placeMarketLong(s, MARGIN, LEV);

    const pos = s.account.positions[0];
    expect(pos.size).toBeCloseTo(SIZE);
    expect(pos.marginUsed).toBeCloseTo(MARGIN);
    expect(pos.entryFee).toBeCloseTo(ENTRY_FEE);

    // Move price +2%
    const EXIT = 51000;
    s = { ...s, bars: [...s.bars, bar(2000, ENTRY, EXIT + 100, ENTRY - 100, EXIT)] };
    s = closePosition(s, pos.id);

    const trade = s.account.closedTrades[0];
    // Raw PnL = (51000 - 50000) * 0.001 = $1.00
    expect(trade.pnlRaw).toBeCloseTo(1.0);

    // Exit fee = $51000 * 0.001 * 0.00045 = $51 * 0.00045 = $0.02295
    const exitNotional = EXIT * SIZE;
    const exitFee = exitNotional * TAKER_FEE;
    expect(exitFee).toBeCloseTo(0.02295);

    // Total fees = entry + exit + funding(0)
    const totalFees = ENTRY_FEE + exitFee;
    expect(trade.fees).toBeCloseTo(totalFees);

    // Net PnL = $1.00 - $0.0225 - $0.02295 = $0.95455
    const expectedNetPnl = 1.0 - totalFees;
    expect(trade.pnl).toBeCloseTo(expectedNetPnl);

    // ROI on margin = $0.955 / $10 = 9.55% (5x leverage on 2% move → ~10% minus fees)
    const roi = (trade.pnl / MARGIN) * 100;
    expect(roi).toBeCloseTo(9.5455, 1);

    // Balance = 1000 + net PnL
    expect(s.account.balance).toBeCloseTo(1000 + expectedNetPnl);
  });

  it("long — price -2% to $49,000 — manual close", () => {
    let s = readyState(ENTRY, 1000);
    s = placeMarketLong(s, MARGIN, LEV);
    const pos = s.account.positions[0];

    const EXIT = 49000;
    s = { ...s, bars: [...s.bars, bar(2000, ENTRY, ENTRY + 100, EXIT - 100, EXIT)] };
    s = closePosition(s, pos.id);

    const trade = s.account.closedTrades[0];
    // Raw PnL = (49000 - 50000) * 0.001 = -$1.00
    expect(trade.pnlRaw).toBeCloseTo(-1.0);

    // Exit fee = $49 * 0.00045 = $0.02205
    const exitFee = (EXIT * SIZE) * TAKER_FEE;
    const totalFees = ENTRY_FEE + exitFee;
    expect(trade.fees).toBeCloseTo(totalFees);

    // Net PnL = -$1.00 - fees = -$1.0455 (loss + fees)
    expect(trade.pnl).toBeCloseTo(-1.0 - totalFees);

    // Balance decreased
    expect(s.account.balance).toBeCloseTo(1000 + trade.pnl);
    expect(s.account.balance).toBeLessThan(999);
  });

  it("short — price -2% to $49,000 — profit", () => {
    let s = readyState(ENTRY, 1000);
    s = placeMarketShort(s, MARGIN, LEV);
    const pos = s.account.positions[0];

    const EXIT = 49000;
    s = { ...s, bars: [...s.bars, bar(2000, ENTRY, ENTRY + 100, EXIT - 100, EXIT)] };
    s = closePosition(s, pos.id);

    const trade = s.account.closedTrades[0];
    // Short PnL = (entry - exit) * size = (50000 - 49000) * 0.001 = $1.00
    expect(trade.pnlRaw).toBeCloseTo(1.0);

    const exitFee = (EXIT * SIZE) * TAKER_FEE;
    const totalFees = ENTRY_FEE + exitFee;
    expect(trade.pnl).toBeCloseTo(1.0 - totalFees);
    expect(trade.pnl).toBeGreaterThan(0);
  });

  it("short — price +2% to $51,000 — loss", () => {
    let s = readyState(ENTRY, 1000);
    s = placeMarketShort(s, MARGIN, LEV);
    const pos = s.account.positions[0];

    const EXIT = 51000;
    s = { ...s, bars: [...s.bars, bar(2000, ENTRY, EXIT + 100, ENTRY - 100, EXIT)] };
    s = closePosition(s, pos.id);

    const trade = s.account.closedTrades[0];
    // Short loss = (50000 - 51000) * 0.001 = -$1.00
    expect(trade.pnlRaw).toBeCloseTo(-1.0);
    expect(trade.pnl).toBeLessThan(-1.0); // net worse because fees added to loss
  });
});

describe("exact PnL: $100 margin, 50x leverage, BTC at $50,000", () => {
  // notional = $5,000, size = 0.1 BTC
  // entry fee = $5000 * 0.00045 = $2.25

  const ENTRY = 50000;
  const MARGIN = 100;
  const LEV = 50;
  const NOTIONAL = 5000;
  const SIZE = 0.1;
  const ENTRY_FEE = NOTIONAL * TAKER_FEE;

  it("long — price +1% to $50,500", () => {
    let s = readyState(ENTRY, 10000);
    s = placeMarketLong(s, MARGIN, LEV);

    const EXIT = 50500;
    s = { ...s, bars: [...s.bars, bar(2000, ENTRY, EXIT + 100, ENTRY - 100, EXIT)] };
    s = closePosition(s, s.account.positions[0].id);

    const trade = s.account.closedTrades[0];
    // Raw = (50500 - 50000) * 0.1 = $50
    expect(trade.pnlRaw).toBeCloseTo(50);
    // Exit fee = $50500 * 0.1 * 0.00045 = $5050 * 0.00045 = $2.2725
    const exitFee = (EXIT * SIZE) * TAKER_FEE;
    const totalFees = ENTRY_FEE + exitFee;
    // Net = $50 - $2.25 - $2.2725 = ~$45.48
    expect(trade.pnl).toBeCloseTo(50 - totalFees);
    expect(trade.fees).toBeCloseTo(totalFees);
    // ROI = ~45.5% on $100 margin for 1% move at 50x (expected ~50% - fees)
    expect((trade.pnl / MARGIN) * 100).toBeCloseTo(45.4775, 0);
  });

  it("long — price -0.5% to $49,750 — loss", () => {
    let s = readyState(ENTRY, 10000);
    s = placeMarketLong(s, MARGIN, LEV);

    const EXIT = 49750;
    s = { ...s, bars: [...s.bars, bar(2000, ENTRY, ENTRY + 100, EXIT - 100, EXIT)] };
    s = closePosition(s, s.account.positions[0].id);

    const trade = s.account.closedTrades[0];
    // Raw = (49750 - 50000) * 0.1 = -$25
    expect(trade.pnlRaw).toBeCloseTo(-25);
    const exitFee = (EXIT * SIZE) * TAKER_FEE;
    const totalFees = ENTRY_FEE + exitFee;
    // Net = -$25 - fees ≈ -$29.49
    expect(trade.pnl).toBeCloseTo(-25 - totalFees);
  });
});

describe("exact PnL: $100 margin, 100x leverage, BTC at $50,000", () => {
  // notional = $10,000, size = 0.2 BTC
  // entry fee = $10000 * 0.00045 = $4.50

  const ENTRY = 50000;
  const MARGIN = 100;
  const LEV = 100;
  const SIZE = 0.2;
  const ENTRY_FEE = 10000 * TAKER_FEE;

  it("long — price +0.5% to $50,250 — big ROI", () => {
    let s = readyState(ENTRY, 10000);
    s = placeMarketLong(s, MARGIN, LEV);

    const EXIT = 50250;
    s = { ...s, bars: [...s.bars, bar(2000, ENTRY, EXIT + 100, ENTRY - 100, EXIT)] };
    s = closePosition(s, s.account.positions[0].id);

    const trade = s.account.closedTrades[0];
    // Raw = (50250 - 50000) * 0.2 = $50
    expect(trade.pnlRaw).toBeCloseTo(50);
    // Exit fee = $50250 * 0.2 * 0.00045 = $10050 * 0.00045 = $4.5225
    const exitFee = (EXIT * SIZE) * TAKER_FEE;
    const totalFees = ENTRY_FEE + exitFee;
    // Net = $50 - $4.50 - $4.5225 = ~$40.98
    expect(trade.pnl).toBeCloseTo(50 - totalFees);
    // ROI = ~41% on $100 for 0.5% move at 100x (expected 50% minus ~9% fees)
    expect(trade.pnl).toBeGreaterThan(40);
    expect(trade.pnl).toBeLessThan(42);
  });
});

// ────────────────────────────────────────────────────────────────
// Fee breakdown verification
// ────────────────────────────────────────────────────────────────

describe("fee breakdown — exact numbers", () => {
  it("roundtrip at same price: loss = exactly total fees", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10); // $1000 notional
    // Close at same price (no PnL movement)
    s = closePosition(s, s.account.positions[0].id);

    const trade = s.account.closedTrades[0];
    expect(trade.pnlRaw).toBeCloseTo(0); // zero raw movement
    // Entry fee = $1000 * 0.00045 = $0.45
    // Exit fee = $50000 * 0.02 * 0.00045 = $1000 * 0.00045 = $0.45
    // Total = $0.90
    expect(trade.fees).toBeCloseTo(0.90);
    expect(trade.pnl).toBeCloseTo(-0.90); // loss = fees
    expect(s.account.balance).toBeCloseTo(10000 - 0.90);
  });

  it("100x roundtrip fees are 10x the 10x fees", () => {
    // 10x: $1000 notional → $0.90 roundtrip fees
    // 100x: $10000 notional → $9.00 roundtrip fees
    let s1 = readyState(50000, 10000);
    s1 = placeMarketLong(s1, 100, 10);
    s1 = closePosition(s1, s1.account.positions[0].id);

    let s2 = readyState(50000, 10000);
    s2 = placeMarketLong(s2, 100, 100);
    s2 = closePosition(s2, s2.account.positions[0].id);

    const fees10x = s2.account.closedTrades[0].fees;
    const fees1x = s1.account.closedTrades[0].fees;
    expect(fees10x / fees1x).toBeCloseTo(10);
  });

  it("TAKER_FEE constant is 0.045%", () => {
    expect(TAKER_FEE).toBe(0.00045);
    expect(TAKER_FEE * 100).toBeCloseTo(0.045); // 0.045%
  });
});

// ────────────────────────────────────────────────────────────────
// Balance accounting — exact tracking
// ────────────────────────────────────────────────────────────────

describe("balance accounting — exact", () => {
  it("balance does NOT change on open", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10);
    expect(s.account.balance).toBe(10000); // exact, no fee deducted
  });

  it("balance = startingBalance + sum(all closed PnL)", () => {
    let s = readyState(50000, 10000);

    // Trade 1: long, +2%
    s = placeMarketLong(s, 100, 10);
    s = { ...s, bars: [...s.bars, bar(2000, 50000, 51500, 49500, 51000)] };
    s = closePosition(s, s.account.positions[0].id);
    const pnl1 = s.account.closedTrades[0].pnl;

    // Trade 2: short, -1%
    s = placeMarketShort(s, 100, 10);
    s = { ...s, bars: [...s.bars, bar(3000, 51000, 51500, 50000, 50500)] };
    s = closePosition(s, s.account.positions[0].id);
    const pnl2 = s.account.closedTrades[0].pnl;

    expect(s.account.balance).toBeCloseTo(10000 + pnl1 + pnl2);
  });

  it("free margin = balance - sum(marginUsed)", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 200, 10); // $200 margin
    s = placeMarketShort(s, 300, 10); // $300 margin
    const stats = selectAccountStats(s);
    expect(stats.marginUsed).toBeCloseTo(500);
    expect(stats.freeMargin).toBeCloseTo(10000 - 500);
  });
});

// ────────────────────────────────────────────────────────────────
// Take Profit — exact fills
// ────────────────────────────────────────────────────────────────

describe("take profit — exact", () => {
  it("long TP at $51,000: fills at exactly $51,000", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, 51000); // TP=51000
    const pos = s.account.positions[0];

    const tpBar = bar(2000, 50500, 51500, 50400, 51200);
    s = checkFills(s, tpBar);

    const trade = s.account.closedTrades[0];
    expect(trade.exitPx).toBe(51000); // exact TP price
    expect(trade.reason).toBe("tp");
    // Raw PnL = (51000 - 50000) * 0.02 = $20
    expect(trade.pnlRaw).toBeCloseTo(20);
  });

  it("short TP at $49,000: fills at exactly $49,000", () => {
    let s = readyState(50000, 10000);
    s = placeMarketShort(s, 100, 10, 49000);

    const tpBar = bar(2000, 49500, 49800, 48500, 48800);
    s = checkFills(s, tpBar);

    const trade = s.account.closedTrades[0];
    expect(trade.exitPx).toBe(49000);
    expect(trade.reason).toBe("tp");
    // Raw PnL = (50000 - 49000) * 0.02 = $20
    expect(trade.pnlRaw).toBeCloseTo(20);
  });

  it("TP does NOT trigger when bar high is below TP", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, 52000);

    // high = 51999, just under TP
    const noTpBar = bar(2000, 50500, 51999, 50400, 51800);
    s = checkFills(s, noTpBar);
    expect(s.account.positions).toHaveLength(1);
  });

  it("TP triggers when bar high equals TP exactly", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, 51000);

    // high = exactly 51000
    const tpBar = bar(2000, 50500, 51000, 50400, 50800);
    s = checkFills(s, tpBar);
    expect(s.account.positions).toHaveLength(0);
    expect(s.account.closedTrades[0].exitPx).toBe(51000);
  });
});

// ────────────────────────────────────────────────────────────────
// Stop Loss — exact fills
// ────────────────────────────────────────────────────────────────

describe("stop loss — exact", () => {
  it("long SL at $49,000: fills at exactly $49,000", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, undefined, 49000);

    const slBar = bar(2000, 49500, 49800, 48500, 48800);
    s = checkFills(s, slBar);

    const trade = s.account.closedTrades[0];
    expect(trade.exitPx).toBe(49000);
    expect(trade.reason).toBe("sl");
    // Raw PnL = (49000 - 50000) * 0.02 = -$20
    expect(trade.pnlRaw).toBeCloseTo(-20);
  });

  it("SL cleans up TP order", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, 52000, 49000);
    expect(s.account.openOrders).toHaveLength(2);

    const slBar = bar(2000, 49500, 49800, 48500, 48800);
    s = checkFills(s, slBar);

    expect(s.account.openOrders).toHaveLength(0); // both TP and SL removed
    expect(s.account.positions).toHaveLength(0);
  });

  it("SL does NOT trigger when bar low is above SL", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, undefined, 49000);

    // low = 49001, just above SL
    const safeBar = bar(2000, 49500, 49800, 49001, 49500);
    s = checkFills(s, safeBar);
    expect(s.account.positions).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────
// R:R — exact computation
// ────────────────────────────────────────────────────────────────

describe("R:R — exact", () => {
  it("entry $50,000, TP hit at $52,000, SL was $49,000 → R:R = 2.0", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, 52000, 49000);

    const tpBar = bar(2000, 51000, 52500, 50800, 52200);
    s = checkFills(s, tpBar);

    const trade = s.account.closedTrades[0];
    // R:R = |52000 - 50000| / |50000 - 49000| = 2000/1000 = 2.0
    expect(trade.rr).toBe(2.0);
  });

  it("entry $50,000, SL hit at $49,000, TP was $52,000 → R:R = -1.0", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, 52000, 49000);

    const slBar = bar(2000, 49500, 49800, 48500, 48800);
    s = checkFills(s, slBar);

    const trade = s.account.closedTrades[0];
    // R:R = -(|49000 - 50000| / |50000 - 49000|) = -(1000/1000) = -1.0
    expect(trade.rr).toBe(-1.0);
  });

  it("manual close at $50,500 with SL at $49,000 → R:R = 0.5", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, undefined, 49000);

    s = { ...s, bars: [...s.bars, bar(2000, 50000, 50600, 49800, 50500)] };
    s = closePosition(s, s.account.positions[0].id);

    const trade = s.account.closedTrades[0];
    // R:R = |50500 - 50000| / |50000 - 49000| = 500/1000 = 0.5
    expect(trade.rr).toBeCloseTo(0.5);
  });

  it("no SL → R:R is null", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10);
    s = closePosition(s, s.account.positions[0].id);
    expect(s.account.closedTrades[0].rr).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────
// Liquidation — exact
// ────────────────────────────────────────────────────────────────

describe("liquidation — exact", () => {
  it("100x long: liq at $49,700, bar low $49,600 → liquidated", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 100);
    const pos = s.account.positions[0];
    expect(pos.liquidationPx).toBeCloseTo(49700);

    const liqBar = bar(2000, 49800, 49900, 49600, 49650);
    s = checkFills(s, liqBar);

    expect(s.account.positions).toHaveLength(0);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("liquidation");
    expect(trade.exitPx).toBeCloseTo(49700);

    // Raw PnL at liq = (49700 - 50000) * 0.2 = -$60
    expect(trade.pnlRaw).toBeCloseTo(-60);
    // + fees on top
    expect(trade.pnl).toBeLessThan(-60);
  });

  it("100x long: bar low at $49,701 → survives", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 100);

    // Low just above liq
    const safeBar = bar(2000, 49800, 49900, 49701, 49750);
    s = checkFills(s, safeBar);
    expect(s.account.positions).toHaveLength(1); // survives
  });

  it("100x short: liq at $50,300, bar high $50,400 → liquidated", () => {
    let s = readyState(50000, 10000);
    s = placeMarketShort(s, 100, 100);
    const pos = s.account.positions[0];
    expect(pos.liquidationPx).toBeCloseTo(50300);

    const liqBar = bar(2000, 50200, 50400, 50100, 50350);
    s = checkFills(s, liqBar);

    expect(s.account.positions).toHaveLength(0);
    expect(s.account.closedTrades[0].reason).toBe("liquidation");
  });
});

// ────────────────────────────────────────────────────────────────
// Funding rate — exact
// ────────────────────────────────────────────────────────────────

describe("funding rate — exact", () => {
  it("$1000 notional long, 1 period = $0.10 funding", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10); // $1000 notional, size 0.02
    const openTime = s.account.positions[0].lastFundingMs;

    s = chargeFunding(s, openTime + FUNDING_INTERVAL_MS + 1);
    // funding = $50000 * 0.02 * 0.0001 = $1000 * 0.0001 = $0.10
    expect(s.account.positions[0].fundingPaid).toBeCloseTo(0.10);
  });

  it("$5000 notional long, 3 periods = $1.50 funding", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 50); // $5000 notional
    const openTime = s.account.positions[0].lastFundingMs;

    s = chargeFunding(s, openTime + 3 * FUNDING_INTERVAL_MS + 1);
    // 3 × ($5000 * 0.0001) = 3 × $0.50 = $1.50
    expect(s.account.positions[0].fundingPaid).toBeCloseTo(1.50);
  });

  it("short receives funding (negative)", () => {
    let s = readyState(50000, 10000);
    s = placeMarketShort(s, 100, 10); // $1000 notional
    const openTime = s.account.positions[0].lastFundingMs;

    s = chargeFunding(s, openTime + FUNDING_INTERVAL_MS + 1);
    expect(s.account.positions[0].fundingPaid).toBeCloseTo(-0.10);
  });

  it("funding NOT deducted from balance (only at close)", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10);
    const openTime = s.account.positions[0].lastFundingMs;
    s = chargeFunding(s, openTime + 5 * FUNDING_INTERVAL_MS + 1);
    expect(s.account.balance).toBe(10000);
  });

  it("funding included in fees on close", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10); // $1000 notional
    const pos = s.account.positions[0];
    const openTime = pos.lastFundingMs;

    // 1 funding period
    s = chargeFunding(s, openTime + FUNDING_INTERVAL_MS + 1);
    s = closePosition(s, s.account.positions[0].id);

    const trade = s.account.closedTrades[0];
    // Fees = entry ($0.45) + exit ($0.45) + funding ($0.10) = $1.00
    expect(trade.fees).toBeCloseTo(0.45 + 0.45 + 0.10);
  });
});

// ────────────────────────────────────────────────────────────────
// Limit orders
// ────────────────────────────────────────────────────────────────

describe("limit orders", () => {
  it("limit buy at $49,000 fills when price drops", () => {
    let s = readyState(50000, 10000);
    const { size } = computeOrderSize(100, 10, 49000);
    s = placeOrder(s, { side: "long", type: "limit", size, leverage: 10, triggerPx: 49000 });

    expect(s.account.openOrders).toHaveLength(1);
    expect(s.account.positions).toHaveLength(0);

    const fillBar = bar(2000, 49500, 49600, 48800, 49100);
    s = checkFills(s, fillBar);

    expect(s.account.openOrders).toHaveLength(0);
    expect(s.account.positions).toHaveLength(1);
    expect(s.account.positions[0].entryPx).toBe(49000);
  });

  it("limit order with TP/SL attaches them on fill", () => {
    let s = readyState(50000, 10000);
    const { size } = computeOrderSize(100, 10, 49000);
    s = placeOrder(s, {
      side: "long", type: "limit", size, leverage: 10, triggerPx: 49000,
      tp: 51000, sl: 48000,
    });

    const fillBar = bar(2000, 49500, 49600, 48800, 49100);
    s = checkFills(s, fillBar);

    expect(s.account.positions).toHaveLength(1);
    expect(s.account.openOrders).toHaveLength(2); // TP + SL
    const tp = s.account.openOrders.find((o) => o.type === "tp");
    const sl = s.account.openOrders.find((o) => o.type === "sl");
    expect(tp?.triggerPx).toBe(51000);
    expect(sl?.triggerPx).toBe(48000);
  });

  it("cancel removes the order", () => {
    let s = readyState(50000, 10000);
    s = placeOrder(s, {
      side: "long", type: "limit",
      size: computeOrderSize(100, 10, 49000).size,
      leverage: 10, triggerPx: 49000,
    });
    s = cancelOrder(s, s.account.openOrders[0].id);
    expect(s.account.openOrders).toHaveLength(0);
  });

  it("limit does NOT fill when price doesn't reach trigger", () => {
    let s = readyState(50000, 10000);
    s = placeOrder(s, {
      side: "long", type: "limit",
      size: computeOrderSize(100, 10, 49000).size,
      leverage: 10, triggerPx: 49000,
    });

    // low = 49001, doesn't reach 49000
    const noFillBar = bar(2000, 49500, 49800, 49001, 49500);
    s = checkFills(s, noFillBar);
    expect(s.account.positions).toHaveLength(0);
    expect(s.account.openOrders).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────
// selectAccountStats — exact unrealized with fees
// ────────────────────────────────────────────────────────────────

describe("selectAccountStats — exact unrealized", () => {
  it("position at same price: unrealized = negative (pending fees)", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10); // $1000 notional

    const stats = selectAccountStats(s);
    // Unrealized raw = 0 (same price)
    // Pending fees = entry($0.45) + exit($0.45) = $0.90
    expect(stats.unrealizedPnl).toBeCloseTo(-0.90);
    expect(stats.equity).toBeCloseTo(10000 - 0.90);
  });

  it("position +$100 raw, unrealized = $100 - pending fees", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 1000, 10); // $10000 notional, 0.2 BTC
    // Price +$500
    s = { ...s, bars: [...s.bars, bar(2000, 50000, 50600, 49800, 50500)] };

    const stats = selectAccountStats(s);
    // Raw unrealized = (50500 - 50000) * 0.2 = $100
    // Entry fee = $10000 * 0.00045 = $4.50
    // Exit fee estimate = $50500 * 0.2 * 0.00045 = $10100 * 0.00045 = $4.545
    // Pending fees = $4.50 + $4.545 = $9.045
    // Net unrealized = $100 - $9.045 = $90.955
    expect(stats.unrealizedPnl).toBeCloseTo(90.955, 0);
  });
});

// ────────────────────────────────────────────────────────────────
// recordEquity — matches selectAccountStats
// ────────────────────────────────────────────────────────────────

describe("recordEquity — consistency", () => {
  it("equity point matches real-time stats", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10);
    s = { ...s, bars: [...s.bars, bar(2000, 50000, 51500, 49500, 51000)] };

    const stats = selectAccountStats(s);
    s = recordEquity(s, s.bars[s.bars.length - 1]);
    const point = s.account.equityCurve[s.account.equityCurve.length - 1];
    expect(point.equity).toBeCloseTo(stats.equity, 5);
  });
});

// ────────────────────────────────────────────────────────────────
// updateBars
// ────────────────────────────────────────────────────────────────

describe("updateBars", () => {
  it("appends new bar (different openTime)", () => {
    const bars = [bar(1000, 100, 110, 90, 105)];
    const result = updateBars(bars, bar(2000, 105, 115, 100, 110), false);
    expect(result).toHaveLength(2);
    expect(result[1].openTime).toBe(2000);
  });

  it("updates current bar (same openTime)", () => {
    const bars = [bar(1000, 100, 110, 90, 105)];
    const result = updateBars(bars, bar(1000, 100, 120, 85, 115), false);
    expect(result).toHaveLength(1);
    expect(result[0].high).toBe(120);
    expect(result[0].low).toBe(85);
    expect(result[0].close).toBe(115);
  });

  it("empty bars → single bar", () => {
    const result = updateBars([], bar(1000, 100, 110, 90, 105), false);
    expect(result).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────
// resetAccount
// ────────────────────────────────────────────────────────────────

describe("resetAccount", () => {
  it("clears everything, restores default balance", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10);
    s = resetAccount(s);
    expect(s.account.positions).toHaveLength(0);
    expect(s.account.openOrders).toHaveLength(0);
    expect(s.account.closedTrades).toHaveLength(0);
    expect(s.account.equityCurve).toHaveLength(0);
    expect(s.account.balance).toBe(10000);
  });

  it("resets to custom balance", () => {
    const s = resetAccount(readyState(50000, 10000), 5000);
    expect(s.account.balance).toBe(5000);
    expect(s.account.startingBalance).toBe(5000);
  });
});

// ────────────────────────────────────────────────────────────────
// Edge cases
// ────────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("can hold multiple positions simultaneously", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10);
    s = placeMarketShort(s, 100, 10);
    s = placeMarketLong(s, 50, 5);
    expect(s.account.positions).toHaveLength(3);
  });

  it("closing non-existent position is no-op", () => {
    let s = readyState(50000, 10000);
    const before = { ...s.account };
    s = closePosition(s, "nonexistent-id");
    expect(s.account.balance).toBe(before.balance);
    expect(s.account.closedTrades).toHaveLength(0);
  });

  it("placing order with empty bars is no-op", () => {
    const s = freshState("BTCUSDT", "1h", 10000);
    const result = placeOrder(s, { side: "long", type: "market", size: 0.01, leverage: 10 });
    expect(result.account.positions).toHaveLength(0);
  });

  it("leverage above max is rejected", () => {
    let s = readyState(50000, 10000);
    // BTCUSDT max = 125
    const { size } = computeOrderSize(100, 126, 50000);
    s = placeOrder(s, { side: "long", type: "market", size, leverage: 126 });
    expect(s.account.positions).toHaveLength(0);
  });

  it("zero size is rejected", () => {
    let s = readyState(50000, 10000);
    s = placeOrder(s, { side: "long", type: "market", size: 0, leverage: 10 });
    expect(s.account.positions).toHaveLength(0);
  });

  it("TP and SL both in same bar — one fires, other cleaned up", () => {
    let s = readyState(50000, 10000);
    s = placeMarketLong(s, 100, 10, 51000, 49000);

    // Wide bar covers both TP and SL
    const wideBar = bar(2000, 50000, 52000, 48000, 50500);
    s = checkFills(s, wideBar);

    expect(s.account.positions).toHaveLength(0);
    expect(s.account.closedTrades).toHaveLength(1);
    expect(s.account.openOrders).toHaveLength(0);
  });

  it("insufficient margin rejects order", () => {
    let s = readyState(50000, 100); // only $100 balance
    // $95 margin at 10x = $950 notional, fee = $0.4275
    // margin + fee = $95.4275 < $100 → should work
    s = placeMarketLong(s, 95, 10);
    expect(s.account.positions).toHaveLength(1);

    // Now try another $10 → not enough free margin ($100 - $95 = $5 free, need $10 + fee)
    s = placeMarketLong(s, 10, 10);
    expect(s.account.positions).toHaveLength(1); // still 1, rejected
  });
});

// ────────────────────────────────────────────────────────────────
// Replay-mode simulation — exact flow
// ────────────────────────────────────────────────────────────────

describe("replay mode — simulated tick-by-tick", () => {
  it("place order with TP/SL, step forward, SL triggers", () => {
    // Simulate replay: all bars pre-loaded, cursor advances
    const allBars = [
      bar(1000, 50000, 50100, 49900, 50000),  // cursor 0: entry bar
      bar(2000, 50000, 50050, 49950, 50000),   // cursor 1: nothing happens
      bar(3000, 49900, 49950, 48800, 48900),   // cursor 2: SL at 49000 should fire (low=48800)
      bar(4000, 48900, 49000, 48700, 48800),   // cursor 3
    ];

    let state = {
      ...freshState("BTCUSDT", "1h", 10000),
      bars: allBars,
    };

    // Place market long with TP=52000, SL=49000 using visible bars (cursor=0)
    const visibleBars = allBars.slice(0, 1);
    const { size } = computeOrderSize(100, 10, 50000);
    const tempState = { ...state, bars: visibleBars };
    const placed = placeOrder(tempState, {
      side: "long", type: "market", size, leverage: 10, tp: 52000, sl: 49000,
    });
    state = { ...state, account: placed.account };

    // Verify position + orders created
    expect(state.account.positions).toHaveLength(1);
    expect(state.account.openOrders).toHaveLength(2);
    expect(state.account.openOrders.find(o => o.type === "tp")?.triggerPx).toBe(52000);
    expect(state.account.openOrders.find(o => o.type === "sl")?.triggerPx).toBe(49000);

    // Step to cursor 1 — bar doesn't touch SL
    const bar1 = allBars[1];
    state = checkFills(state, bar1);
    expect(state.account.positions).toHaveLength(1); // still open
    expect(state.account.openOrders).toHaveLength(2);

    // Step to cursor 2 — bar low=48800 < SL=49000, should fire
    const bar2 = allBars[2];
    state = checkFills(state, bar2);
    expect(state.account.positions).toHaveLength(0); // closed!
    expect(state.account.openOrders).toHaveLength(0); // TP cleaned up too
    expect(state.account.closedTrades).toHaveLength(1);
    expect(state.account.closedTrades[0].reason).toBe("sl");
    expect(state.account.closedTrades[0].exitPx).toBe(49000);
  });

  it("place order with TP/SL, step forward, TP triggers", () => {
    const allBars = [
      bar(1000, 50000, 50100, 49900, 50000),
      bar(2000, 50500, 52100, 50400, 52000), // TP at 52000 should fire (high=52100)
    ];

    let state = { ...freshState("BTCUSDT", "1h", 10000), bars: allBars };

    const visibleBars = allBars.slice(0, 1);
    const { size } = computeOrderSize(100, 10, 50000);
    const tempState = { ...state, bars: visibleBars };
    const placed = placeOrder(tempState, {
      side: "long", type: "market", size, leverage: 10, tp: 52000, sl: 49000,
    });
    state = { ...state, account: placed.account };

    // Step — TP fires
    state = checkFills(state, allBars[1]);
    expect(state.account.positions).toHaveLength(0);
    expect(state.account.closedTrades).toHaveLength(1);
    expect(state.account.closedTrades[0].reason).toBe("tp");
  });

  it("short with TP/SL in replay — SL triggers on high", () => {
    const allBars = [
      bar(1000, 50000, 50100, 49900, 50000),
      bar(2000, 50500, 51100, 50400, 51000), // SL at 51000 for short (high=51100 > 51000)
    ];

    let state = { ...freshState("BTCUSDT", "1h", 10000), bars: allBars };

    const visibleBars = allBars.slice(0, 1);
    const { size } = computeOrderSize(100, 10, 50000);
    const tempState = { ...state, bars: visibleBars };
    const placed = placeOrder(tempState, {
      side: "short", type: "market", size, leverage: 10, tp: 48000, sl: 51000,
    });
    state = { ...state, account: placed.account };

    expect(state.account.positions).toHaveLength(1);
    expect(state.account.openOrders).toHaveLength(2);

    state = checkFills(state, allBars[1]);
    expect(state.account.positions).toHaveLength(0);
    expect(state.account.closedTrades[0].reason).toBe("sl");
    expect(state.account.closedTrades[0].exitPx).toBe(51000);
  });
});

describe("replay reducer — exact dispatch simulation", () => {
  it("place action creates position and orders", () => {
    // This exactly mirrors what the replay reducer's 'place' case does
    const allBars = [
      bar(1000, 50000, 50100, 49900, 50000),
      bar(2000, 50000, 50050, 49950, 50000),
      bar(3000, 49900, 49950, 48800, 48900),
    ];
    
    const state = {
      ...freshState("BTCUSDT", "1h", 10000),
      bars: allBars,
    };
    const cursor = 0;

    // Exactly what the reducer does:
    const visibleBars = state.bars.slice(0, cursor + 1);
    const tempState = { ...state, bars: visibleBars };
    const { size } = computeOrderSize(100, 10, 50000);
    const result = placeOrder(tempState, {
      side: "long", type: "market", size, leverage: 10, tp: 52000, sl: 49000,
    });
    const newState = { ...state, account: result.account };

    // Key assertions:
    expect(newState.account.positions).toHaveLength(1);
    expect(newState.account.positions[0].symbol).toBe("BTCUSDT");
    expect(newState.account.openOrders).toHaveLength(2);
    
    const tpOrder = newState.account.openOrders.find(o => o.type === "tp");
    const slOrder = newState.account.openOrders.find(o => o.type === "sl");
    expect(tpOrder).toBeDefined();
    expect(slOrder).toBeDefined();
    expect(tpOrder!.symbol).toBe("BTCUSDT");
    expect(slOrder!.symbol).toBe("BTCUSDT");
    expect(tpOrder!.triggerPx).toBe(52000);
    expect(slOrder!.triggerPx).toBe(49000);
    expect(tpOrder!.parentPositionId).toBe(newState.account.positions[0].id);
    expect(slOrder!.parentPositionId).toBe(newState.account.positions[0].id);

    // Now simulate a tick to cursor 2 (SL should fire)
    const bar2 = allBars[2]; // low=48800 < SL=49000
    const afterFills = checkFills(newState, bar2);
    
    expect(afterFills.account.positions).toHaveLength(0);
    expect(afterFills.account.openOrders).toHaveLength(0);
    expect(afterFills.account.closedTrades).toHaveLength(1);
    expect(afterFills.account.closedTrades[0].reason).toBe("sl");
  });
});
