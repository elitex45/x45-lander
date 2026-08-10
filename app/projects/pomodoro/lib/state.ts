import { durationSeconds, localDateKey } from "./storage";
import type { StoredState } from "./storage";
import type { Mode, Palette, PomodoroSettings } from "./types";
import { isPalette } from "./palettes";

export type PomodoroState = StoredState & {
  hydrated: boolean;
  message: string;
  completionCount: number;
};

export type PomodoroAction =
  | { type: "hydrate"; state: StoredState; now: number; nextSessionId: string }
  | { type: "tick"; now: number; nextSessionId: string }
  | { type: "start"; now: number; sessionId: string }
  | { type: "pause"; now: number; nextSessionId: string }
  | { type: "reset"; now: number }
  | { type: "skip"; now: number }
  | { type: "switch-mode"; mode: Mode; now: number }
  | { type: "add-task"; id: string; text: string; now: number }
  | { type: "toggle-task"; id: string; now: number }
  | { type: "set-active-task"; id: string; now: number }
  | { type: "delete-task"; id: string; now: number }
  | { type: "update-settings"; settings: PomodoroSettings; now: number }
  | { type: "update-palette"; palette: Palette; now: number }
  | { type: "day-check"; now: number }
  | { type: "announce"; message: string };

function withLocalDay(state: PomodoroState, now: number): PomodoroState {
  const today = localDateKey(now);
  if (state.statsDate === today) return state;
  return { ...state, statsDate: today, completedToday: 0 };
}

function isOpenTask(state: PomodoroState, id: string | null) {
  return Boolean(id && state.todos.some((todo) => todo.id === id && !todo.done));
}

function beginMode(
  state: PomodoroState,
  mode: Mode,
  now: number,
  sessionId: string,
  running: boolean
): PomodoroState {
  const secondsLeft = durationSeconds(mode, state.settings);
  return {
    ...state,
    mode,
    status: running ? "running" : "idle",
    secondsLeft,
    endsAt: running ? now + secondsLeft * 1000 : null,
    sessionId: running ? sessionId : null,
    sessionTaskId:
      running && mode === "focus" && isOpenTask(state, state.activeTaskId)
        ? state.activeTaskId
        : null,
  };
}

function completeSession(
  input: PomodoroState,
  now: number,
  nextSessionId: string
): PomodoroState {
  let state = withLocalDay(input, now);
  const completedId = state.sessionId;
  if (!completedId || state.lastCompletedSessionId === completedId) {
    return {
      ...state,
      status: "idle",
      endsAt: null,
      sessionId: null,
      sessionTaskId: null,
    };
  }

  const completedMode = state.mode;
  const completedTaskId = state.sessionTaskId;
  state = {
    ...state,
    lastCompletedSessionId: completedId,
    completionCount: state.completionCount + 1,
  };

  if (completedMode === "focus") {
    const nextCompletedToday = state.completedToday + 1;
    const nextCycle =
      (state.focusesInCycle + 1) % state.settings.longBreakInterval;
    const nextMode: Mode = nextCycle === 0 ? "long" : "short";
    const activeTaskId = isOpenTask(state, state.activeTaskId)
      ? state.activeTaskId
      : null;
    const todos = completedTaskId && state.todos.some((todo) => todo.id === completedTaskId)
      ? state.todos.map((todo) =>
          todo.id === completedTaskId
            ? { ...todo, pomodoros: todo.pomodoros + 1 }
            : todo
        )
      : state.todos;
    state = {
      ...state,
      todos,
      activeTaskId,
      completedToday: nextCompletedToday,
      focusesInCycle: nextCycle,
      message: `Focus complete. ${nextMode === "long" ? "Take a long break." : "Take a short break."}`,
    };
    return beginMode(
      state,
      nextMode,
      now,
      nextSessionId,
      state.settings.autoStartBreaks
    );
  }

  state = { ...state, message: "Break complete. Ready to focus." };
  return beginMode(
    state,
    "focus",
    now,
    nextSessionId,
    state.settings.autoStartFocus
  );
}

function clampSettings(settings: PomodoroSettings): PomodoroSettings {
  const integer = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(value)));
  return {
    palette: isPalette(settings.palette) ? settings.palette : "friendly",
    focusMinutes: integer(settings.focusMinutes, 1, 120),
    shortMinutes: integer(settings.shortMinutes, 1, 30),
    longMinutes: integer(settings.longMinutes, 1, 60),
    longBreakInterval: integer(settings.longBreakInterval, 2, 8),
    autoStartBreaks: Boolean(settings.autoStartBreaks),
    autoStartFocus: Boolean(settings.autoStartFocus),
    sound: Boolean(settings.sound),
  };
}

export function initialPomodoroState(state: StoredState): PomodoroState {
  return {
    ...state,
    hydrated: false,
    message: "Ready when you are.",
    completionCount: 0,
  };
}

