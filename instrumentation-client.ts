// Runs once in the browser, before React hydrates. Sets up PostHog.
// Traffic goes through /ingest on this domain (see next.config.ts) so
// ad blockers and Brave Shields do not drop it.
import posthog from "posthog-js";

// The project key is public by design (it ships to every browser), so it
// lives here as a fallback. The env var, when set, still wins.
const FALLBACK_KEY = "phc_zLbeDYeAvWxpKwHAG9J7mBxrDkV7Kr8HvKDS7B3RorQF";
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || FALLBACK_KEY;

if (key) {
  try {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(".i.posthog.com", ".posthog.com") ?? "https://us.posthog.com",
      defaults: "2026-08-30",
      // Pageviews on load and on every client-side route change.
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      capture_dead_clicks: true,
      capture_exceptions: true,
      capture_performance: true,
      enable_heatmaps: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      },
      // Remember returning visitors without cookies.
      persistence: "localStorage",
      person_profiles: "identified_only",
      debug: process.env.NODE_ENV === "development",
    });
  } catch {
    /* analytics must never break the page */
  }
}
