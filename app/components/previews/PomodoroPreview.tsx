"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const TOTAL = 25 * 60;
// Start mid-session so the ring is visibly partway around.
const START = TOTAL - (11 * 60 + 23);
const R = 62;
const CIRC = 2 * Math.PI * R;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** A real, ticking miniature of the focus timer. */
export function PomodoroPreview() {
  const reduce = useReducedMotion();
  const [left, setLeft] = useState(START);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setLeft((l) => (l <= 0 ? TOTAL : l - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [reduce]);

  const progress = 1 - left / TOTAL;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-8">
      <div
        className="flex gap-1 rounded-full border border-[var(--border)] p-1 text-[11px] font-medium"
        aria-hidden="true"
      >
        <span className="rounded-full bg-[var(--accent-dim)] px-3 py-1 text-[var(--accent)]">
          Focus
        </span>
        <span className="px-3 py-1 text-[var(--muted)]">Short</span>
        <span className="px-3 py-1 text-[var(--muted)]">Long</span>
      </div>

      <div className="relative">
        <svg
          width="176"
          height="176"
          viewBox="0 0 176 176"
          role="img"
          aria-label={`Focus timer, ${fmt(left)} remaining`}
        >
          <circle
            cx="88"
            cy="88"
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          <circle
            cx="88"
            cy="88"
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            transform="rotate(-90 88 88)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-[var(--fg)]">
            {fmt(left)}
          </span>
          <span className="mt-1 text-[11px] text-[var(--muted)]">
            one thing at a time
          </span>
        </div>
      </div>
    </div>
  );
}
