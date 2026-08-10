"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { ModeButtons } from "./components/ModeButtons";
import { SettingsPanel } from "./components/SettingsPanel";
import { TimerCircle } from "./components/TimerCircle";
import { TodoList } from "./components/TodoList";
import { MODES } from "./lib/modes";
import { playBell, warmAudio } from "./lib/sound";
import {
  initialPomodoroState,
  pomodoroReducer,
  storedState,
} from "./lib/state";
import { durationSeconds, emptyState, load, save } from "./lib/storage";
import type { Mode, Palette, PomodoroSettings } from "./lib/types";
import styles from "./pomodoro.module.css";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, summary, [contenteditable="true"]'
    )
  );
}

export function PomodoroApp() {
  const [state, dispatch] = useReducer(
    pomodoroReducer,
    emptyState(),
    initialPomodoroState
  );
  const lastSoundCount = useRef(0);

  useEffect(() => {
    const now = Date.now();
    dispatch({
      type: "hydrate",
      state: load(now),
      now,
      nextSessionId: createId(),
    });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    save(storedState(state));
  }, [state]);

  useEffect(() => {
    if (state.status !== "running") return;
    const tick = () =>
      dispatch({ type: "tick", now: Date.now(), nextSessionId: createId() });
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [state.status]);

  useEffect(() => {
    const checkDay = () => dispatch({ type: "day-check", now: Date.now() });
    const interval = window.setInterval(checkDay, 60_000);
    document.addEventListener("visibilitychange", checkDay);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkDay);
    };
  }, []);

  useEffect(() => {
    if (state.completionCount <= lastSoundCount.current) return;
    lastSoundCount.current = state.completionCount;
    if (state.settings.sound) playBell();
  }, [state.completionCount, state.settings.sound]);

  useEffect(() => {
    if (state.status === "running") {
      const minutes = Math.floor(state.secondsLeft / 60);
      const seconds = state.secondsLeft % 60;
      document.title = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} — ${MODES[state.mode].label}`;
    } else if (
      state.message.startsWith("Focus complete") ||
      state.message.startsWith("Break complete")
    ) {
      document.title = `✓ ${state.message.split(".")[0]} — Pomodoro`;
    } else {
      document.title = "Pomodoro — elitex45";
    }
    return () => {
      document.title = "Pomodoro — elitex45";
    };
  }, [state.message, state.mode, state.secondsLeft, state.status]);

  const primaryAction = useCallback(() => {
    const now = Date.now();
    if (state.status === "running") {
      dispatch({ type: "pause", now, nextSessionId: createId() });
      return;
    }
    warmAudio();
    dispatch({ type: "start", now, sessionId: createId() });
  }, [state.status]);

  const reset = useCallback(() => {
    dispatch({ type: "reset", now: Date.now() });
  }, []);

  const skip = useCallback(() => {
    dispatch({ type: "skip", now: Date.now() });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        primaryAction();
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        reset();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [primaryAction, reset, skip]);

  const activeTask = useMemo(
    () =>
      state.todos.find(
        (todo) => todo.id === state.activeTaskId && !todo.done
      ) ?? null,
    [state.activeTaskId, state.todos]
  );
  const sessionTask = useMemo(
    () =>
      state.sessionTaskId
        ? state.todos.find((todo) => todo.id === state.sessionTaskId) ?? null
        : null,
    [state.sessionTaskId, state.todos]
  );
  const workingOn =
    state.status === "idle"
      ? activeTask?.text ?? "No task selected"
      : state.sessionTaskId
        ? sessionTask?.text ?? "Original task removed"
        : "No task selected";

  const totalSeconds = durationSeconds(state.mode, state.settings);
  const primaryLabel =
    state.status === "running"
      ? "Pause"
      : state.status === "paused"
        ? "Resume"
        : state.mode === "focus"
          ? "Start focus"
          : "Start break";

  const switchMode = (mode: Mode) => {
    dispatch({ type: "switch-mode", mode, now: Date.now() });
  };

  const updateSettings = (settings: PomodoroSettings) => {
    dispatch({ type: "update-settings", settings, now: Date.now() });
  };

  const updatePalette = (palette: Palette) => {
    dispatch({ type: "update-palette", palette, now: Date.now() });
  };

  const testSound = () => {
    warmAudio();
    playBell();
    dispatch({ type: "announce", message: "Sound preview played." });
  };

  return (
    <div
      className={styles.app}
      data-mode={state.mode}
      data-palette={state.settings.palette}
    >
      <div className={styles.workspace}>
        <section className={styles.timerPanel} aria-label="Focus timer">
          <ModeButtons
            active={state.mode}
            settings={state.settings}
            onChange={switchMode}
          />

          <TimerCircle
            mode={MODES[state.mode]}
            status={state.status}
            secondsLeft={state.secondsLeft}
            totalSeconds={totalSeconds}
          />

          <p className={styles.workingOn}>
            <span>Working on</span>
            <strong>{workingOn}</strong>
          </p>

          <div className={styles.timerControls}>
            <button
              type="button"
              className={styles.primaryControl}
              onClick={primaryAction}
            >
              {primaryLabel}
            </button>
            <button type="button" onClick={reset}>Reset</button>
            <button type="button" onClick={skip}>Skip</button>
          </div>

          <div className={styles.stats}>
            <div>
              <strong>{state.completedToday}</strong>
              <span>Completed today</span>
            </div>
            <div>
              <strong>
                {state.focusesInCycle} of {state.settings.longBreakInterval}
              </strong>
              <span>Until long break</span>
            </div>
          </div>

          <p className={styles.statusMessage}>{state.message}</p>
          <p className={styles.liveRegion} aria-live="polite" aria-atomic="true">
            {state.message}
          </p>

          <div className={styles.shortcutHints} aria-label="Keyboard shortcuts">
            <span><kbd>Space</kbd> start / pause</span>
            <span><kbd>R</kbd> reset</span>
            <span><kbd>S</kbd> skip</span>
          </div>

          <SettingsPanel
            key={`${state.settings.focusMinutes}-${state.settings.shortMinutes}-${state.settings.longMinutes}-${state.settings.longBreakInterval}-${state.settings.autoStartBreaks}-${state.settings.autoStartFocus}-${state.settings.sound}`}
            settings={state.settings}
            status={state.status}
            onSave={updateSettings}
            onPaletteChange={updatePalette}
            onTestSound={testSound}
          />
        </section>

        <TodoList
          todos={state.todos}
          activeTaskId={state.activeTaskId}
          onAdd={(text) =>
            dispatch({ type: "add-task", id: createId(), text, now: Date.now() })
          }
          onToggle={(id) =>
            dispatch({ type: "toggle-task", id, now: Date.now() })
          }
          onSetActive={(id) =>
            dispatch({ type: "set-active-task", id, now: Date.now() })
          }
          onDelete={(id) =>
            dispatch({ type: "delete-task", id, now: Date.now() })
          }
        />
      </div>
    </div>
  );
}
