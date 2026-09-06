// One small door to PostHog. Components call `track`, never posthog directly,
// so the site keeps working if analytics is off or blocked.
import posthog from "posthog-js";

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props?: Props) {
  try {
    if (!posthog.__loaded) return;
    posthog.capture(event, props);
  } catch {
    /* never throw from analytics */
  }
}
