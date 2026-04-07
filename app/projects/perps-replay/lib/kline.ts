import type { Interval } from "./symbols";

export type Kline = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

// In-tab session cache so changing replay speed / scrubbing back never re-hits
// the network for data we already loaded.
const memCache = new Map<string, Kline[]>();

function key(symbol: string, interval: Interval, month: string) {
  return `${symbol}|${interval}|${month}`;
}

async function fetchMonth(
  symbol: string,
  interval: Interval,
  month: string
): Promise<Kline[]> {
  const cached = memCache.get(key(symbol, interval, month));
  if (cached) return cached;

  const url = `/api/binance-klines?symbol=${symbol}&interval=${interval}&month=${month}`;
  const res = await fetch(url);
  if (res.status === 404) {
    // Month doesn't exist (symbol too young, or before futures launch)
    memCache.set(key(symbol, interval, month), []);
    return [];
  }
  if (!res.ok) {
    throw new Error(`klines fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as Kline[];
  memCache.set(key(symbol, interval, month), data);
  return data;
}

// Range is INclusive on both ends, expressed as YYYY-MM strings.
export async function loadKlinesRange(
  symbol: string,
  interval: Interval,
  fromMonth: string,
  toMonth: string
): Promise<Kline[]> {
  const months = monthsBetween(fromMonth, toMonth);
  const chunks = await Promise.all(
    months.map((m) => fetchMonth(symbol, interval, m))
  );
  const all: Kline[] = [];
  for (const chunk of chunks) all.push(...chunk);
  // Defensive: sort + dedupe by openTime in case ranges overlap.
  all.sort((a, b) => a.openTime - b.openTime);
  for (let i = all.length - 1; i > 0; i--) {
    if (all[i].openTime === all[i - 1].openTime) all.splice(i, 1);
  }
  return all;
}

export function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

// Default replay window: previous N closed months relative to today.
export function defaultMonthRange(monthsBack: number): {
  from: string;
  to: string;
} {
  // "Closed" = strictly before the current month, since the current month's
  // monthly file isn't published until after month-end.
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const start = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (monthsBack - 1), 1)
  );
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return { from: fmt(start), to: fmt(end) };
}
