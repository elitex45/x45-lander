"use client";

import { useMemo } from "react";
import type { Kline } from "../lib/liveEngine";
import { classifyRegime, REGIME_META } from "../lib/indicators";

type Props = {
  bars: Kline[];
};

export function RegimeBadge({ bars }: Props) {
  const result = useMemo(() => classifyRegime(bars), [bars]);
  const meta = REGIME_META[result.regime];

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)]">
          regime
        </p>
        <span
          className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
          style={{ color: meta.color, borderColor: meta.color }}
        >
          {meta.label}
        </span>
      </div>
      <p className="text-[8px] font-mono text-[var(--muted)] mb-2">{result.reason}</p>
      <div className="grid grid-cols-5 gap-1 text-[8px] font-mono text-center">
        <div>
          <p className="text-[var(--muted)]">ADX</p>
          <p className="text-[var(--fg)] tabular-nums">{result.adx.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">RSI</p>
          <p className="text-[var(--fg)] tabular-nums">{result.rsi.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">CHOP</p>
          <p className="text-[var(--fg)] tabular-nums">{result.chop.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">EMA20</p>
          <p className="text-[var(--fg)] tabular-nums">{result.ema20.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">EMA50</p>
          <p className="text-[var(--fg)] tabular-nums">{result.ema50.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}
