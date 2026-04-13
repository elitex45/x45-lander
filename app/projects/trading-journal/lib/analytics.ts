import type {
  Trade,
  DashboardStats,
  EquityPoint,
  PairStats,
  SetupStats,
  HourStats,
  DayStats,
  CalendarDay,
  TradeResult,
} from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeStats(trades: Trade[]): DashboardStats {
  const empty: DashboardStats = {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    breakevens: 0,
    winRate: 0,
    totalPnl: 0,
    totalFees: 0,
    avgPnl: 0,
    avgWin: 0,
    avgLoss: 0,
    expectancy: 0,
    profitFactor: 0,
    avgRR: 0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    bestTrade: 0,
    worstTrade: 0,
    currentStreak: { type: "breakeven", count: 0 },
    longestWinStreak: 0,
    longestLoseStreak: 0,
  };

  if (trades.length === 0) return empty;

  const sorted = [...trades].sort((a, b) => a.closedAt - b.closedAt);

  const wins = sorted.filter((t) => t.result === "win");
  const losses = sorted.filter((t) => t.result === "loss");
  const breakevens = sorted.filter((t) => t.result === "breakeven");

  const totalPnl = sorted.reduce((s, t) => s + t.pnl, 0);
  const totalFees = sorted.reduce((s, t) => s + t.fees, 0);

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  const rrs = sorted.filter((t) => t.rr !== null).map((t) => t.rr!);
  const avgRR = rrs.length > 0 ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;

  // Drawdown
  let peak = 0;
  let maxDD = 0;
  let maxDDPct = 0;
  let cumPnl = 0;
  for (const t of sorted) {
    cumPnl += t.pnl;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  // Streaks
  let currentStreak: { type: TradeResult; count: number } = {
    type: sorted[sorted.length - 1].result,
    count: 0,
  };
  let longestWin = 0;
  let longestLose = 0;
  let winStreak = 0;
  let loseStreak = 0;

  for (const t of sorted) {
    if (t.result === "win") {
      winStreak++;
      loseStreak = 0;
    } else if (t.result === "loss") {
      loseStreak++;
      winStreak = 0;
    } else {
      winStreak = 0;
      loseStreak = 0;
    }
    longestWin = Math.max(longestWin, winStreak);
    longestLose = Math.max(longestLose, loseStreak);
  }

  // Current streak from the end
  let cCount = 0;
  const cType = sorted[sorted.length - 1].result;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].result === cType) cCount++;
    else break;
  }
  currentStreak = { type: cType, count: cCount };

  const pnls = sorted.map((t) => t.pnl);

  return {
    totalTrades: sorted.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    winRate: (wins.length / sorted.length) * 100,
    totalPnl,
    totalFees,
    avgPnl: totalPnl / sorted.length,
    avgWin,
    avgLoss,
    expectancy: totalPnl / sorted.length,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgRR,
    maxDrawdown: maxDD,
    maxDrawdownPct: maxDDPct,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    currentStreak,
    longestWinStreak: longestWin,
    longestLoseStreak: longestLose,
  };
}

export function computeEquityCurve(trades: Trade[]): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => a.closedAt - b.closedAt);
  let equity = sorted.length > 0 ? sorted[0].accountBalance : 0;
  const points: EquityPoint[] = [{ t: sorted[0]?.openedAt ?? Date.now(), equity }];

  for (const t of sorted) {
    equity += t.pnl;
    points.push({ t: t.closedAt, equity });
  }
  return points;
}

export function computePairStats(trades: Trade[]): PairStats[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = map.get(t.pair) ?? [];
    arr.push(t);
    map.set(t.pair, arr);
  }

  return Array.from(map.entries())
    .map(([pair, pts]) => {
      const wins = pts.filter((t) => t.result === "win").length;
      const rrs = pts.filter((t) => t.rr !== null).map((t) => t.rr!);
      return {
        pair,
        trades: pts.length,
        winRate: (wins / pts.length) * 100,
        totalPnl: pts.reduce((s, t) => s + t.pnl, 0),
        avgRR: rrs.length > 0 ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0,
      };
    })
    .sort((a, b) => b.trades - a.trades);
}

export function computeSetupStats(trades: Trade[]): SetupStats[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    if (!t.setup) continue;
    const arr = map.get(t.setup) ?? [];
    arr.push(t);
    map.set(t.setup, arr);
  }

  return Array.from(map.entries())
    .map(([setup, pts]) => {
      const wins = pts.filter((t) => t.result === "win").length;
      const rrs = pts.filter((t) => t.rr !== null).map((t) => t.rr!);
      return {
        setup,
        trades: pts.length,
        winRate: (wins / pts.length) * 100,
        totalPnl: pts.reduce((s, t) => s + t.pnl, 0),
        avgRR: rrs.length > 0 ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0,
      };
    })
    .sort((a, b) => b.trades - a.trades);
}

export function computeHourStats(trades: Trade[]): HourStats[] {
  const buckets = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    trades: [] as Trade[],
  }));

  for (const t of trades) {
    const hour = new Date(t.openedAt).getHours();
    buckets[hour].trades.push(t);
  }

  return buckets.map((b) => ({
    hour: b.hour,
    trades: b.trades.length,
    winRate:
      b.trades.length > 0
        ? (b.trades.filter((t) => t.result === "win").length / b.trades.length) * 100
        : 0,
    totalPnl: b.trades.reduce((s, t) => s + t.pnl, 0),
  }));
}

export function computeDayStats(trades: Trade[]): DayStats[] {
  const buckets = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    trades: [] as Trade[],
  }));

  for (const t of trades) {
    const day = new Date(t.openedAt).getDay();
    buckets[day].trades.push(t);
  }

  return buckets.map((b) => ({
    day: b.day,
    dayName: DAY_NAMES[b.day],
    trades: b.trades.length,
    winRate:
      b.trades.length > 0
        ? (b.trades.filter((t) => t.result === "win").length / b.trades.length) * 100
        : 0,
    totalPnl: b.trades.reduce((s, t) => s + t.pnl, 0),
  }));
}

export function computeCalendar(trades: Trade[]): CalendarDay[] {
  const map = new Map<string, { trades: number; pnl: number }>();

  for (const t of trades) {
    const date = new Date(t.closedAt).toISOString().slice(0, 10);
    const entry = map.get(date) ?? { trades: 0, pnl: 0 };
    entry.trades++;
    entry.pnl += t.pnl;
    map.set(date, entry);
  }

  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
