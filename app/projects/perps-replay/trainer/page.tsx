"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TrainerChart } from "./components/TrainerChart";
import { RegimeButtons } from "./components/RegimeButtons";
import { TrainerFeedback } from "./components/TrainerFeedback";
import { TrainerHistory } from "./components/TrainerHistory";
import {
  Classification,
  classifyRegime,
  REGIME_META,
  type Regime,
} from "../lib/regime";
import {
  load as loadStats,
  save as saveStats,
  recordRound,
  reset as resetStats,
  clearHistory as clearHistoryStats,
  type TrainerStats,
} from "../lib/trainerStorage";
import { loadKlinesRange, type Kline } from "../lib/kline";
import { SYMBOLS, type Interval } from "../lib/symbols";

// ───── Tunables ─────
// Only timeframes the regime concept actually means something on
// (4h + 1d, per learning/readme.md lines 121-130).
const TRAINER_INTERVALS: Interval[] = ["4h", "1d"];
// Number of bars the user labels per round.
const WINDOW_BARS = 60;
// How many bars after the labeling window to reveal once the user
// answers — gives them a sense of "what happened next".
const FUTURE_BARS = 30;
// Total bars we need from the loader = WINDOW + FUTURE + slack so the
// random start has room to maneuver.
const SLACK_BARS = 50;

// How many months back we'll randomly draw from. Avoids both the dead
// pre-2021 era and the most recent open month (which Binance Vision
// hasn't published yet).
const MIN_MONTHS_BACK = 2;
const MAX_MONTHS_BACK = 36;

type Status = "idle" | "loading" | "ready" | "answered" | "error";

