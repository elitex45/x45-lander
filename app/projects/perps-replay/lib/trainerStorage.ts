// localStorage persistence for the regime trainer.
//
// Persists running stats: total rounds, correct rounds, per-regime
// breakdown (so the user can see "I keep mistaking transition for trend"),
// last 20 results for a "recent accuracy" trend, AND a per-round history
// log so the user can review past attempts and export them.

import type { Classification, Regime } from "./regime";
import { REGIMES } from "./regime";
import type { Kline } from "./kline";
import type { Interval } from "./symbols";

const KEY = "x45.regime-trainer.v1";

export type PerRegime = { seen: number; correct: number };

// One completed round, persisted so the user can scroll back through
// their training history. Stores the bars themselves so the chart can be
// re-rendered (or exported) later without re-fetching from Binance.
export type HistoryEntry = {
  id: string;
  timestamp: number;
  symbol: string;
  interval: Interval;
  windowBars: Kline[]; // 60 bars the user labeled
  futureBars: Kline[]; // 30 bars revealed after answering
  userAnswer: Regime;
  classification: Classification;
  correct: boolean;
};

export type TrainerStats = {
  v: 1;
  totalRounds: number;
  correctRounds: number;
  byRegime: Record<Regime, PerRegime>;
  recentResults: boolean[]; // last 20, oldest first
  history: HistoryEntry[]; // newest first, capped at HISTORY_LIMIT
};

const RECENT_LIMIT = 20;
// Capped to stay safely under localStorage's ~5 MB ceiling.
// ~14 KB per entry × 100 = ~1.4 MB worst case.
const HISTORY_LIMIT = 100;

function emptyByRegime(): Record<Regime, PerRegime> {
  return Object.fromEntries(
    REGIMES.map((r) => [r, { seen: 0, correct: 0 }])
  ) as Record<Regime, PerRegime>;
}

export function emptyStats(): TrainerStats {
  return {
    v: 1,
    totalRounds: 0,
    correctRounds: 0,
    byRegime: emptyByRegime(),
    recentResults: [],
    history: [],
  };
}

export function load(): TrainerStats {
  if (typeof window === "undefined") return emptyStats();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as TrainerStats;
    if (parsed.v !== 1) return emptyStats();
    // Defensive: ensure every regime key exists in case the taxonomy
    // grew since this user's stats were saved.
    const byRegime = emptyByRegime();
    for (const r of REGIMES) {
      byRegime[r] = parsed.byRegime?.[r] ?? { seen: 0, correct: 0 };
    }
    return {
      v: 1,
      totalRounds: parsed.totalRounds ?? 0,
      correctRounds: parsed.correctRounds ?? 0,
      byRegime,
      recentResults: parsed.recentResults ?? [],
      history: parsed.history ?? [],
    };
  } catch {
    return emptyStats();
  }
}

export function save(stats: TrainerStats) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Quota exceeded or storage disabled. If quota, the user has too
    // much history — drop the oldest half and try again.
    try {
      const trimmed: TrainerStats = {
        ...stats,
        history: stats.history.slice(0, Math.floor(HISTORY_LIMIT / 2)),
      };
      window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* give up silently */
    }
  }
}

// Pure update — apply a round result and return the new stats.
// Includes both the stats bump AND the history entry append.
export function recordRound(
  prev: TrainerStats,
  groundTruth: Regime,
  userAnswer: Regime,
  roundData: Omit<HistoryEntry, "id" | "timestamp" | "correct" | "userAnswer">
): TrainerStats {
  const correct = groundTruth === userAnswer;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const entry: HistoryEntry = {
    id,
    timestamp: Date.now(),
    userAnswer,
    correct,
    ...roundData,
  };

  const next: TrainerStats = {
    v: 1,
    totalRounds: prev.totalRounds + 1,
    correctRounds: prev.correctRounds + (correct ? 1 : 0),
    byRegime: { ...prev.byRegime },
    recentResults: [...prev.recentResults, correct].slice(-RECENT_LIMIT),
    history: [entry, ...prev.history].slice(0, HISTORY_LIMIT),
  };
  next.byRegime[groundTruth] = {
    seen: prev.byRegime[groundTruth].seen + 1,
    correct: prev.byRegime[groundTruth].correct + (correct ? 1 : 0),
  };
  return next;
}

// Clear ONLY the history, keep the running stats.
export function clearHistory(prev: TrainerStats): TrainerStats {
  return { ...prev, history: [] };
}

export function reset() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
