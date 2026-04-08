"use client";

import type { ModeMeta } from "../lib/modes";

type Props = {
  mode: ModeMeta;
  secondsLeft: number;
  totalSeconds: number;
};

// Big circular progress timer. Two stacked SVG circles — a static track
// and an animated foreground that drains as time passes. The foreground
// stroke + the centered text both pick up the active mode's color so the
// whole component flips its accent color when the mode changes.
export function TimerCircle({ mode, secondsLeft, totalSeconds }: Props) {
  const radius = 130;
  const stroke = 8;
  const circumference = radius * 2 * Math.PI;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = circumference * (1 - progress);

  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  const display = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  // Reserve 6px on each side for the soft drop-shadow / glow so it
  // doesn't get clipped at the SVG viewBox edges.
  const padding = 12;
  const size = (radius + stroke / 2 + padding) * 2;
  const center = size / 2;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={mode.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition:
              "stroke-dashoffset 0.5s linear, stroke 0.5s ease",
            filter: `drop-shadow(0 0 14px ${mode.glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
          {mode.label}
        </div>
        <div
          className="text-[64px] leading-none font-bold tabular-nums"
          style={{ color: mode.color, transition: "color 0.5s ease" }}
        >
          {display}
        </div>
        <div className="text-[10px] font-mono text-[var(--muted)] mt-3 opacity-70">
          {mode.description}
        </div>
      </div>
    </div>
  );
}