type Round = {
  symbol: string;
  interval: Interval;
  // The window the user is labeling
  windowBars: Kline[];
  // The bars after the window — only rendered after the user answers
  futureBars: Kline[];
  classification: Classification;
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick a YYYY-MM string `monthsBack` months before today.
function monthOffset(monthsBack: number): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1)
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function RegimeTrainerPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [round, setRound] = useState<Round | null>(null);
  const [userAnswer, setUserAnswer] = useState<Regime | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<TrainerStats | null>(null);

  // Hydrate stats once on mount
  useEffect(() => {
    setStats(loadStats());
  }, []);

  // ───── round loader ─────
  // Picks a random pair + interval + month range, fetches bars, picks
  // a random slice from within them. Retries up to 5 times if the
  // chosen month doesn't have enough bars (e.g. symbol too young).
  const loadNewRound = useCallback(async () => {
    setStatus("loading");
    setUserAnswer(null);
    setError(null);

    const minBarsNeeded = WINDOW_BARS + FUTURE_BARS + SLACK_BARS;

    for (let attempt = 0; attempt < 6; attempt++) {
      const symbol = pick(SYMBOLS).symbol;
      const interval = pick(TRAINER_INTERVALS);
      // For 4h we need ~5 months of bars to comfortably contain WINDOW+FUTURE.
      // For 1d we need ~6 months (180 bars). Be generous on both.
      const monthsToLoad = interval === "1d" ? 7 : 5;
      const startMonthsBack =
        Math.floor(
          Math.random() * (MAX_MONTHS_BACK - MIN_MONTHS_BACK - monthsToLoad)
        ) +
        MIN_MONTHS_BACK +
        monthsToLoad;
      const fromMonth = monthOffset(startMonthsBack);
      const toMonth = monthOffset(startMonthsBack - monthsToLoad + 1);

      try {
        const bars = await loadKlinesRange(symbol, interval, fromMonth, toMonth);
        if (bars.length < minBarsNeeded) {
          continue; // try another pair/range
        }

        // Pick a random start such that [start, start + WINDOW + FUTURE) is
        // entirely within the loaded data.
        const maxStart = bars.length - WINDOW_BARS - FUTURE_BARS;
        const start = Math.floor(Math.random() * maxStart);
        const windowBars = bars.slice(start, start + WINDOW_BARS);
        const futureBars = bars.slice(
          start + WINDOW_BARS,
          start + WINDOW_BARS + FUTURE_BARS
        );

        const classification = classifyRegime(windowBars);

        setRound({ symbol, interval, windowBars, futureBars, classification });
        setStatus("ready");
        return;
      } catch {
        // network / proxy hiccup — try a different slice
        continue;
      }
    }

    setError("Couldn't load a chart slice. Check your connection and retry.");
    setStatus("error");
  }, []);

  // Auto-load the first round on mount
  useEffect(() => {
    void loadNewRound();
    // intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───── answer handler ─────
  const handlePick = useCallback(
    (regime: Regime) => {
      if (!round || status !== "ready") return;
      setUserAnswer(regime);
      setStatus("answered");

      setStats((prev) => {
        const base = prev ?? loadStats();
        // Pass the full round data so it gets logged to history along
        // with the stats bump.
        const next = recordRound(base, round.classification.regime, regime, {
          symbol: round.symbol,
          interval: round.interval,
          windowBars: round.windowBars,
          futureBars: round.futureBars,
          classification: round.classification,
        });
        saveStats(next);
        return next;
      });
    },
    [round, status]
  );

  const handleResetStats = useCallback(() => {
    if (!window.confirm("Reset all trainer stats AND history? This can't be undone.")) {
      return;
    }
    resetStats();
    setStats(loadStats());
  }, []);

  const handleClearHistory = useCallback(() => {
    if (!window.confirm("Clear training history? Your accuracy stats will be kept.")) {
      return;
    }
    setStats((prev) => {
      const base = prev ?? loadStats();
      const next = clearHistoryStats(base);
      saveStats(next);
      return next;
    });
  }, []);

  // ───── derived display values ─────
  const accuracy =
    stats && stats.totalRounds > 0
      ? Math.round((stats.correctRounds / stats.totalRounds) * 100)
      : 0;
  const recentAccuracy =
    stats && stats.recentResults.length > 0
      ? Math.round(
          (stats.recentResults.filter(Boolean).length /
            stats.recentResults.length) *
            100
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
      <header className="mb-6 mt-2">
        <p className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase mb-2">
          &gt; ./projects/perps-replay/trainer
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fg)]">
              Regime Recognition Trainer
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
              Random chart slice from any pair, any month. Label the regime,
              get instant feedback against the ADX/EMA classifier. Train your
              eye to read structure before you trade it.
            </p>
          </div>
          <Link
            href="/projects/perps-replay"
            className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors"
          >
            ← back to replay
          </Link>
        </div>
      </header>

      {/* Stats strip */}
      {stats && (
        <div className="glass-card p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-0.5">
                accuracy
              </p>
              <p className="text-[var(--fg)] tabular-nums">
                <span className="text-xl font-bold text-[var(--accent)]">
                  {accuracy}%
                </span>{" "}
                <span className="text-[10px] text-[var(--muted)]">
                  {stats.correctRounds} / {stats.totalRounds}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-0.5">
                last {stats.recentResults.length}
              </p>
              <p className="text-[var(--fg)] tabular-nums text-xl font-bold">
                {recentAccuracy}%
              </p>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {stats.recentResults.map((r, i) => (
                <span
                  key={i}
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: r ? "#22c55e" : "#ef4444" }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
            <div className="hidden lg:flex items-center gap-3">
              {Object.entries(stats.byRegime).map(([r, s]) => {
                if (s.seen === 0) return null;
                const pct = Math.round((s.correct / s.seen) * 100);
                return (
                  <span key={r} className="flex items-center gap-1">
                    <span style={{ color: REGIME_META[r as Regime].color }}>
                      {REGIME_META[r as Regime].short}
                    </span>
                    <span className="text-[var(--fg)] tabular-nums">{pct}%</span>
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleResetStats}
              className="text-[var(--muted)] hover:text-red-400 transition-colors"
              title="Reset all stats"
            >
              reset
            </button>
          </div>
        </div>
      )}

      {/* Chart panel */}
      <div className="glass-card p-2 h-[480px] mb-4 relative">
        {round ? (
          <TrainerChart
            bars={round.windowBars}
            futureBars={status === "answered" ? round.futureBars : []}
            showIndicators={status === "answered"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-mono text-[var(--muted)]">
            {status === "loading" && "loading random chart…"}
            {status === "error" && (error ?? "something broke")}
            {status === "idle" && "starting up…"}
          </div>
        )}
      </div>

      {/* Quiz section */}
      {round && status === "ready" && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)] font-mono text-center">
            What regime is this? You see {WINDOW_BARS} bars — symbol and
            timeframe hidden until you answer.
          </p>
          <RegimeButtons
            selected={null}
            groundTruth={null}
            disabled={false}
            onPick={handlePick}
          />
        </div>
      )}

      {/* Reveal section */}
      {round && status === "answered" && userAnswer && (
        <div className="space-y-4">
          <RegimeButtons
            selected={userAnswer}
            groundTruth={round.classification.regime}
            disabled={true}
            onPick={() => {}}
          />
          <TrainerFeedback
            classification={round.classification}
            userAnswer={userAnswer}
            symbol={round.symbol}
            interval={round.interval}
            windowStartMs={round.windowBars[0].openTime}
            windowEndMs={
              round.windowBars[round.windowBars.length - 1].openTime
            }
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadNewRound}
              className="px-6 py-3 rounded-md text-xs font-mono uppercase tracking-widest border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
            >
              next round →
            </button>
          </div>
        </div>
      )}

      {/* Error retry */}
      {status === "error" && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={loadNewRound}
            className="px-6 py-3 rounded-md text-xs font-mono uppercase tracking-widest border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            try again
          </button>
        </div>
      )}

      {/* Training history — every completed round logged with chart,
          metrics, and reasoning. Exportable to CSV / PDF. */}
      <div className="mt-12">
        <TrainerHistory
          history={stats?.history ?? []}
          onClear={handleClearHistory}
        />
      </div>
    </div>
  );
}
