import { describe, expect, it } from "vitest";
import {
  calcLiquidationPx,
  closePosition,
  computeOrderSize,
  freshState,
  loadSession,
  placeOrder,
  selectAccountStats,
  tickForward,
  type EngineState,
} from "@/app/projects/perps-replay/lib/engine";
import type { Kline } from "@/app/projects/perps-replay/lib/kline";

// ─────────────────────────── helpers ───────────────────────────

function bar(
  openTime: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 100
): Kline {
  return {
    openTime,
    open,
    high,
    low,
    close,
    volume,
    closeTime: openTime + 60_000 - 1,
  };
}

// Build a fresh BTCUSDT 1h state pre-loaded with bars and cursor at the
// end of `initialBars`.
function stateAt(initialBars: Kline[], allBars: Kline[]): EngineState {
  let s = freshState("BTCUSDT", "1h");
  s = loadSession(s, allBars);
  s = { ...s, cursor: initialBars.length - 1 };
  return s;
}

const close = (n: number) => Math.abs(n) < 1e-6;

// ─────────────────────────── computeOrderSize ───────────────────────────

describe("computeOrderSize", () => {
  it("$100 margin × 10× leverage at 91766 → 0.0109 BTC, $1000 exposure", () => {
    const r = computeOrderSize(100, 10, 91766);
    expect(r.exposure).toBeCloseTo(1000, 8);
    expect(r.size).toBeCloseTo(1000 / 91766, 10);
  });

  it("scales linearly with leverage", () => {
    const a = computeOrderSize(100, 1, 50000);
    const b = computeOrderSize(100, 10, 50000);
    expect(b.exposure).toBeCloseTo(a.exposure * 10);
    expect(b.size).toBeCloseTo(a.size * 10);
  });

  it("returns zeros for invalid inputs", () => {
    expect(computeOrderSize(0, 10, 100)).toEqual({ exposure: 0, size: 0 });
    expect(computeOrderSize(100, 0, 100)).toEqual({ exposure: 0, size: 0 });
    expect(computeOrderSize(100, 10, 0)).toEqual({ exposure: 0, size: 0 });
    expect(computeOrderSize(-1, 10, 100)).toEqual({ exposure: 0, size: 0 });
  });
});

// ─────────────────────────── calcLiquidationPx ───────────────────────────

describe("calcLiquidationPx", () => {
  // BTC mmr = 0.004 (from symbols.ts)
  it("long 10× at 100 → liq = 100 * (1 - 0.1 + 0.004) = 90.4", () => {
    expect(calcLiquidationPx("long", 100, 10, 0.004)).toBeCloseTo(90.4, 8);
  });

  it("short 10× at 100 → liq = 100 * (1 + 0.1 - 0.004) = 109.6", () => {
    expect(calcLiquidationPx("short", 100, 10, 0.004)).toBeCloseTo(109.6, 8);
  });

  it("higher leverage = closer liq for longs", () => {
    const liq5 = calcLiquidationPx("long", 100, 5, 0.005);
    const liq50 = calcLiquidationPx("long", 100, 50, 0.005);
    expect(liq50).toBeGreaterThan(liq5); // closer to entry = bigger number
  });

  it("higher leverage = closer liq for shorts", () => {
    const liq5 = calcLiquidationPx("short", 100, 5, 0.005);
    const liq50 = calcLiquidationPx("short", 100, 50, 0.005);
    expect(liq50).toBeLessThan(liq5); // closer to entry = smaller number
  });

  it("1× long has effective floor near 0 (only mmr buffer)", () => {
    // 1× long: entry * (1 - 1 + mmr) = entry * mmr
    expect(calcLiquidationPx("long", 100, 1, 0.005)).toBeCloseTo(0.5, 8);
  });
});

// ─────────────────────────── placeOrder: market ───────────────────────────

