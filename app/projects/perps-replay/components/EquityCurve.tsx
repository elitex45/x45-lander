"use client";

import type { ReplayHook } from "../hooks/useReplayEngine";

export function EquityCurve({ engine }: { engine: ReplayHook }) {
  const { state } = engine;
  const points = state.account.equityCurve;
  const start = state.account.startingBalance;

  if (points.length < 2) {
    return (
      <div className="glass-card p-4 text-xs font-mono">
        <div className="text-[var(--muted)] uppercase tracking-wider mb-2">
          equity curve
        </div>
        <div className="text-[var(--muted)] opacity-60">replay forward to populate</div>
      </div>
    );
  }

  const w = 280;
  const h = 80;
  const ys = points.map((p) => p.equity);
  const min = Math.min(start, ...ys);
  const max = Math.max(start, ...ys);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - ((p.equity - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const baselineY = h - ((start - min) / range) * h;
  const last = ys[ys.length - 1];
  const lastColor = last >= start ? "var(--accent)" : "#ef4444";

  return (
    <div className="glass-card p-4 text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[var(--muted)] uppercase tracking-wider">
          equity curve
        </div>
        <div style={{ color: lastColor }}>{last.toFixed(2)}</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <line
          x1={0}
          x2={w}
          y1={baselineY}
          y2={baselineY}
          stroke="var(--border)"
          strokeDasharray="2 3"
        />
        <path d={path} fill="none" stroke={lastColor} strokeWidth={1.5} />
      </svg>
    </div>
  );
}
