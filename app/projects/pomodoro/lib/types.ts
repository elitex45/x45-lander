export type Mode = "focus" | "short" | "long";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  // How many focus pomodoros have been completed while this task was active.
  // Useful as a "how much have I actually worked on this" signal.
  pomodoros: number;
  createdAt: number;
};
