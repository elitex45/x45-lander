// Shared rules for the temp mail tool. The Cloudflare Worker in
// workers/temp-mail mirrors NAME_RE and RESERVED; keep them in sync.
import { Redis } from "@upstash/redis";

export const MAIL_DOMAIN = "x45.in";
/** Seconds an address lives. */
export const BOX_TTL = 600;
export const MAX_MAILS = 30;

export const NAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;
export const RESERVED = new Set([
  "admin", "administrator", "root", "postmaster", "hostmaster", "webmaster",
  "abuse", "security", "noreply", "no-reply", "support", "help", "info",
  "contact", "hello", "hi", "mail", "email", "team", "billing", "sales",
  "elitex45", "elite", "x45", "owner", "dev", "test",
]);

export function normalizeName(raw: string) {
  return raw.trim().toLowerCase();
}

export function nameProblem(name: string): string | null {
  if (!NAME_RE.test(name)) return "Use 2 to 30 letters, numbers, dots or dashes.";
  if (name.includes("..")) return "No double dots.";
  if (RESERVED.has(name)) return "That one is taken for good.";
  return null;
}

export interface Box {
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface Mail {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: number;
  attachments: { name: string; size: number }[];
}

export const boxKey = (name: string) => `box:${name}`;
export const inboxKey = (name: string) => `inbox:${name}`;

let client: Redis | null = null;
export function redis() {
  if (!client) client = Redis.fromEnv();
  return client;
}

// ---- Abuse limits -------------------------------------------------------

/** Best guess at the caller's IP. Vercel sets x-forwarded-for; first hop is the client. */
export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/** Live-address set per IP: name → expiresAt. Lets us cap concurrent boxes. */
export const liveKey = (ip: string) => `live:${ip}`;

/**
 * Count one hit on a fixed window. True when the caller is over the limit.
 * Key gets its TTL on the first hit, so the window resets on its own.
 */
export async function overLimit(
  r: ReturnType<typeof redis>,
  key: string,
  limit: number,
  windowSec: number
) {
  const hits = await r.incr(key);
  if (hits === 1) await r.expire(key, windowSec);
  return hits > limit;
}

export const LIMITS = {
  claimPerMinute: 5,
  claimPerHour: 30,
  liveBoxesPerIp: 3,
  claimGlobalPerHour: 1000,
  inboxReadsPerMinute: 90,
} as const;
