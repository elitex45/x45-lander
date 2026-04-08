// Bell sound generated via the Web Audio API. Zero asset bytes — three
// quick sine pings with an exponential gain envelope so they sound like
// a small chime instead of a flat tone.
//
// Browser autoplay policy: AudioContext must be created/unsuspended
// inside a user gesture. Call `warmAudio()` from a click handler before
// you ever expect a `playBell()` to fire.

let audioCtx: AudioContext | null = null;

interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const w = window as WindowWithWebkit;
  const AC = window.AudioContext || w.webkitAudioContext;
  if (!AC) return null;
  try {
    audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

// Call this from a user-gesture handler (e.g. clicking Start) so the
// AudioContext is unlocked before the timer ever expires.
export function warmAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function playBell() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  // Three ping pattern: high, high, even higher (rising end gives the
  // "complete" feeling instead of a flat doorbell).
  const tones: { freq: number; start: number }[] = [
    { freq: 880, start: 0 }, // A5
    { freq: 880, start: 0.42 }, // A5
    { freq: 1318.5, start: 0.84 }, // E6
  ];

  for (const { freq, start } of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);

    // Quick attack, exponential decay — sounds like a chime not a buzzer
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.28, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.45);

    osc.start(now + start);
    osc.stop(now + start + 0.5);
  }
}
