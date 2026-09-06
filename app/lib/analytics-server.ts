import { createHash } from "node:crypto";
import { PostHog } from "posthog-node";

// Server-side PostHog for API routes. Browser events live in analytics.ts.
// Same public project key as the client; see instrumentation-client.ts.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_zLbeDYeAvWxpKwHAG9J7mBxrDkV7Kr8HvKDS7B3RorQF";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: PostHog | null = null;
function ph() {
  if (!client) client = new PostHog(KEY, { host: HOST, flushAt: 1, flushInterval: 0 });
  return client;
}

/** Stable, non-reversible id for an IP so people are counted, not stored. */
export function anonId(ip: string) {
  return "ip_" + createHash("sha256").update("x45:" + ip).digest("hex").slice(0, 24);
}

/** "browser" for the web page, "agent" for curl, scripts and AI agents. */
export function callerKind(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  const fromPage = req.headers.get("sec-fetch-mode") === "cors" || req.headers.get("sec-fetch-site") === "same-origin";
  return fromPage && /Mozilla/.test(ua) ? "browser" : "agent";
}

type Props = Record<string, string | number | boolean | null | undefined>;

/** Fire and forget; never slows a response or throws. */
export function trackServer(req: Request, ip: string, event: string, props?: Props) {
  try {
    const p = ph();
    p.capture({
      distinctId: anonId(ip),
      event,
      properties: { caller: callerKind(req), ...props, $process_person_profile: false },
    });
    void p.flush().catch(() => {});
  } catch {
    /* analytics must never break the API */
  }
}
