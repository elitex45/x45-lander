// One small door to PostHog. Components call `track`, never posthog directly,
// so the site keeps working if analytics is off, blocked, or not loaded yet.
// PostHog itself is loaded lazily by instrumentation-client.ts.
import type { PostHog } from "posthog-js";

declare global {
  interface Window {
    __posthog?: PostHog;
  }
}

type Props = Record<string, string | number | boolean | null | undefined>;

// Events fired before PostHog arrives wait here, then flush in order.
const queue: [string, Props | undefined][] = [];
let listening = false;

function flush() {
  const ph = window.__posthog;
  if (!ph) return;
  while (queue.length) {
    const [event, props] = queue.shift()!;
    ph.capture(event, props);
  }
}

export function track(event: string, props?: Props) {
  try {
    if (typeof window === "undefined") return;
    if (window.__posthog) {
      window.__posthog.capture(event, props);
      return;
    }
    if (queue.length < 50) queue.push([event, props]);
    if (!listening) {
      listening = true;
      window.addEventListener("posthog:ready", flush, { once: true });
    }
  } catch {
    /* never throw from analytics */
  }
}
