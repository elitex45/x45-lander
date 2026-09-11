"use client";

import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CopyIcon,
  KeyIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useCallback, useEffect, useState } from "react";
import { track } from "../../lib/analytics";

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*-_=+?",
} as const;

type SetKey = keyof typeof SETS;

const CHOICES: { key: SetKey; label: string; sample: string }[] = [
  { key: "lower", label: "Letters", sample: "abc" },
  { key: "upper", label: "Capitals", sample: "ABC" },
  { key: "digits", label: "Numbers", sample: "123" },
  { key: "symbols", label: "Symbols", sample: "!@#" },
];

/** Characters people mix up when they have to retype a password. */
const LOOKALIKES = /[Il1O0]/g;

export const MIN_LEN = 6;
export const MAX_LEN = 64;

/**
 * Random bytes with the biased tail thrown away, so every character in the
 * pool is equally likely. Math.random is not good enough for a password.
 */
function draw(pool: string, count: number) {
  const out: string[] = [];
  const cutoff = 256 - (256 % pool.length);
  const buf = new Uint8Array(Math.max(16, count * 2));
  while (out.length < count) {
    crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (byte >= cutoff) continue;
      out.push(pool[byte % pool.length]);
      if (out.length === count) break;
    }
  }
  return out;
}

function shuffle(chars: string[]) {
  const rand = new Uint32Array(chars.length);
  crypto.getRandomValues(rand);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

export interface PasswordState {
  value: string;
  length: number;
  picked: Record<SetKey, boolean>;
  avoidLookalikes: boolean;
  poolSize: number;
  setLength: (n: number) => void;
  toggle: (key: SetKey) => void;
  setAvoidLookalikes: (on: boolean) => void;
  regenerate: () => void;
}

type Picked = Record<SetKey, boolean>;

/** Every chosen kind is represented at least once, then the whole lot is shuffled. */
function build(length: number, picked: Picked, avoidLookalikes: boolean) {
  const parts = CHOICES.filter((c) => picked[c.key]).map((c) =>
    avoidLookalikes ? SETS[c.key].replace(LOOKALIKES, "") : SETS[c.key],
  );
  if (parts.length === 0) return "";
  const pool = parts.join("");
  const seeded = parts.slice(0, Math.min(parts.length, length)).map((p) => draw(p, 1)[0]);
  const rest = draw(pool, Math.max(0, length - seeded.length));
  return shuffle([...seeded, ...rest]).join("");
}

function poolSizeOf(picked: Picked, avoidLookalikes: boolean) {
  return CHOICES.filter((c) => picked[c.key]).reduce(
    (n, c) => n + (avoidLookalikes ? SETS[c.key].replace(LOOKALIKES, "").length : SETS[c.key].length),
    0,
  );
}

/**
 * Lives in the parent so the password survives claiming an address, which swaps
 * the page between two different layouts. Every control makes its own new
 * password rather than an effect watching for changes.
 */
export function usePasswordGenerator(): PasswordState {
  const [length, setLen] = useState(16);
  const [picked, setPicked] = useState<Picked>({
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
  });
  const [avoidLookalikes, setAvoid] = useState(false);
  const [value, setValue] = useState("");

  // The first one, once this is running in a browser with a real random source.
  // Generating during render would put a different password in the prerendered
  // HTML than the one the browser makes, which React would flag as a mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(build(16, { lower: true, upper: true, digits: true, symbols: true }, false));
  }, []);

  const setLength = useCallback(
    (n: number) => {
      setLen(n);
      setValue(build(n, picked, avoidLookalikes));
    },
    [picked, avoidLookalikes],
  );

  const toggle = useCallback(
    (key: SetKey) => {
      // Never switch off the last kind; there would be nothing to pick from.
      if (picked[key] && CHOICES.filter((c) => picked[c.key]).length === 1) return;
      const next = { ...picked, [key]: !picked[key] };
      setPicked(next);
      setValue(build(length, next, avoidLookalikes));
    },
    [picked, length, avoidLookalikes],
  );

  const setAvoidLookalikes = useCallback(
    (on: boolean) => {
      setAvoid(on);
      setValue(build(length, picked, on));
    },
    [length, picked],
  );

  const regenerate = useCallback(() => {
    setValue(build(length, picked, avoidLookalikes));
  }, [length, picked, avoidLookalikes]);

  return {
    value,
    length,
    picked,
    avoidLookalikes,
    poolSize: poolSizeOf(picked, avoidLookalikes),
    setLength,
    toggle,
    setAvoidLookalikes,
    regenerate,
  };
}

function strength(length: number, poolSize: number) {
  const bits = poolSize > 1 ? Math.round(length * Math.log2(poolSize)) : 0;
  if (bits < 45) return { bits, word: "Weak", fill: 0.25 };
  if (bits < 65) return { bits, word: "Okay", fill: 0.5 };
  if (bits < 90) return { bits, word: "Strong", fill: 0.78 };
  return { bits, word: "Very strong", fill: 1 };
}

