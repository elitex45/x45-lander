"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TimerCircle } from "./components/TimerCircle";
import { ModeButtons } from "./components/ModeButtons";
import { TodoList } from "./components/TodoList";
import { MODES } from "./lib/modes";
import { load, save } from "./lib/storage";
import { playBell, warmAudio } from "./lib/sound";
import type { Mode, Todo } from "./lib/types";

// How many focus sessions before a long break (vs a short one).
const POMODOROS_PER_LONG_BREAK = 4;

export default function PomodoroPage() {
  // ───── timer state ─────
  // The timer counts down by deadline rather than by accumulated ticks,
  // so it stays accurate even when the tab is throttled in the background.
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(MODES.focus.durationSec);
  // True for ~5s after a session ends — drives the title flash.
  const [flashing, setFlashing] = useState(false);

  // ───── todo + stats state ─────
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [completedToday, setCompletedToday] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // ───── hydrate from localStorage ─────
  useEffect(() => {
    const stored = load();
    setTodos(stored.todos);
    setActiveTaskId(stored.activeTaskId);
    setCompletedToday(stored.completedToday);
    setHydrated(true);
  }, []);

  // ───── persist on change ─────
  useEffect(() => {
    if (!hydrated) return;
    save({ todos, activeTaskId, completedToday });
  }, [todos, activeTaskId, completedToday, hydrated]);

  // ───── tick loop ─────
  // Recomputes secondsLeft from the deadline every 250ms while running.
  // The 250ms cadence keeps the rendered display in lockstep with wall
  // time without burning CPU.
  useEffect(() => {
    if (!running || endsAt === null) return;

    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);

      if (left === 0) {
        setRunning(false);
        setEndsAt(null);
        playBell();
        setFlashing(true);
        window.setTimeout(() => setFlashing(false), 5000);

        // If a focus session just completed, increment counters and
        // auto-switch to the next break (don't auto-start it — the user
        // explicitly clicks Start to begin each session).
        if (mode === "focus") {
          const nextCount = completedToday + 1;
          setCompletedToday(nextCount);
          if (activeTaskId) {
            setTodos((prev) =>
              prev.map((t) =>
                t.id === activeTaskId
                  ? { ...t, pomodoros: t.pomodoros + 1 }
                  : t
              )
            );
          }
          const nextMode: Mode =
            nextCount % POMODOROS_PER_LONG_BREAK === 0 ? "long" : "short";
          setMode(nextMode);
          setSecondsLeft(MODES[nextMode].durationSec);
        } else {
          // Break ended — switch back to focus
          setMode("focus");
          setSecondsLeft(MODES.focus.durationSec);
        }
      }
    };

    tick(); // run immediately so the display catches up after a tab thaw
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, endsAt, mode, activeTaskId, completedToday]);

  // ───── tab title ─────
  // Three states: flashing (just-completed), running (countdown), idle.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (flashing) {
      document.title = "✓ Time's up — Pomodoro";
      return;
    }
    if (running) {
      const min = Math.floor(secondsLeft / 60);
      const sec = secondsLeft % 60;
      document.title = `${String(min).padStart(2, "0")}:${String(sec).padStart(
        2,
        "0"
      )} — ${MODES[mode].label}`;
      return;
    }
    document.title = "Pomodoro — Guru";
  }, [running, secondsLeft, mode, flashing]);

  // ───── controls ─────
  const start = useCallback(() => {
    if (running) return;
    if (secondsLeft === 0) {
      // Don't start a zero-length session — reset to mode duration first.
      setSecondsLeft(MODES[mode].durationSec);
      setEndsAt(Date.now() + MODES[mode].durationSec * 1000);
    } else {
      setEndsAt(Date.now() + secondsLeft * 1000);
    }
    setRunning(true);
    // Warm the AudioContext while we're inside a real user gesture so
    // the bell will fire reliably when the timer ends later.
    warmAudio();
  }, [running, secondsLeft, mode]);

  const pause = useCallback(() => {
    setRunning(false);
    setEndsAt(null);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setEndsAt(null);
    setSecondsLeft(MODES[mode].durationSec);
  }, [mode]);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setRunning(false);
    setEndsAt(null);
    setSecondsLeft(MODES[m].durationSec);
  }, []);

  // ───── todo actions ─────
  const addTodo = useCallback((text: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTodos((prev) => [
      {
        id,
        text,
        done: false,
        pomodoros: 0,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  const setActiveTask = useCallback((id: string) => {
    // Click an already-active task to clear it
    setActiveTaskId((cur) => (cur === id ? null : id));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setActiveTaskId((cur) => (cur === id ? null : cur));
  }, []);

  const activeTask = useMemo(
    () => todos.find((t) => t.id === activeTaskId) ?? null,
    [todos, activeTaskId]
  );

  const currentMode = MODES[mode];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
      <header className="mb-8 mt-2">
        <p className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase mb-2">
          &gt; ./projects/pomodoro
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fg)]">
          Pomodoro
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
          25 minutes of focus. 5 minute break. Repeat. Pick a task, start
          the timer, do the thing.
        </p>
      </header>

      <div className="flex flex-col items-center gap-7">
        {/* Mode selector */}
        <ModeButtons active={mode} onChange={switchMode} />

        {/* Active task badge */}
        <div className="h-5 flex items-center">
          {activeTask ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--muted)] font-mono uppercase tracking-widest text-[10px]">
                working on
              </span>
              <span className="text-[var(--fg)] font-medium">
                {activeTask.text}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest opacity-60">
              no active task — pick one below
            </span>
          )}
        </div>

        {/* Big timer circle */}
        <TimerCircle
          mode={currentMode}
          secondsLeft={secondsLeft}
          totalSeconds={currentMode.durationSec}
        />

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!running ? (
            <button
              type="button"
              onClick={start}
              className="px-6 py-3 rounded-md text-xs font-mono uppercase tracking-widest border transition-all"
              style={{
                color: currentMode.color,
                borderColor: currentMode.color,
                backgroundColor: `color-mix(in srgb, ${currentMode.color} 10%, transparent)`,
                boxShadow: `0 0 20px -8px ${currentMode.glow}`,
              }}
            >
              start ▶
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              className="px-6 py-3 rounded-md text-xs font-mono uppercase tracking-widest border border-[var(--muted)] text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
            >
              pause ⏸
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-md text-xs font-mono uppercase tracking-widest border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors"
          >
            reset ↺
          </button>
        </div>

        {/* Daily counter */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest">
          <span>today</span>
          <span className="text-[var(--accent)] font-bold tabular-nums text-sm">
            {completedToday}
          </span>
          <span>{completedToday === 1 ? "pomodoro" : "pomodoros"} done</span>
        </div>
      </div>

      {/* Todo list */}
      <div className="mt-12">
        <TodoList
          todos={todos}
          activeTaskId={activeTaskId}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onSetActive={setActiveTask}
          onDelete={deleteTodo}
        />
      </div>
    </div>
  );
}
