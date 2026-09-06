import { NextResponse } from "next/server";
import {
  boxKey,
  clientIp,
  inboxKey,
  liveKey,
  nameProblem,
  normalizeName,
  redis,
  type Box,
} from "../../../lib/temp-mail";

export const runtime = "nodejs";

/** Throw an address away early. Frees the caller's live-address slot. */
export async function POST(req: Request) {
  let body: { name?: unknown; token?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const name = normalizeName(typeof body.name === "string" ? body.name : "");
  const token = typeof body.token === "string" ? body.token : "";
  if (nameProblem(name) || !/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const r = redis();
  const box = await r.get<Box>(boxKey(name));
  // Wrong token: say nothing useful, change nothing.
  if (box && box.token === token) {
    await r.del(boxKey(name), inboxKey(name));
    await r.zrem(liveKey(clientIp(req)), name);
  }
  return NextResponse.json({ ok: true });
}
