// localStorage persistence for the readme viewer.
//
// We persist a single draft document so that refreshing the page or coming
// back later doesn't blow away the user's work. No multi-document support
// in v1 — keep it simple.

const KEY = "x45.readme-viewer.v1";

type Persisted = {
  v: 1;
  content: string;
  updatedAt: number;
};

export function save(content: string) {
  if (typeof window === "undefined") return;
  try {
    const payload: Persisted = { v: 1, content, updatedAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // quota / disabled — silently ignore
  }
}

export function load(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed.v !== 1) return null;
    return parsed.content;
  } catch {
    return null;
  }
}

export function clear() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