export function pomodoroReducer(
  current: PomodoroState,
  action: PomodoroAction
): PomodoroState {
  if (action.type === "hydrate") {
    let state: PomodoroState = {
      ...action.state,
      hydrated: true,
      message: "Ready when you are.",
      completionCount: 0,
    };
    if (state.status === "running" && state.endsAt !== null) {
      if (action.now >= state.endsAt) {
        return completeSession(state, action.now, action.nextSessionId);
      }
      state = {
        ...state,
        secondsLeft: Math.min(
          durationSeconds(state.mode, state.settings),
          Math.ceil((state.endsAt - action.now) / 1000)
        ),
        message: "Timer restored.",
      };
    }
    return withLocalDay(state, action.now);
  }

  if (action.type === "announce") {
    return { ...current, message: action.message };
  }

  const state = withLocalDay(current, action.now);

  switch (action.type) {
    case "tick": {
      if (state.status !== "running" || state.endsAt === null) return state;
      if (action.now >= state.endsAt) {
        return completeSession(state, action.now, action.nextSessionId);
      }
      const secondsLeft = Math.min(
        durationSeconds(state.mode, state.settings),
        Math.ceil((state.endsAt - action.now) / 1000)
      );
      return secondsLeft === state.secondsLeft
        ? state
        : { ...state, secondsLeft };
    }
    case "start": {
      if (state.status === "running") return state;
      const secondsLeft =
        state.status === "paused" && state.secondsLeft > 0
          ? state.secondsLeft
          : durationSeconds(state.mode, state.settings);
      return {
        ...state,
        status: "running",
        secondsLeft,
        endsAt: action.now + secondsLeft * 1000,
        sessionId:
          state.status === "paused" && state.sessionId
            ? state.sessionId
            : action.sessionId,
        sessionTaskId:
          state.status === "paused"
            ? state.sessionTaskId
            : state.mode === "focus" && isOpenTask(state, state.activeTaskId)
              ? state.activeTaskId
              : null,
        message: state.status === "paused" ? "Timer resumed." : `${state.mode === "focus" ? "Focus" : "Break"} started.`,
      };
    }
    case "pause": {
      if (state.status !== "running" || state.endsAt === null) return state;
      if (action.now >= state.endsAt) {
        return completeSession(state, action.now, action.nextSessionId);
      }
      return {
        ...state,
        status: "paused",
        secondsLeft: Math.min(
          durationSeconds(state.mode, state.settings),
          Math.ceil((state.endsAt - action.now) / 1000)
        ),
        endsAt: null,
        message: "Timer paused.",
      };
    }
    case "reset":
      return {
        ...state,
        status: "idle",
        secondsLeft: durationSeconds(state.mode, state.settings),
        endsAt: null,
        sessionId: null,
        sessionTaskId: null,
        message: "Timer reset.",
      };
    case "skip": {
      const nextMode: Mode = state.mode === "focus" ? "short" : "focus";
      return {
        ...beginMode(state, nextMode, action.now, "", false),
        message:
          state.mode === "focus"
            ? "Focus skipped. No session was counted."
            : "Break skipped. Ready to focus.",
      };
    }
    case "switch-mode":
      return {
        ...beginMode(state, action.mode, action.now, "", false),
        message: `${action.mode === "focus" ? "Focus" : action.mode === "short" ? "Short break" : "Long break"} selected.`,
      };
    case "add-task":
      return {
        ...state,
        todos: [
          {
            id: action.id,
            text: action.text,
            done: false,
            pomodoros: 0,
            createdAt: action.now,
          },
          ...state.todos,
        ],
        message: "Task added.",
      };
    case "toggle-task": {
      let becameDone = false;
      const todos = state.todos.map((todo) => {
        if (todo.id !== action.id) return todo;
        becameDone = !todo.done;
        return { ...todo, done: !todo.done };
      });
      return {
        ...state,
        todos,
        activeTaskId:
          becameDone && state.activeTaskId === action.id
            ? null
            : state.activeTaskId,
        message: becameDone ? "Task completed." : "Task reopened.",
      };
    }
    case "set-active-task": {
      const valid = state.todos.some(
        (todo) => todo.id === action.id && !todo.done
      );
      if (!valid) return state;
      const clearing = state.activeTaskId === action.id;
      return {
        ...state,
        activeTaskId: clearing ? null : action.id,
        message: clearing ? "Current task cleared." : "Current task updated.",
      };
    }
    case "delete-task":
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.id),
        activeTaskId:
          state.activeTaskId === action.id ? null : state.activeTaskId,
        sessionTaskId:
          state.sessionTaskId === action.id ? null : state.sessionTaskId,
        message: "Task deleted.",
      };
    case "update-settings": {
      const settings = clampSettings(action.settings);
      const focusesInCycle =
        state.focusesInCycle % settings.longBreakInterval;
      return {
        ...state,
        settings,
        focusesInCycle,
        secondsLeft:
          state.status === "idle"
            ? durationSeconds(state.mode, settings)
            : state.secondsLeft,
        message: "Settings saved.",
      };
    }
    case "update-palette":
      return {
        ...state,
        settings: {
          ...state.settings,
          palette: isPalette(action.palette) ? action.palette : "friendly",
        },
        message: "Color palette updated.",
      };
    case "day-check":
      return state;
  }
}

export function storedState(state: PomodoroState): StoredState {
  return {
    mode: state.mode,
    status: state.status,
    secondsLeft: state.secondsLeft,
    endsAt: state.endsAt,
    sessionId: state.sessionId,
    sessionTaskId: state.sessionTaskId,
    lastCompletedSessionId: state.lastCompletedSessionId,
    todos: state.todos,
    activeTaskId: state.activeTaskId,
    completedToday: state.completedToday,
    statsDate: state.statsDate,
    focusesInCycle: state.focusesInCycle,
    settings: state.settings,
  };
}
