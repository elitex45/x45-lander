// Static metadata for the top ~20 USDⓈ-M perpetuals on Binance Futures.
// Hard-coded so we never depend on Binance's exchangeInfo at runtime
// (avoids CORS + keeps the bundle deterministic).

export type SymbolMeta = {
  symbol: string;
  display: string;
  pricePrecision: number;
  qtyPrecision: number;
  tickSize: number;
  minNotional: number;
  maxLeverage: number;
  mmr: number; // maintenance margin rate, simplified
};

export const SYMBOLS: SymbolMeta[] = [
  { symbol: "BTCUSDT",  display: "BTC-PERP",  pricePrecision: 2, qtyPrecision: 3, tickSize: 0.1,    minNotional: 5, maxLeverage: 125, mmr: 0.004 },
  { symbol: "ETHUSDT",  display: "ETH-PERP",  pricePrecision: 2, qtyPrecision: 3, tickSize: 0.01,   minNotional: 5, maxLeverage: 100, mmr: 0.005 },
  { symbol: "SOLUSDT",  display: "SOL-PERP",  pricePrecision: 4, qtyPrecision: 2, tickSize: 0.001,  minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "BNBUSDT",  display: "BNB-PERP",  pricePrecision: 2, qtyPrecision: 2, tickSize: 0.01,   minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "XRPUSDT",  display: "XRP-PERP",  pricePrecision: 4, qtyPrecision: 1, tickSize: 0.0001, minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "DOGEUSDT", display: "DOGE-PERP", pricePrecision: 5, qtyPrecision: 0, tickSize: 0.00001,minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "ADAUSDT",  display: "ADA-PERP",  pricePrecision: 4, qtyPrecision: 0, tickSize: 0.0001, minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "AVAXUSDT", display: "AVAX-PERP", pricePrecision: 4, qtyPrecision: 2, tickSize: 0.001,  minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "LINKUSDT", display: "LINK-PERP", pricePrecision: 3, qtyPrecision: 2, tickSize: 0.001,  minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "TONUSDT",  display: "TON-PERP",  pricePrecision: 4, qtyPrecision: 2, tickSize: 0.0001, minNotional: 5, maxLeverage: 50,  mmr: 0.005 },
  { symbol: "TRXUSDT",  display: "TRX-PERP",  pricePrecision: 5, qtyPrecision: 0, tickSize: 0.00001,minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "DOTUSDT",  display: "DOT-PERP",  pricePrecision: 3, qtyPrecision: 1, tickSize: 0.001,  minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "MATICUSDT",display: "MATIC-PERP",pricePrecision: 4, qtyPrecision: 0, tickSize: 0.0001, minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "NEARUSDT", display: "NEAR-PERP", pricePrecision: 4, qtyPrecision: 0, tickSize: 0.0001, minNotional: 5, maxLeverage: 50,  mmr: 0.005 },
  { symbol: "LTCUSDT",  display: "LTC-PERP",  pricePrecision: 2, qtyPrecision: 3, tickSize: 0.01,   minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "BCHUSDT",  display: "BCH-PERP",  pricePrecision: 2, qtyPrecision: 3, tickSize: 0.01,   minNotional: 5, maxLeverage: 75,  mmr: 0.005 },
  { symbol: "ARBUSDT",  display: "ARB-PERP",  pricePrecision: 4, qtyPrecision: 1, tickSize: 0.0001, minNotional: 5, maxLeverage: 50,  mmr: 0.005 },
  { symbol: "OPUSDT",   display: "OP-PERP",   pricePrecision: 4, qtyPrecision: 1, tickSize: 0.0001, minNotional: 5, maxLeverage: 50,  mmr: 0.005 },
  { symbol: "SUIUSDT",  display: "SUI-PERP",  pricePrecision: 4, qtyPrecision: 1, tickSize: 0.0001, minNotional: 5, maxLeverage: 50,  mmr: 0.005 },
  { symbol: "APTUSDT",  display: "APT-PERP",  pricePrecision: 4, qtyPrecision: 2, tickSize: 0.0001, minNotional: 5, maxLeverage: 50,  mmr: 0.005 },
];

export const SYMBOL_SET = new Set(SYMBOLS.map((s) => s.symbol));

export function getSymbolMeta(symbol: string): SymbolMeta | undefined {
  return SYMBOLS.find((s) => s.symbol === symbol);
}

export const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type Interval = (typeof INTERVALS)[number];
export const INTERVAL_SET: Set<string> = new Set(INTERVALS);

// approximate ms duration of an interval — used for date math + bar counts
export const INTERVAL_MS: Record<Interval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};
