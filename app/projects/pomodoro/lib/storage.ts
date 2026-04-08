// localStorage persistence for pomodoro state.
//
// We persist todos, the active task id, and the daily completed-pomodoro
// counter. We do NOT persist the running timer — refreshing the page
// resets the active session, which is intentional (a half-finished
// pomodoro is hard to resume meaningfully).

import type { Todo } from "./types";

const KEY = "x45.pomodoro.v1";

type Persisted = {
  v: 1;
  todos: Todo[];
  activeTaskId: string | null;
  completedToday: number;
  // ISO date (YYYY-MM-DD) the counter belongs to. Used to auto-reset
  // the daily counter when the user comes back the next day.
  lastSessionDate: string;
};

export type LoadedState = {
  todos: Todo[];
  activeTaskId: string | null;
  completedToday: number;
};

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export function save(state: LoadedState) {
  if (typeof window === "undefined") return;
  try {
    const payload: Persisted = {
      v: 1,
      ...state,
      lastSessionDate: todayISO(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / disabled */
  }
}

export function load(): LoadedState {
  const empty: LoadedState = {
    todos: [],
    activeTaskId: null,
    completedToday: 0,
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed.v !== 1) return empty;
    // Reset the daily counter if we've crossed a date boundary.
    const today = todayISO();
    const completedToday =
      parsed.lastSessionDate === today ? parsed.completedToday : 0;
    return {
      todos: parsed.todos ?? [],
      activeTaskId: parsed.activeTaskId ?? null,
      completedToday,
    };
  } catch {
    return empty;
  }
}
