import { NextResponse } from "next/server";
import { trackServer } from "../../../lib/analytics-server";
import {
  BOX_TTL,
  LIMITS,
  MAIL_DOMAIN,
  boxKey,
  clientIp,
  liveKey,
  nameProblem,
  normalizeName,
  overLimit,
  redis,
  type Box,
} from "../../../lib/temp-mail";

export const runtime = "nodejs";

const tooMany = (error: string, status = 429) => NextResponse.json({ error }, { status });

/** Claim a name for 10 minutes. Returns a token that unlocks the inbox. */
export async function POST(req: Request) {
  let body: { name?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const name = normalizeName(typeof body.name === "string" ? body.name : "");
  const problem = nameProblem(name);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const r = redis();
  const ip = clientIp(req);
  const now = Date.now();

  // 1. Whole-site cap, so one bad hour cannot burn the free Redis tier.
  const hour = Math.floor(now / 3_600_000);
  if (await overLimit(r, `rl:claim:all:${hour}`, LIMITS.claimGlobalPerHour, 3600)) {
    trackServer(req, ip, "temp_mail_limited", { reason: "global" });
    return tooMany("The service is busy right now. Try again in a bit.", 503);
  }
  // 2. Per-IP burst and hourly caps.
  if (await overLimit(r, `rl:claim:m:${ip}`, LIMITS.claimPerMinute, 60)) {
    trackServer(req, ip, "temp_mail_limited", { reason: "minute" });
    return tooMany("Slow down. Five new addresses a minute is the limit.");
  }
  if (await overLimit(r, `rl:claim:h:${ip}`, LIMITS.claimPerHour, 3600)) {
    trackServer(req, ip, "temp_mail_limited", { reason: "hour" });
    return tooMany("That is enough addresses for one hour.");
  }
  // 3. At most a few live inboxes per IP at once. Expired ones fall out.
  const lk = liveKey(ip);
  await r.zremrangebyscore(lk, "-inf", now);
  const live = await r.zcard(lk);
  if (live >= LIMITS.liveBoxesPerIp) {
    trackServer(req, ip, "temp_mail_limited", { reason: "live" });
    return tooMany(
      `You already have ${LIMITS.liveBoxesPerIp} live addresses. Discard one or wait for it to expire.`
    );
  }

  const box: Box = {
    token: crypto.randomUUID().replace(/-/g, ""),
    createdAt: now,
    expiresAt: now + BOX_TTL * 1000,
  };
  const ok = await r.set(boxKey(name), box, { nx: true, ex: BOX_TTL });
  if (ok !== "OK") {
    return NextResponse.json({ error: "Someone has that name right now. Try another." }, { status: 409 });
  }
  await r.zadd(lk, { score: box.expiresAt, member: name });
  await r.expire(lk, BOX_TTL);
  trackServer(req, ip, "temp_mail_claimed");

  return NextResponse.json({
    name,
    address: `${name}@${MAIL_DOMAIN}`,
    token: box.token,
    expiresAt: box.expiresAt,
  });
}