describe("placeOrder market", () => {
  it("opens a long position with correct entry, size, margin, liq", () => {
    const bars = [bar(0, 100, 110, 95, 100), bar(60_000, 100, 105, 98, 100)];
    let s = stateAt(bars, bars);
    // 100 USDT margin × 10x = 1000 exposure → size = 10 base units at price 100
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
    });
    expect(s.account.positions).toHaveLength(1);
    const p = s.account.positions[0];
    expect(p.side).toBe("long");
    expect(p.size).toBe(10);
    expect(p.entryPx).toBe(100);
    expect(p.leverage).toBe(10);
    // notional = 100 * 10 = 1000, margin = 100
    expect(p.marginUsed).toBeCloseTo(100, 6);
    // liq for BTC mmr=0.004: 100 * (1 - 0.1 + 0.004) = 90.4
    expect(p.liquidationPx).toBeCloseTo(90.4, 6);
  });

  it("rejects when free margin is insufficient", () => {
    const bars = [bar(0, 100, 110, 95, 100)];
    let s = stateAt(bars, bars);
    // Try to open 1000-unit position at 100 with 1x lev → margin 100,000
    // Account starts with 10,000 → should reject
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 1000,
      leverage: 1,
    });
    expect(s.account.positions).toHaveLength(0);
  });

  it("attaches TP and SL atomically as reduceOnly orders pointing at the new position", () => {
    const bars = [bar(0, 100, 110, 95, 100)];
    let s = stateAt(bars, bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
      tp: 110,
      sl: 95,
    });
    expect(s.account.positions).toHaveLength(1);
    expect(s.account.openOrders).toHaveLength(2);
    const parent = s.account.positions[0];
    const tpOrder = s.account.openOrders.find((o) => o.type === "tp");
    const slOrder = s.account.openOrders.find((o) => o.type === "sl");
    expect(tpOrder).toBeDefined();
    expect(slOrder).toBeDefined();
    expect(tpOrder!.parentPositionId).toBe(parent.id);
    expect(slOrder!.parentPositionId).toBe(parent.id);
    expect(tpOrder!.reduceOnly).toBe(true);
    expect(slOrder!.reduceOnly).toBe(true);
    // Closing side is opposite of parent
    expect(tpOrder!.side).toBe("short");
    expect(slOrder!.side).toBe("short");
  });
});

// ─────────────────────────── tickForward: TP/SL fills ───────────────────────────

