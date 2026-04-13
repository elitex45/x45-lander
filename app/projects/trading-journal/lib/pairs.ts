export type PairMeta = {
  symbol: string; // "BTC-PERP"
  base: string; // "BTC"
  tickSize: number;
  pricePrecision: number;
  maxLeverage: number;
};

// Top Hyperliquid perp pairs
export const PAIRS: PairMeta[] = [
  { symbol: "BTC-PERP", base: "BTC", tickSize: 0.1, pricePrecision: 1, maxLeverage: 100 },
  { symbol: "ETH-PERP", base: "ETH", tickSize: 0.01, pricePrecision: 2, maxLeverage: 100 },
  { symbol: "SOL-PERP", base: "SOL", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "BNB-PERP", base: "BNB", tickSize: 0.01, pricePrecision: 2, maxLeverage: 50 },
  { symbol: "XRP-PERP", base: "XRP", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "DOGE-PERP", base: "DOGE", tickSize: 0.00001, pricePrecision: 5, maxLeverage: 50 },
  { symbol: "SUI-PERP", base: "SUI", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "AVAX-PERP", base: "AVAX", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "LINK-PERP", base: "LINK", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "ADA-PERP", base: "ADA", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "ARB-PERP", base: "ARB", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "OP-PERP", base: "OP", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "APT-PERP", base: "APT", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "NEAR-PERP", base: "NEAR", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "WIF-PERP", base: "WIF", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "PEPE-PERP", base: "PEPE", tickSize: 0.00000001, pricePrecision: 8, maxLeverage: 50 },
  { symbol: "TIA-PERP", base: "TIA", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "INJ-PERP", base: "INJ", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "SEI-PERP", base: "SEI", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "JUP-PERP", base: "JUP", tickSize: 0.0001, pricePrecision: 4, maxLeverage: 50 },
  { symbol: "HYPE-PERP", base: "HYPE", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
  { symbol: "TRUMP-PERP", base: "TRUMP", tickSize: 0.001, pricePrecision: 3, maxLeverage: 50 },
];

export const PAIR_MAP = new Map(PAIRS.map((p) => [p.symbol, p]));

// Hyperliquid fee structure
export const DEFAULT_MAKER_FEE = 0.0001; // 0.01%
export const DEFAULT_TAKER_FEE = 0.00035; // 0.035%

export const DEFAULT_SETUPS = [
  "EMA pullback",
  "Range bounce",
  "Breakout",
  "Trend continuation",
  "Mean reversion",
  "Momentum",
  "Scalp",
  "News/event",
  "Other",
];
