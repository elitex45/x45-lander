import { NextResponse } from "next/server";
import {
  LIMITS,
  MAX_MAILS,
  boxKey,
  clientIp,
  inboxKey,
  nameProblem,
  normalizeName,
  overLimit,
  redis,
  type Box,
  type Mail,
} from "../../../lib/temp-mail";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_WAIT = 50; // seconds; stays under the function limit
const STEP_MS = 2000;

/**
 * Long poll. Holds the request until a mail newer than `since` arrives,
 * or `timeout` seconds pass. Built for scripts and agents, so they can
 * make one call instead of a loop.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = normalizeName(url.searchParams.get("name") ?? "");
  const token = url.searchParams.get("token") ?? "";
  const since = Number(url.searchParams.get("since") ?? 0) || 0;
  const timeout = Math.min(MAX_WAIT, Math.max(1, Number(url.searchParams.get("timeout") ?? 25) || 25));
  if (nameProblem(name) || !/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const r = redis();
  if (await overLimit(r, `rl:inbox:${clientIp(req)}`, LIMITS.inboxReadsPerMinute, 60)) {
    return NextResponse.json({ error: "Too many checks. Slow down." }, { status: 429 });
  }

  const deadline = Date.now() + timeout * 1000;
  for (;;) {
    const box = await r.get<Box>(boxKey(name));
    if (!box || box.token !== token) {
      return NextResponse.json({ error: "This address has expired." }, { status: 404 });
    }
    const all = await r.lrange<Mail>(inboxKey(name), 0, MAX_MAILS - 1);
    const fresh = all.filter((m) => m.receivedAt > since);
    if (fresh.length > 0 || Date.now() + STEP_MS > deadline) {
      return NextResponse.json(
        { expiresAt: box.expiresAt, timedOut: fresh.length === 0, mails: fresh },
        { headers: { "cache-control": "no-store" } }
      );
    }
    await new Promise((res) => setTimeout(res, STEP_MS));
  }
}
