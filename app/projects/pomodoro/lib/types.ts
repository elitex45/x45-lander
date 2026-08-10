export type Mode = "focus" | "short" | "long";

export type TimerStatus = "idle" | "running" | "paused";
export type Palette = "friendly" | "ocean" | "garden" | "sunset";

export type PomodoroSettings = {
  palette: Palette;
  focusMinutes: number;
  shortMinutes: number;
  longMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  sound: boolean;
};

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  // How many focus pomodoros have been completed while this task was active.
  // Useful as a "how much have I actually worked on this" signal.
  pomodoros: number;
  createdAt: number;
};