describe("tickForward TP/SL", () => {
  it("TP fires when price reaches it on next bar — closes parent and credits PnL", () => {
    // bar0 entry 100, bar1 high 115 (TP at 110 fires)
    const bars = [
      bar(0, 100, 105, 95, 100),
      bar(60_000, 102, 115, 100, 112),
    ];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
      tp: 110,
    });
    const startBalance = s.account.balance;
    s = tickForward(s); // advance to bar1 — TP at 110 is in [100,115]
    // Position should be closed
    expect(s.account.positions).toHaveLength(0);
    expect(s.account.openOrders).toHaveLength(0);
    expect(s.account.closedTrades).toHaveLength(1);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("tp");
    expect(trade.exitPx).toBe(110);
    // Realized PnL = (110 - 100) * 10 = 100
    expect(trade.pnl).toBeCloseTo(100, 6);
    // Balance should reflect the realized profit
    expect(s.account.balance).toBeCloseTo(startBalance + 100, 6);
  });

  it("SL fires when price drops through it — realizes loss", () => {
    const bars = [
      bar(0, 100, 105, 95, 100),
      bar(60_000, 99, 100, 88, 92), // SL at 95 inside [88, 100]
    ];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
      sl: 95,
    });
    const startBalance = s.account.balance;
    s = tickForward(s);
    expect(s.account.positions).toHaveLength(0);
    expect(s.account.closedTrades).toHaveLength(1);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("sl");
    expect(trade.exitPx).toBe(95);
    // Loss = (95 - 100) * 10 = -50
    expect(trade.pnl).toBeCloseTo(-50, 6);
    expect(s.account.balance).toBeCloseTo(startBalance - 50, 6);
  });

  it("does NOT fire TP/SL when price stays inside the range", () => {
    const bars = [
      bar(0, 100, 105, 95, 100),
      bar(60_000, 101, 108, 97, 103), // TP=110 not reached, SL=90 not reached
    ];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
      tp: 110,
      sl: 90,
    });
    s = tickForward(s);
    expect(s.account.positions).toHaveLength(1);
    expect(s.account.openOrders).toHaveLength(2);
    expect(s.account.closedTrades).toHaveLength(0);
  });

  it("short TP fires when price drops to TP", () => {
    const bars = [
      bar(0, 100, 105, 95, 100),
      bar(60_000, 99, 102, 88, 90), // TP at 90 inside [88,102]
    ];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "short",
      type: "market",
      size: 10,
      leverage: 10,
      tp: 90,
    });
    s = tickForward(s);
    expect(s.account.positions).toHaveLength(0);
    expect(s.account.closedTrades).toHaveLength(1);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("tp");
    // Short PnL: (entry - exit) * size = (100 - 90) * 10 = 100
    expect(trade.pnl).toBeCloseTo(100, 6);
  });

  it("short SL fires when price rises through it", () => {
    const bars = [
      bar(0, 100, 105, 95, 100),
      bar(60_000, 101, 112, 100, 108), // SL=110 inside [100,112]
    ];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "short",
      type: "market",
      size: 10,
      leverage: 10,
      sl: 110,
    });
    s = tickForward(s);
    expect(s.account.positions).toHaveLength(0);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("sl");
    // Short loss: (100 - 110) * 10 = -100
    expect(trade.pnl).toBeCloseTo(-100, 6);
  });
});

// ─────────────────────────── tickForward: liquidations ───────────────────────────

describe("tickForward liquidations", () => {
  it("force-closes a long when bar.low crosses liq price", () => {
    // Open 10x long at 100. Liq = 90.4 (BTC mmr=0.004).
    // Next bar has low=88 → liquidation
    const bars = [bar(0, 100, 105, 95, 100), bar(60_000, 95, 96, 88, 90)];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
    });
    const startBalance = s.account.balance;
    s = tickForward(s);
    expect(s.account.positions).toHaveLength(0);
    expect(s.account.closedTrades).toHaveLength(1);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("liquidation");
    expect(trade.exitPx).toBeCloseTo(90.4, 6);
    // Loss at liq: (90.4 - 100) * 10 = -96
    expect(trade.pnl).toBeCloseTo(-96, 6);
    expect(s.account.balance).toBeCloseTo(startBalance - 96, 6);
  });

  it("force-closes a short when bar.high crosses liq price", () => {
    // Short 10x at 100, liq = 109.6
    const bars = [bar(0, 100, 105, 95, 100), bar(60_000, 105, 112, 104, 110)];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "short",
      type: "market",
      size: 10,
      leverage: 10,
    });
    s = tickForward(s);
    expect(s.account.positions).toHaveLength(0);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("liquidation");
    expect(trade.exitPx).toBeCloseTo(109.6, 6);
    // Short PnL at liq: (100 - 109.6) * 10 = -96
    expect(trade.pnl).toBeCloseTo(-96, 6);
  });

  it("does not liquidate when wick comes close but doesn't touch", () => {
    // Long 10x at 100, liq=90.4. Next bar low=91 (above liq)
    const bars = [bar(0, 100, 105, 95, 100), bar(60_000, 95, 100, 91, 98)];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
    });
    s = tickForward(s);
    expect(s.account.positions).toHaveLength(1);
    expect(s.account.closedTrades).toHaveLength(0);
  });
});

// ─────────────────────────── closePosition (manual) ───────────────────────────

