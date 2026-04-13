"use client";

import { useMemo } from "react";
import type { DepthData, DepthLevel } from "../hooks/useBinanceDepth";
import type { Kline } from "../lib/liveEngine";

type Props = {
  depth: DepthData | null;
  pricePrecision: number;
  mark: number;
  bars: Kline[];
};

type Bucket = {
  priceFrom: number;
  priceTo: number;
  qty: number;
  notional: number;
};

// Compute bucket size to always show ~10 rows per side.
//
// Key insight: the depth data from Binance always spans a fixed dollar
// range (~$125 per side for BTC at limit=1000). The bucket size must
// be derived from this ACTUAL depth span — not the chart's visible
// range — otherwise we get 2-3 buckets when the depth is thin.
//
// For higher timeframes where the chart shows a much wider range,
// we use the chart-based size (wider buckets, fewer rows). This is
// correct — it shows "the order book only covers this small part of
// what you're looking at."
function computeBucketSize(depth: DepthData | null, bars: Kline[], mark: number): number {
  if (mark <= 0) return roundNice(mark * 0.001 || 1);

  // 1. Depth-based: always give ~10 rows per side from actual data
  let depthBased = roundNice(mark * 0.001); // fallback
  if (depth) {
    const askSpan = depth.asks.length > 1
      ? depth.asks[depth.asks.length - 1][0] - depth.asks[0][0]
      : 0;
    const bidSpan = depth.bids.length > 1
      ? depth.bids[0][0] - depth.bids[depth.bids.length - 1][0]
      : 0;
    const span = Math.max(askSpan, bidSpan);
    if (span > 0) {
      depthBased = roundNice(span / 10);
    }
  }

  // 2. Chart-based: match the visible price axis
  let chartBased = depthBased; // default to depth-based
  if (bars.length >= 5) {
    const visible = bars.slice(-50);
    const visHigh = Math.max(...visible.map((b) => b.high));
    const visLow = Math.min(...visible.map((b) => b.low));
    const visRange = visHigh - visLow;
    if (visRange > 0) {
      chartBased = roundNice(visRange / 12);
    }
  }

  // Use the LARGER of the two — ensures we always fill the depth
  // on lower TFs (where depth span < chart range), and use chart
  // scale on higher TFs (where chart range >> depth span).
  // But cap depth-based to not go below a minimum that gives 10 rows.
  return Math.max(depthBased, chartBased) === chartBased && chartBased > depthBased * 3
    ? chartBased // higher TF: use chart scale
    : depthBased; // lower TF: use depth scale for max rows
}

// Snap to a "chart-friendly" nice number that matches typical
// price axis ticks.
function roundNice(raw: number): number {
  if (raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag; // 1 ≤ norm < 10
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3.5) nice = 2;
  else if (norm < 7.5) nice = 5;
  else nice = 10;
  return nice * mag;
}

function aggregateLevels(
  levels: DepthLevel[],
  bucketSize: number,
  mark: number,
  maxBuckets: number,
  direction: "bid" | "ask"
): Bucket[] {
  if (levels.length === 0 || bucketSize <= 0) return [];

  // Create empty buckets radiating out from the mark price
  const buckets: Bucket[] = [];
  const startBucket = Math.floor(mark / bucketSize) * bucketSize;

  if (direction === "ask") {
    // Buckets going UP from mark
    for (let i = 0; i < maxBuckets; i++) {
      const from = startBucket + i * bucketSize;
      buckets.push({ priceFrom: from, priceTo: from + bucketSize, qty: 0, notional: 0 });
    }
  } else {
    // Buckets going DOWN from mark
    for (let i = 0; i < maxBuckets; i++) {
      const from = startBucket - (i + 1) * bucketSize;
      if (from < 0) break;
      buckets.push({ priceFrom: from, priceTo: from + bucketSize, qty: 0, notional: 0 });
    }
  }

  // Fill buckets with depth data
  for (const [price, qty] of levels) {
    for (const bucket of buckets) {
      if (price >= bucket.priceFrom && price < bucket.priceTo) {
        bucket.qty += qty;
        bucket.notional += price * qty;
        break;
      }
    }
  }

  return buckets;
}

