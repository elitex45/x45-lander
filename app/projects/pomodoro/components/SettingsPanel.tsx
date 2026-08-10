import { FormEvent, useRef, useState } from "react";
import { PALETTES } from "../lib/palettes";
import type { Palette, PomodoroSettings, TimerStatus } from "../lib/types";
import styles from "../pomodoro.module.css";

type Props = {
  settings: PomodoroSettings;
  status: TimerStatus;
  onSave: (settings: PomodoroSettings) => void;
  onPaletteChange: (palette: Palette) => void;
  onTestSound: () => void;
};

export function SettingsPanel({
  settings,
  status,
  onSave,
  onPaletteChange,
  onTestSound,
}: Props) {
  const [draft, setDraft] = useState(settings);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const locked = status !== "idle";

  const close = () => {
    const details = detailsRef.current;
    if (!details) return;
    details.open = false;
    details.querySelector<HTMLElement>("summary")?.focus();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked) return;
    onSave({ ...draft, palette: settings.palette });
    close();
  };

  const numberField = (
    key: "focusMinutes" | "shortMinutes" | "longMinutes" | "longBreakInterval",
    label: string,
    min: number,
    max: number,
    suffix: string
  ) => (
    <label className={styles.numberSetting}>
      <span>{label}</span>
      <span>
        <input
          type="number"
          min={min}
          max={max}
          required
          disabled={locked}
          value={draft[key]}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              [key]: Number(event.target.value),
            }))
          }
        />
        <small>{suffix}</small>
      </span>
    </label>
  );

  return (
    <details
      ref={detailsRef}
      className={styles.settingsPanel}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
    >
      <summary>Settings</summary>
      <form onSubmit={submit}>
        <div className={styles.settingsOverlayHeader}>
          <h3>Settings</h3>
          <button type="button" onClick={close} aria-label="Close settings">
            Close
          </button>
        </div>
        <fieldset className={styles.palettePicker}>
          <legend>Color palette</legend>
          <div>
            {PALETTES.map((palette) => {
              const selected = settings.palette === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPaletteChange(palette.id)}
                >
                  <span className={styles.paletteSwatches} aria-hidden="true">
                    {palette.swatches.map((color) => (
                      <i key={color} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <span>{palette.label}</span>
                  <span className={styles.paletteCheck} aria-hidden="true">
                    {selected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {locked && (
          <p className={styles.settingsNote}>Reset the timer to change durations.</p>
        )}
        <div className={styles.settingsGrid}>
          {numberField("focusMinutes", "Focus", 1, 120, "min")}
          {numberField("shortMinutes", "Short break", 1, 30, "min")}
          {numberField("longMinutes", "Long break", 1, 60, "min")}
          {numberField("longBreakInterval", "Long break after", 2, 8, "focuses")}
        </div>

        <label className={styles.toggleSetting}>
          <input
            type="checkbox"
            disabled={locked}
            checked={draft.autoStartBreaks}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                autoStartBreaks: event.target.checked,
              }))
            }
          />
          <span>Automatically start breaks</span>
        </label>
        <label className={styles.toggleSetting}>
          <input
            type="checkbox"
            disabled={locked}
            checked={draft.autoStartFocus}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                autoStartFocus: event.target.checked,
              }))
            }
          />
          <span>Automatically start focus after breaks</span>
        </label>
        <label className={styles.toggleSetting}>
          <input
            type="checkbox"
            disabled={locked}
            checked={draft.sound}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                sound: event.target.checked,
              }))
            }
          />
          <span>Play a sound when time is up</span>
        </label>

        <div className={styles.settingsActions}>
          <button type="button" onClick={onTestSound}>Test sound</button>
          <button type="submit" className={styles.saveSettings} disabled={locked}>
            Save settings
          </button>
        </div>
      </form>
    </details>
  );
}
