"use client";

import { SYMBOLS, INTERVALS, Interval } from "../lib/symbols";
import type { ReplayHook } from "../hooks/useReplayEngine";

const SPEEDS = [1, 2, 5, 10, 25, 60];

export function ReplayControls({ engine }: { engine: ReplayHook }) {
  const { state, range, setRange, play, pause, step, setSpeed, seek, switchPair } =
    engine;

  const total = state.bars.length;
  const currentBar = state.bars[state.cursor];
  const tsLabel = currentBar
    ? new Date(currentBar.openTime).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "—";

  return (
    <div className="glass-card p-4 space-y-4">
      {/* row 1: pair, interval, range */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">pair</span>
          <select
            value={state.symbol}
            onChange={(e) => switchPair(e.target.value, state.interval as Interval)}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          >
            {SYMBOLS.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.display}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">tf</span>
          <select
            value={state.interval}
            onChange={(e) => switchPair(state.symbol, e.target.value as Interval)}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">from</span>
          <input
            type="month"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange(e.target.value, range.to)}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">to</span>
          <input
            type="month"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange(range.from, e.target.value)}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {/* row 2: transport */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
        {state.playing ? (
          <button
            onClick={pause}
            className="px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition"
          >
            ⏸ pause
          </button>
        ) : (
          <button
            onClick={play}
            disabled={total === 0 || state.cursor >= total - 1}
            className="px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ▶ play
          </button>
        )}
        <button
          onClick={step}
          disabled={total === 0 || state.cursor >= total - 1}
          className="px-3 py-1.5 rounded border border-[var(--border)] text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition disabled:opacity-30"
        >
          ⏭ step
        </button>

        <div className="flex items-center gap-1">
          <span className="text-[var(--muted)] uppercase tracking-wider">speed</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded border transition ${
                state.speedBarsPerSec === s
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[var(--muted)]">
          <span>{tsLabel}</span>
          <span>
            {total > 0 ? `${state.cursor + 1} / ${total}` : "loading…"}
          </span>
        </div>
      </div>

      {/* row 3: scrubber */}
      <input
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={state.cursor}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
        disabled={total === 0}
      />
    </div>
  );
}
