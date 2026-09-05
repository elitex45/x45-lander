"use client";

import { LampIcon } from "@phosphor-icons/react/dist/ssr";
import { useTheme } from "../lib/theme";

/**
 * The desk lamp. Dark mode is the lamp on; light mode is daylight.
 * Renders identically on server and client (no mounted flag) because the
 * visible label is driven by the `.dark` class through CSS, not by state.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="group inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:scale-[0.97]"
      aria-label="Toggle the desk lamp (light or dark theme)"
    >
      <LampIcon
        size={15}
        weight="regular"
        className="text-[var(--muted)] transition-colors group-hover:text-[var(--accent)] dark:text-[var(--accent)]"
        aria-hidden="true"
      />
      <span className="font-mono dark:hidden">lamp off</span>
      <span className="hidden font-mono dark:inline">lamp on</span>
    </button>
  );
}
