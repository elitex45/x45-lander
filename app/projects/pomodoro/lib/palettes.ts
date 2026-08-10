import type { Palette } from "./types";

export type PaletteMeta = {
  id: Palette;
  label: string;
  swatches: readonly [string, string, string];
};

export const PALETTES: readonly PaletteMeta[] = [
  {
    id: "friendly",
    label: "Friendly",
    swatches: ["#B45309", "#0F766E", "#4F46E5"],
  },
  {
    id: "ocean",
    label: "Ocean",
    swatches: ["#1D4ED8", "#0E7490", "#7C3AED"],
  },
  {
    id: "garden",
    label: "Garden",
    swatches: ["#3F6212", "#047857", "#A16207"],
  },
  {
    id: "sunset",
    label: "Sunset",
    swatches: ["#BE123C", "#C2410C", "#7E22CE"],
  },
];

export function isPalette(value: unknown): value is Palette {
  return PALETTES.some((palette) => palette.id === value);
}