describe("closePosition", () => {
  it("full manual close at current bar close credits PnL", () => {
    const bars = [bar(0, 100, 105, 95, 100), bar(60_000, 105, 110, 102, 108)];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
    });
    s = tickForward(s); // advance to bar1 (close=108)
    const pos = s.account.positions[0];
    const startBalance = s.account.balance;
    s = closePosition(s, pos.id, 1);
    expect(s.account.positions).toHaveLength(0);
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("manual");
    expect(trade.exitPx).toBe(108);
    // PnL: (108 - 100) * 10 = 80
    expect(trade.pnl).toBeCloseTo(80, 6);
    expect(s.account.balance).toBeCloseTo(startBalance + 80, 6);
  });

  it("partial close (50%) leaves a half-sized position with reduced margin", () => {
    const bars = [bar(0, 100, 105, 95, 100), bar(60_000, 105, 110, 102, 108)];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
    });
    s = tickForward(s); // bar1 close=108
    const original = s.account.positions[0];
    const startBalance = s.account.balance;
    s = closePosition(s, original.id, 0.5);
    expect(s.account.positions).toHaveLength(1);
    const remaining = s.account.positions[0];
    expect(remaining.size).toBeCloseTo(5, 6);
    expect(remaining.marginUsed).toBeCloseTo(50, 6);
    // Realized half: (108-100) * 5 = 40
    expect(s.account.balance).toBeCloseTo(startBalance + 40, 6);
  });
});

// ─────────────────────────── selectAccountStats ───────────────────────────

describe("selectAccountStats", () => {
  it("equity = balance + unrealized PnL on open positions", () => {
    const bars = [bar(0, 100, 105, 95, 100), bar(60_000, 102, 110, 100, 108)];
    let s = stateAt([bars[0]], bars);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size: 10,
      leverage: 10,
    });
    s = tickForward(s); // mark = 108
    const stats = selectAccountStats(s);
    // unrealized = (108 - 100) * 10 = 80
    expect(stats.unrealizedPnl).toBeCloseTo(80, 6);
    expect(stats.equity).toBeCloseTo(stats.balance + 80, 6);
    expect(stats.marginUsed).toBeCloseTo(100, 6);
    expect(stats.freeMargin).toBeCloseTo(stats.balance - 100, 6);
  });

  it("free margin equals balance when no positions are open", () => {
    const bars = [bar(0, 100, 105, 95, 100)];
    const s = stateAt(bars, bars);
    const stats = selectAccountStats(s);
    expect(stats.marginUsed).toBe(0);
    expect(stats.freeMargin).toBe(stats.balance);
    expect(stats.equity).toBe(stats.balance);
  });
});

// ─────────────────────────── end-to-end: the user's $24.34 trade ───────────────────────────

describe("user-reported trade: $100 margin × 10× long, +2.4343% move", () => {
  it("realizes ~$24.34 profit", () => {
    const ENTRY = 91766;
    const EXIT = 94000;
    const bars = [
      bar(0, ENTRY, ENTRY + 10, ENTRY - 10, ENTRY),
      bar(60_000, ENTRY + 50, EXIT + 100, ENTRY - 50, EXIT - 5),
    ];
    let s = stateAt([bars[0]], bars);
    // Compute size the same way the UI does
    const { size } = computeOrderSize(100, 10, ENTRY);
    s = placeOrder(s, {
      side: "long",
      type: "market",
      size,
      leverage: 10,
      tp: EXIT,
    });
    // Verify margin locked is $100 (not $10!)
    expect(s.account.positions[0].marginUsed).toBeCloseTo(100, 4);
    s = tickForward(s); // TP fires at 94000
    const trade = s.account.closedTrades[0];
    expect(trade.reason).toBe("tp");
    expect(trade.exitPx).toBe(EXIT);
    // PnL = (EXIT - ENTRY) * size = (94000 - 91766) * (1000 / 91766)
    //     = 2234 / 91.766 = 24.3445…
    expect(trade.pnl).toBeCloseTo(24.3445, 3);
    // User-facing assertion: rounds to $24.34
    expect(Math.round(trade.pnl * 100) / 100).toBe(24.34);
  });
});
