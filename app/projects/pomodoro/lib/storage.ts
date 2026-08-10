import type {
  Mode,
  PomodoroSettings,
  TimerStatus,
  Todo,
} from "./types";
import { isPalette } from "./palettes";

const KEY = "x45.pomodoro.v2";
const LEGACY_KEY = "x45.pomodoro.v1";

export const DEFAULT_SETTINGS: PomodoroSettings = {
  palette: "friendly",
  focusMinutes: 25,
  shortMinutes: 5,
  longMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  sound: true,
};

export type StoredState = {
  mode: Mode;
  status: TimerStatus;
  secondsLeft: number;
  endsAt: number | null;
  sessionId: string | null;
  sessionTaskId: string | null;
  lastCompletedSessionId: string | null;
  todos: Todo[];
  activeTaskId: string | null;
  completedToday: number;
  statsDate: string;
  focusesInCycle: number;
  settings: PomodoroSettings;
};

type PersistedV2 = StoredState & { v: 2 };

export function localDateKey(now = Date.now()): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function durationSeconds(
  mode: Mode,
  settings: PomodoroSettings
): number {
  const minutes =
    mode === "focus"
      ? settings.focusMinutes
      : mode === "short"
        ? settings.shortMinutes
        : settings.longMinutes;
  return minutes * 60;
}

function finiteInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

function parseSettings(value: unknown): PomodoroSettings {
  const input =
    value && typeof value === "object"
      ? (value as Partial<PomodoroSettings>)
      : {};
  return {
    palette: isPalette(input.palette) ? input.palette : "friendly",
    focusMinutes: finiteInteger(input.focusMinutes, 25, 1, 120),
    shortMinutes: finiteInteger(input.shortMinutes, 5, 1, 30),
    longMinutes: finiteInteger(input.longMinutes, 15, 1, 60),
    longBreakInterval: finiteInteger(input.longBreakInterval, 4, 2, 8),
    autoStartBreaks:
      typeof input.autoStartBreaks === "boolean" ? input.autoStartBreaks : false,
    autoStartFocus:
      typeof input.autoStartFocus === "boolean" ? input.autoStartFocus : false,
    sound: typeof input.sound === "boolean" ? input.sound : true,
  };
}

function parseTodos(value: unknown): Todo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const todo = item as Partial<Todo>;
    if (typeof todo.id !== "string" || typeof todo.text !== "string") return [];
    const text = todo.text.trim();
    if (!text) return [];
    return [
      {
        id: todo.id,
        text,
        done: Boolean(todo.done),
        pomodoros: finiteInteger(todo.pomodoros, 0, 0, 9999),
        createdAt: finiteInteger(
          todo.createdAt,
          Date.now(),
          0,
          Number.MAX_SAFE_INTEGER
        ),
      },
    ];
  });
}

function isMode(value: unknown): value is Mode {
  return value === "focus" || value === "short" || value === "long";
}

function isStatus(value: unknown): value is TimerStatus {
  return value === "idle" || value === "running" || value === "paused";
}

export function emptyState(now = Date.now()): StoredState {
  return {
    mode: "focus",
    status: "idle",
    secondsLeft: durationSeconds("focus", DEFAULT_SETTINGS),
    endsAt: null,
    sessionId: null,
    sessionTaskId: null,
    lastCompletedSessionId: null,
    todos: [],
    activeTaskId: null,
    completedToday: 0,
    statsDate: localDateKey(now),
    focusesInCycle: 0,
    settings: DEFAULT_SETTINGS,
  };
}

function parseV2(value: unknown, now: number): StoredState | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<PersistedV2>;
  if (input.v !== 2) return null;

  const settings = parseSettings(input.settings);
  const mode = isMode(input.mode) ? input.mode : "focus";
  const status = isStatus(input.status) ? input.status : "idle";
  const todos = parseTodos(input.todos);
  const activeTaskId =
    typeof input.activeTaskId === "string" &&
    todos.some((todo) => todo.id === input.activeTaskId && !todo.done)
      ? input.activeTaskId
      : null;
  const maxDuration = durationSeconds(mode, settings);
  const secondsLeft = finiteInteger(input.secondsLeft, maxDuration, 0, maxDuration);
  const validRunning =
    status === "running" &&
    typeof input.endsAt === "number" &&
    Number.isFinite(input.endsAt) &&
    typeof input.sessionId === "string";
  const validPaused = status === "paused" && typeof input.sessionId === "string";
  const sessionTaskId =
    typeof input.sessionTaskId === "string" &&
    todos.some((todo) => todo.id === input.sessionTaskId)
      ? input.sessionTaskId
      : null;
  const today = localDateKey(now);

  return {
    mode,
    status: validRunning ? "running" : validPaused ? "paused" : "idle",
    secondsLeft,
    endsAt: validRunning ? (input.endsAt as number) : null,
    sessionId: validRunning || validPaused ? input.sessionId as string : null,
    sessionTaskId:
      validRunning || validPaused ? sessionTaskId : null,
    lastCompletedSessionId:
      typeof input.lastCompletedSessionId === "string"
        ? input.lastCompletedSessionId
        : null,
    todos,
    activeTaskId,
    completedToday:
      input.statsDate === today
        ? finiteInteger(input.completedToday, 0, 0, 9999)
        : 0,
    statsDate: today,
    focusesInCycle:
      finiteInteger(input.focusesInCycle, 0, 0, 9999) %
      settings.longBreakInterval,
    settings,
  };
}

function loadLegacy(now: number): StoredState | null {
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  const input = JSON.parse(raw) as Record<string, unknown>;
  if (input.v !== 1) return null;
  const state = emptyState(now);
  state.todos = parseTodos(input.todos);
  state.activeTaskId =
    typeof input.activeTaskId === "string" &&
    state.todos.some((todo) => todo.id === input.activeTaskId && !todo.done)
      ? input.activeTaskId
      : null;
  state.completedToday =
    input.lastSessionDate === localDateKey(now)
      ? finiteInteger(input.completedToday, 0, 0, 9999)
      : 0;
  state.focusesInCycle =
    state.completedToday % state.settings.longBreakInterval;
  return state;
}

export function load(now = Date.now()): StoredState {
  const empty = emptyState(now);
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return parseV2(JSON.parse(raw), now) ?? empty;
    return loadLegacy(now) ?? empty;
  } catch {
    return empty;
  }
}

export function save(state: StoredState) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedV2 = { v: 2, ...state };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Persistence is optional when storage is disabled or full.
  }
}
