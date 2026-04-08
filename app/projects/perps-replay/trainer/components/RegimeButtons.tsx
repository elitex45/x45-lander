"use client";

import { REGIMES, REGIME_META, type Regime } from "../../lib/regime";

type Props = {
  // null = no answer yet (quiz mode)
  // a Regime value = answer locked, paint correct/wrong feedback
  selected: Regime | null;
  groundTruth: Regime | null;
  disabled: boolean;
  onPick: (regime: Regime) => void;
};

// Five-button picker for regime labels.
//
// Three visual states per button:
//   - default        : muted text, subtle border
//   - selected       : tinted with regime color while waiting
//   - revealed       : after answer, the correct one glows green and
//                      the user's wrong pick (if any) glows red
export function RegimeButtons({
  selected,
  groundTruth,
  disabled,
  onPick,
}: Props) {
  const revealed = groundTruth !== null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
      {REGIMES.map((r) => {
        const meta = REGIME_META[r];
        const isSelected = r === selected;
        const isCorrect = revealed && r === groundTruth;
        const isWrongPick = revealed && isSelected && r !== groundTruth;

        let borderColor = "var(--border)";
        let textColor = "var(--muted)";
        let bgColor = "transparent";
        let glow = "none";

        if (isCorrect) {
          borderColor = "#22c55e";
          textColor = "#22c55e";
          bgColor = "rgba(34, 197, 94, 0.10)";
          glow = "0 0 20px -6px rgba(34, 197, 94, 0.5)";
        } else if (isWrongPick) {
          borderColor = "#ef4444";
          textColor = "#ef4444";
          bgColor = "rgba(239, 68, 68, 0.10)";
          glow = "0 0 20px -6px rgba(239, 68, 68, 0.5)";
        } else if (isSelected) {
          borderColor = meta.color;
          textColor = meta.color;
          bgColor = `color-mix(in srgb, ${meta.color} 12%, transparent)`;
        } else if (!revealed) {
          // Hover treatment via CSS — color picks up the regime color on hover
        }

        return (
          <button
            key={r}
            type="button"
            onClick={() => onPick(r)}
            disabled={disabled}
            className="px-3 py-3 rounded-md border text-[10px] font-mono uppercase tracking-widest transition-all disabled:cursor-not-allowed flex flex-col items-center gap-1"
            style={{
              borderColor,
              color: textColor,
              backgroundColor: bgColor,
              boxShadow: glow,
            }}
            title={meta.description}
          >
            <span className="text-base">{meta.short}</span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
