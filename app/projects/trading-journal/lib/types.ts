export type Side = "long" | "short";
export type TradeResult = "win" | "loss" | "breakeven";

export type ExitReason =
  | "tp-hit"
  | "sl-hit"
  | "manual"
  | "liquidated"
  | "trailing-stop"
  | "time-based"
  | "other";

export type Trade = {
  id: string;
  pair: string; // e.g. "BTC-PERP"
  side: Side;
  leverage: number;
  entryPx: number;
  exitPx: number;
  sl: number | null;
  tp: number | null;
  // Position
  sizeUsd: number; // notional (margin × leverage)
  margin: number; // USDT committed
  // Risk
  accountBalance: number; // balance at time of trade
  riskUsd: number; // how much you'd lose if SL hit
  riskPct: number; // riskUsd / accountBalance × 100
  rr: number | null; // reward:risk ratio (null if no SL/TP)
  // Result
  pnl: number; // realized PnL after fees
  pnlPct: number; // pnl / margin × 100
  fees: number; // total fees paid (entry + exit)
  result: TradeResult;
  exitReason: ExitReason;
  // Meta
  setup: string; // e.g. "EMA pullback", "range bounce"
  notes: string;
  openedAt: number; // ms timestamp
  closedAt: number; // ms timestamp
};

// What the form collects before we compute derived fields
export type TradeFormData = {
  pair: string;
  side: Side;
  leverage: number;
  entryPx: string; // string for form input
  exitPx: string;
  sl: string;
  tp: string;
  margin: string;
  accountBalance: string;
  exitReason: ExitReason;
  setup: string;
  notes: string;
  openedAt: string; // ISO datetime-local string
  closedAt: string;
};

export type JournalSettings = {
  defaultBalance: number;
  makerFee: number; // 0.0001 = 0.01%
  takerFee: number; // 0.00035 = 0.035%
  defaultLeverage: number;
  setups: string[]; // user-defined setup tags
};

// Dashboard computed types
export type DashboardStats = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // 0-100
  totalPnl: number;
  totalFees: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number; // avg $ per trade
  profitFactor: number; // gross profit / gross loss
  avgRR: number;
  maxDrawdown: number; // peak-to-trough in USD
  maxDrawdownPct: number;
  bestTrade: number;
  worstTrade: number;
  currentStreak: { type: TradeResult; count: number };
  longestWinStreak: number;
  longestLoseStreak: number;
};

export type EquityPoint = {
  t: number; // timestamp
  equity: number;
};

export type PairStats = {
  pair: string;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgRR: number;
};

export type SetupStats = {
  setup: string;
  trades: number;
  winRate: number;
  totalPnl: number;
  avgRR: number;
};

export type HourStats = {
  hour: number; // 0-23
  trades: number;
  winRate: number;
  totalPnl: number;
};

export type DayStats = {
  day: number; // 0=Sun, 6=Sat
  dayName: string;
  trades: number;
  winRate: number;
  totalPnl: number;
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  trades: number;
  pnl: number;
};
