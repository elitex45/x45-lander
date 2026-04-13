"use client";

import type { EquityPoint } from "../lib/types";

type Props = {
  points: EquityPoint[];
};

export function EquityCurve({ points }: Props) {
  if (points.length < 2) return null;

  const W = 600;
  const H = 120;
  const PAD = 4;

  const values = points.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => PAD + (1 - (v - min) / range) * (H - PAD * 2);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.equity).toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${toX(points.length - 1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`;

  const startEquity = points[0].equity;
  const endEquity = points[points.length - 1].equity;
  const isPositive = endEquity >= startEquity;
  const color = isPositive ? "#22c55e" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Start line */}
      <line
        x1={PAD}
        y1={toY(startEquity)}
        x2={W - PAD}
        y2={toY(startEquity)}
        stroke="var(--border)"
        strokeWidth="0.5"
        strokeDasharray="4 4"
      />
      <path d={areaPath} fill="url(#eq-fill)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
