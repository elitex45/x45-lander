import type { ModeMeta } from "../lib/modes";
import type { TimerStatus } from "../lib/types";
import styles from "../pomodoro.module.css";

type Props = {
  mode: ModeMeta;
  status: TimerStatus;
  secondsLeft: number;
  totalSeconds: number;
};

export function TimerCircle({
  mode,
  status,
  secondsLeft,
  totalSeconds,
}: Props) {
  const radius = 45;
  const circumference = radius * 2 * Math.PI;
  const progress = totalSeconds > 0
    ? Math.min(1, Math.max(0, secondsLeft / totalSeconds))
    : 0;
  const dashOffset = circumference * (1 - progress);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className={styles.timerWrap}>
      <svg
        className={styles.timerSvg}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle className={styles.timerTrack} cx="50" cy="50" r={radius} />
        <circle
          className={styles.timerProgress}
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className={styles.timerContent}>
        <span className={styles.timerMode}>{mode.label}</span>
        <time
          className={styles.timerTime}
          role="timer"
          dateTime={`PT${secondsLeft}S`}
          aria-label={`${minutes} minutes ${seconds} seconds remaining`}
        >
          {display}
        </time>
        <span className={styles.timerState}>
          {status === "running"
            ? "In progress"
            : status === "paused"
              ? "Paused"
              : mode.description}
        </span>
      </div>
    </div>
  );
}
