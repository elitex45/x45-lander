import { MODE_LIST } from "../lib/modes";
import { durationSeconds } from "../lib/storage";
import type { Mode, PomodoroSettings } from "../lib/types";
import styles from "../pomodoro.module.css";

type Props = {
  active: Mode;
  settings: PomodoroSettings;
  onChange: (mode: Mode) => void;
};

export function ModeButtons({ active, settings, onChange }: Props) {
  return (
    <div className={styles.modes} aria-label="Timer mode">
      {MODE_LIST.map((mode) => {
        const isActive = mode.id === active;
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(mode.id)}
            className={styles.modeButton}
          >
            <span>{mode.label}</span>
            <span className={styles.modeDuration}>
              {durationSeconds(mode.id, settings) / 60}m
            </span>
          </button>
        );
      })}
    </div>
  );
}