/** Guesses a second for an attacker with good hardware and a weak hash on the far end. */
const GUESS_RATE = 1e11;

function human(n: number, unit: string) {
  const v = Math.max(1, Math.round(n));
  return `${v.toLocaleString()} ${unit}${v === 1 ? "" : "s"}`;
}

/**
 * Every phrase is written to finish the sentence "would need ...".
 * The maths is done in logs because the number of guesses runs past what a
 * double can hold long before the passwords get interesting.
 */
function crackTime(length: number, poolSize: number) {
  if (poolSize < 2 || length < 1) return "no time at all";
  // Halved, because on average the guess lands halfway through the list.
  const logSeconds = length * Math.log10(poolSize) - Math.log10(2 * GUESS_RATE);
  if (logSeconds < 0) return "less than a second";
  const seconds = 10 ** logSeconds;
  if (seconds < 60) return human(seconds, "second");
  if (seconds < 3600) return human(seconds / 60, "minute");
  if (seconds < 86400) return human(seconds / 3600, "hour");
  if (seconds < 2629746) return human(seconds / 86400, "day");
  if (seconds < 31556952) return human(seconds / 2629746, "month");
  const years = seconds / 31556952;
  if (years < 1e3) return human(years, "year");
  if (years < 1e6) return `${Math.round(years / 1e3).toLocaleString()} thousand years`;
  if (years < 1e9) return `${Math.round(years / 1e6).toLocaleString()} million years`;
  if (years < 1e12) return `${Math.round(years / 1e9).toLocaleString()} billion years`;
  return "longer than the universe has existed";
}

export function PasswordBox(pw: PasswordState) {
  const [copied, setCopied] = useState(false);
  const score = strength(pw.length, pw.poolSize);
  const crack = crackTime(pw.length, pw.poolSize);
  const onlyOne = CHOICES.filter((c) => pw.picked[c.key]).length === 1;

  const copy = async () => {
    if (!pw.value) return;
    try {
      await navigator.clipboard.writeText(pw.value);
      setCopied(true);
      track("temp_mail_password_copied", { length: pw.length });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* it is selectable anyway */
    }
  };

  return (
    <div className="glass-card flex flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
          <KeyIcon size={13} aria-hidden="true" />
          Password
        </p>
        <button
          type="button"
          onClick={() => {
            pw.regenerate();
            track("temp_mail_password_generated", { length: pw.length, pool: pw.poolSize });
          }}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
        >
          <ArrowsClockwiseIcon size={14} aria-hidden="true" />
          New one
        </button>
      </div>

      <p
        className="mt-2 min-h-[2.5rem] select-all break-all font-mono text-[17px] leading-snug"
        data-ph-mask
        aria-live="polite"
      >
        {pw.value || " "}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--accent-dim)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${score.fill * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
          {score.word} · {score.bits} bits
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]" aria-live="polite">
        A computer guessing 100 billion a second would need{" "}
        <span className="text-[var(--fg)]">{crack}</span> to break it.
      </p>

      <button
        type="button"
        onClick={copy}
        className="btn-glass mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm"
      >
        {copied ? <CheckIcon size={15} weight="bold" /> : <CopyIcon size={15} />}
        {copied ? "Copied" : "Copy password"}
      </button>

      <label
        htmlFor="pw-len"
        className="mt-5 flex items-center justify-between text-xs text-[var(--muted)]"
      >
        Length
        <span className="font-mono tabular-nums text-[var(--fg)]">{pw.length}</span>
      </label>
      <input
        id="pw-len"
        type="range"
        min={MIN_LEN}
        max={MAX_LEN}
        value={pw.length}
        onChange={(e) => pw.setLength(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent)]"
      />

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {CHOICES.map((c) => (
          <label
            key={c.key}
            className={`flex items-center gap-2 text-xs ${
              pw.picked[c.key] && onlyOne ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
            title={pw.picked[c.key] && onlyOne ? "Keep at least one kind." : undefined}
          >
            <input
              type="checkbox"
              checked={pw.picked[c.key]}
              disabled={pw.picked[c.key] && onlyOne}
              onChange={() => pw.toggle(c.key)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            {c.label}
            <span className="font-mono text-[10px] text-[var(--muted)]">{c.sample}</span>
          </label>
        ))}
      </div>

      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={pw.avoidLookalikes}
          onChange={(e) => pw.setAvoidLookalikes(e.target.checked)}
          className="h-3.5 w-3.5 accent-[var(--accent)]"
        />
        No look-alikes
        <span className="font-mono text-[10px] text-[var(--muted)]">I l 1 O 0</span>
      </label>

      <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        Made in your browser and never sent anywhere. It is not saved either, so
        copy it before you close the tab.
      </p>
    </div>
  );
}
