"use client";

import { MODE_LIST } from "../lib/modes";
import type { Mode } from "../lib/types";

type Props = {
  active: Mode;
  onChange: (mode: Mode) => void;
};

// Compact mode picker. Active mode gets its own color as text + outline +
// a 10% tint background using color-mix so the highlight always matches
// the active mode regardless of theme.
export function ModeButtons({ active, onChange }: Props) {
  return (
    <div className="inline-flex p-1 rounded-lg border border-[var(--border)] bg-[var(--bg)]/40 backdrop-blur-sm">
      {MODE_LIST.map((m) => {
        const isActive = m.id === active;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className="px-4 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest transition-all"
            style={{
              color: isActive ? m.color : "var(--muted)",
              backgroundColor: isActive
                ? `color-mix(in srgb, ${m.color} 10%, transparent)`
                : "transparent",
              boxShadow: isActive ? `inset 0 0 0 1px ${m.color}` : "none",
            }}
          >
            {m.label}
            <span className="ml-2 opacity-50">{m.short}m</span>
          </button>
        );
      })}
    </div>
  );
}
