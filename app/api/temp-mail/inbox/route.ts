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

/** Read an inbox. Needs the token handed out at claim time. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = normalizeName(url.searchParams.get("name") ?? "");
  const token = url.searchParams.get("token") ?? "";
  if (nameProblem(name) || !/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const r = redis();
  // The page polls every 3s; anything far beyond that is a script.
  if (await overLimit(r, `rl:inbox:${clientIp(req)}`, LIMITS.inboxReadsPerMinute, 60)) {
    return NextResponse.json({ error: "Too many checks. Slow down." }, { status: 429 });
  }
  const box = await r.get<Box>(boxKey(name));
  if (!box || box.token !== token) {
    return NextResponse.json({ error: "This address has expired." }, { status: 404 });
  }

  const raw = await r.lrange<Mail>(inboxKey(name), 0, MAX_MAILS - 1);
  return NextResponse.json(
    { expiresAt: box.expiresAt, mails: raw },
    { headers: { "cache-control": "no-store" } }
  );
}
