import { unzipSync, strFromU8 } from "fflate";
import type { NextRequest } from "next/server";
import { SYMBOL_SET, INTERVAL_SET } from "@/app/projects/perps-replay/lib/symbols";

// Run in Node so we can use fflate's sync API on the binary zip buffer.
export const runtime = "nodejs";
// We do not want Next caching the upstream zip on its own — we set HTTP cache
// headers ourselves so the browser + any CDN can cache aggressively.
export const dynamic = "force-dynamic";

const BASE = "https://data.binance.vision/data/futures/um";

// /api/binance-klines?symbol=BTCUSDT&interval=1h&month=2024-03
// /api/binance-klines?symbol=BTCUSDT&interval=1h&date=2024-03-15
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const symbol = sp.get("symbol")?.toUpperCase() ?? "";
  const interval = sp.get("interval") ?? "";
  const month = sp.get("month"); // YYYY-MM
  const date = sp.get("date"); // YYYY-MM-DD

  if (!SYMBOL_SET.has(symbol)) {
    return Response.json({ error: "invalid_symbol" }, { status: 400 });
  }
  if (!INTERVAL_SET.has(interval)) {
    return Response.json({ error: "invalid_interval" }, { status: 400 });
  }
  if (!month && !date) {
    return Response.json({ error: "missing_month_or_date" }, { status: 400 });
  }
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "invalid_month_format" }, { status: 400 });
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "invalid_date_format" }, { status: 400 });
  }

  const granularity = month ? "monthly" : "daily";
  const stamp = month ?? date!;
  const url = `${BASE}/${granularity}/klines/${symbol}/${interval}/${symbol}-${interval}-${stamp}.zip`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: "no-store" });
  } catch {
    return Response.json({ error: "upstream_unreachable" }, { status: 502 });
  }

  if (upstream.status === 404) {
    return Response.json({ error: "no_data", url }, { status: 404 });
  }
  if (!upstream.ok) {
    return Response.json(
      { error: "upstream_error", status: upstream.status },
      { status: 502 }
    );
  }

  const buf = new Uint8Array(await upstream.arrayBuffer());

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buf);
  } catch {
    return Response.json({ error: "unzip_failed" }, { status: 500 });
  }

  const csvName = Object.keys(entries).find((n) => n.endsWith(".csv"));
  if (!csvName) {
    return Response.json({ error: "no_csv_in_zip" }, { status: 500 });
  }
  const csv = strFromU8(entries[csvName]);

  const klines = parseKlinesCsv(csv);

  // Monthly files for closed months are immutable; daily files for closed days
  // are also stable. We cache hard.
  const cacheControl =
    granularity === "monthly"
      ? "public, max-age=86400, s-maxage=2592000, immutable"
      : "public, max-age=3600, s-maxage=86400";

  return Response.json(klines, {
    headers: {
      "Cache-Control": cacheControl,
      "X-Source": url,
    },
  });
}

// Binance Vision kline CSV columns:
//   open_time, open, high, low, close, volume, close_time,
//   quote_volume, count, taker_buy_volume, taker_buy_quote_volume, ignore
function parseKlinesCsv(csv: string) {
  const out: {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
  }[] = [];
  const lines = csv.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Some files include a header row; detect it by trying to parse the first cell.
    const firstComma = line.indexOf(",");
    const firstCell = firstComma === -1 ? line : line.slice(0, firstComma);
    const firstNum = Number(firstCell);
    if (!Number.isFinite(firstNum)) continue;
    const cells = line.split(",");
    if (cells.length < 7) continue;
    out.push({
      openTime: Number(cells[0]),
      open: Number(cells[1]),
      high: Number(cells[2]),
      low: Number(cells[3]),
      close: Number(cells[4]),
      volume: Number(cells[5]),
      closeTime: Number(cells[6]),
    });
  }
  return out;
}
