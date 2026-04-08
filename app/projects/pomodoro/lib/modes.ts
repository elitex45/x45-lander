// Mode metadata: duration, label, color, glow.
//
// Each mode binds to a CSS variable from the site's theme so the colors
// flip with the dark/light toggle. Focus uses --accent (orange in light,
// neon green in dark), short break uses --cyan, long break uses --purple.
// This keeps the page coherent with the rest of /projects.

import type { Mode } from "./types";

export type ModeMeta = {
  id: Mode;
  label: string;
  short: string; // "25", "05", "15" — shown next to label in mode buttons
  durationSec: number;
  color: string; // CSS expression — e.g. "var(--accent)"
  glow: string; // CSS expression for the drop shadow on the timer ring
  description: string;
};

export const MODES: Record<Mode, ModeMeta> = {
  focus: {
    id: "focus",
    label: "Focus",
    short: "25",
    durationSec: 25 * 60,
    color: "var(--accent)",
    glow: "var(--accent-glow)",
    description: "Deep work — no interruptions",
  },
  short: {
    id: "short",
    label: "Short Break",
    short: "05",
    durationSec: 5 * 60,
    color: "var(--cyan)",
    glow: "rgba(6, 182, 212, 0.35)",
    description: "Stretch, water, quick walk",
  },
  long: {
    id: "long",
    label: "Long Break",
    short: "15",
    durationSec: 15 * 60,
    color: "var(--purple)",
    glow: "rgba(168, 85, 247, 0.35)",
    description: "Step away — eat, walk, breathe",
  },
};

export const MODE_LIST: ModeMeta[] = [MODES.focus, MODES.short, MODES.long];
