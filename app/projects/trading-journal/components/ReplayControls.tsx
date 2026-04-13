"use client";

import type { ReplayEngineHook } from "../hooks/useReplayEngine";
import { LIVE_SYMBOLS, LIVE_INTERVALS } from "../lib/liveEngine";

const SPEEDS = [1, 2, 5, 10, 25, 60];
const REPLAY_INTERVALS = [...LIVE_INTERVALS, "1d"] as const;

type Props = {
  engine: ReplayEngineHook;
};

export function ReplayControls({ engine }: Props) {
  const {
    state, range, setRange, loading, error,
    play, pause, step, setSpeed, seek, switchPair, timestamp,
  } = engine;

  const total = state.bars.length;

  return (
    <div className="glass-card p-4 space-y-3">
      {/* Row 1: pair, interval, date range */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">pair</span>
          <select
            value={state.symbol}
            onChange={(e) => switchPair(e.target.value, state.interval)}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          >
            {LIVE_SYMBOLS.map((s) => (
              <option key={s.symbol} value={s.symbol}>{s.display}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">tf</span>
          <select
            value={state.interval}
            onChange={(e) => switchPair(state.symbol, e.target.value)}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          >
            {REPLAY_INTERVALS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">from</span>
          <input
            type="month"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)] uppercase tracking-wider">to</span>
          <input
            type="month"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {/* Row 2: transport + speed + timestamp */}
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
                state.speed === s
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[var(--muted)]">
          <span>{timestamp}</span>
          <span>{total > 0 ? `${state.cursor + 1} / ${total}` : loading ? "loading..." : "—"}</span>
        </div>
      </div>

      {/* Row 3: scrubber */}
      <input
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={state.cursor}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
        disabled={total === 0}
      />

      {error && (
        <p className="text-[10px] font-mono text-red-400">{error}</p>
      )}
    </div>
  );
}
