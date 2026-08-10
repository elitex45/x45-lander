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
  description: string;
};

export const MODES: Record<Mode, ModeMeta> = {
  focus: {
    id: "focus",
    label: "Focus",
    description: "One thing at a time",
  },
  short: {
    id: "short",
    label: "Short Break",
    description: "Stand up, stretch, get water",
  },
  long: {
    id: "long",
    label: "Long Break",
    description: "Step away and properly reset",
  },
};

export const MODE_LIST: ModeMeta[] = [MODES.focus, MODES.short, MODES.long];