export function OrderBook({ depth, pricePrecision, mark, bars }: Props) {
  const bucketSize = useMemo(() => computeBucketSize(depth, bars, mark), [depth, bars, mark]);
  const maxBuckets = 20;

  const { askBuckets, bidBuckets, maxQty, totalAskNotional, totalBidNotional, totalAskQty, totalBidQty } =
    useMemo(() => {
      if (!depth) return { askBuckets: [], bidBuckets: [], maxQty: 1, totalAskNotional: 0, totalBidNotional: 0, totalAskQty: 0, totalBidQty: 0 };

      const ab = aggregateLevels(depth.asks, bucketSize, mark, maxBuckets, "ask");
      const bb = aggregateLevels(depth.bids, bucketSize, mark, maxBuckets, "bid");

      // Filter out empty buckets beyond the depth data range
      const abFiltered = ab.filter((b) => b.qty > 0);
      const bbFiltered = bb.filter((b) => b.qty > 0);

      const mq = Math.max(
        1,
        ...abFiltered.map((b) => b.qty),
        ...bbFiltered.map((b) => b.qty)
      );

      return {
        askBuckets: abFiltered,
        bidBuckets: bbFiltered,
        maxQty: mq,
        totalAskNotional: abFiltered.reduce((s, b) => s + b.notional, 0),
        totalBidNotional: bbFiltered.reduce((s, b) => s + b.notional, 0),
        totalAskQty: abFiltered.reduce((s, b) => s + b.qty, 0),
        totalBidQty: bbFiltered.reduce((s, b) => s + b.qty, 0),
      };
    }, [depth, bucketSize, mark]);

  if (!depth) {
    return (
      <div className="glass-card p-3 h-full flex items-center justify-center">
        <p className="text-[9px] font-mono text-[var(--muted)]">Loading depth...</p>
      </div>
    );
  }

  const totalQty = totalAskQty + totalBidQty;
  const bidPct = totalQty > 0 ? (totalBidQty / totalQty) * 100 : 50;

  // Price display: use fewer decimals for larger bucket sizes
  const dp = bucketSize >= 1000 ? 0
    : bucketSize >= 100 ? 0
    : bucketSize >= 10 ? 1
    : bucketSize >= 1 ? 1
    : pricePrecision;

  return (
    <div className="glass-card p-3 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--accent)]">
          &gt; depth
        </p>
        <span className="text-[7px] font-mono text-[var(--muted)]">
          ${bucketSize < 1 ? bucketSize.toFixed(2) : bucketSize.toFixed(0)} per level
        </span>
      </div>

      {/* Header */}
      <div className="flex justify-between text-[7px] font-mono text-[var(--muted)] uppercase tracking-widest mb-0.5 flex-shrink-0 px-0.5">
        <span>price</span>
        <span>qty</span>
        <span>total</span>
      </div>

      {/* Asks — reversed so closest-to-price is at the bottom */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {[...askBuckets].reverse().map((bucket) => (
          <BucketRow
            key={bucket.priceFrom}
            bucket={bucket}
            maxQty={maxQty}
            dp={dp}
            side="ask"
          />
        ))}
      </div>

      {/* Current price */}
      <div className="flex items-center justify-between py-1 border-y border-[var(--border)] my-0.5 flex-shrink-0">
        <span className="text-[10px] font-mono font-bold text-[var(--fg)] tabular-nums">
          {mark.toFixed(pricePrecision)}
        </span>
        <span className="text-[7px] font-mono text-[var(--muted)]">
          {bidPct.toFixed(0)}% / {(100 - bidPct).toFixed(0)}%
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {bidBuckets.map((bucket) => (
          <BucketRow
            key={bucket.priceFrom}
            bucket={bucket}
            maxQty={maxQty}
            dp={dp}
            side="bid"
          />
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex-shrink-0 pt-1.5 mt-1 border-t border-[var(--border)]">
        <div className="flex justify-between text-[7px] font-mono text-[var(--muted)] mb-0.5">
          <span>{formatK(totalBidNotional)}</span>
          <span>{formatK(totalAskNotional)}</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500/70" style={{ width: `${bidPct}%` }} />
          <div className="bg-red-500/70" style={{ width: `${100 - bidPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function BucketRow({
  bucket,
  maxQty,
  dp,
  side,
}: {
  bucket: Bucket;
  maxQty: number;
  dp: number;
  side: "bid" | "ask";
}) {
  const barPct = (bucket.qty / maxQty) * 100;
  const isWall = barPct > 50;
  const bgColor = side === "bid" ? "rgba(34,197,94," : "rgba(239,68,68,";

  return (
    <div className="relative flex justify-between items-center py-[1.5px] text-[8px] font-mono tabular-nums px-0.5">
      <div
        className="absolute inset-0 rounded-[1px]"
        style={{
          width: `${Math.min(100, barPct)}%`,
          backgroundColor: `${bgColor}${isWall ? "0.3" : "0.1"})`,
          [side === "bid" ? "left" : "right"]: 0,
        }}
      />
      <span
        className={`relative z-10 ${isWall ? "font-bold" : ""}`}
        style={{ color: side === "bid" ? "#22c55e" : "#ef4444" }}
      >
        {bucket.priceFrom.toFixed(dp)}
      </span>
      <span className={`relative z-10 ${isWall ? "font-bold text-[var(--fg)]" : "text-[var(--fg)]"}`}>
        {fmtQty(bucket.qty)}
      </span>
      <span className="relative z-10 text-[var(--muted)]">
        {formatK(bucket.notional)}
      </span>
    </div>
  );
}

function fmtQty(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(3);
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}
