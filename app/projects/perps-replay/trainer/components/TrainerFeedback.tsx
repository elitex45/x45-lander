"use client";

import type { Classification } from "../../lib/regime";
import { REGIME_META, type Regime } from "../../lib/regime";

type Props = {
  classification: Classification;
  userAnswer: Regime;
  symbol: string;
  interval: string;
  windowStartMs: number;
  windowEndMs: number;
};

// Reveal panel shown after the user picks a regime. Shows:
//   - whether they were right
//   - the algorithmic answer + reasoning
//   - the underlying numbers (ADX, EMAs, ATR) so they learn what to look for
//   - the symbol + date range (hidden during the quiz to avoid hints)
export function TrainerFeedback({
  classification,
  userAnswer,
  symbol,
  interval,
  windowStartMs,
  windowEndMs,
}: Props) {
  const correct = classification.regime === userAnswer;
  const correctMeta = REGIME_META[classification.regime];

  const fmtDate = (ms: number) =>
    new Date(ms).toISOString().slice(0, 10);

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Result banner */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--muted)] mb-1">
            verdict
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: correct ? "#22c55e" : "#ef4444" }}
          >
            {correct ? "Correct" : "Wrong"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--muted)] mb-1">
            algo says
          </p>
          <p
            className="text-base font-medium tracking-tight"
            style={{ color: correctMeta.color }}
          >
            {correctMeta.label}
          </p>
        </div>
      </div>

      {/* Reasoning line */}
      <div className="text-xs text-[var(--fg)] leading-relaxed border-l-2 border-[var(--accent)] pl-3 py-1">
        {classification.reason}
      </div>

      {/* Underlying numbers — the math the classifier was reading */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[10px] font-mono">
        <Stat
          label="efficiency"
          value={classification.er.toFixed(2)}
          hint={
            classification.er >= 0.45
              ? "trending"
              : classification.er < 0.2
                ? "ranging"
                : "mixed"
          }
        />
        <Stat label="ADX(14)" value={classification.adx.toFixed(1)} />
        <Stat
          label="20 EMA / 50 EMA"
          value={
            classification.ema50 > 0
              ? `${(classification.ema20 / classification.ema50).toFixed(3)}×`
              : "—"
          }
          hint={classification.ema20 > classification.ema50 ? "above" : "below"}
        />
        <Stat
          label="last 15 bars / ATR"
          value={`${classification.recentMoveATR >= 0 ? "+" : ""}${classification.recentMoveATR.toFixed(1)}×`}
        />
        <Stat label="ATR(14)" value={classification.atr.toFixed(2)} />
      </div>

      {/* Reveal what symbol + range this was */}
      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
        <span>
          this was{" "}
          <span className="text-[var(--fg)]">{symbol}</span> on{" "}
          <span className="text-[var(--fg)]">{interval}</span>
        </span>
        <span>
          {fmtDate(windowStartMs)} → {fmtDate(windowEndMs)}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[var(--muted)] uppercase tracking-widest mb-1">{label}</p>
      <p className="text-[var(--fg)] tabular-nums text-sm font-medium">
        {value}
        {hint && (
          <span className="ml-1 text-[var(--muted)] font-normal">{hint}</span>
        )}
      </p>
    </div>
  );
}
