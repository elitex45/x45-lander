import { NextResponse } from "next/server";
import { redis } from "../../../lib/temp-mail";

export const runtime = "nodejs";

/** Is Redis reachable? Reports names and shapes only, never values. */
export async function GET() {
  const names = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
  const env = Object.fromEntries(
    names.map((n) => {
      const v = process.env[n];
      return [n, v ? { length: v.length, quoted: /^["']/.test(v), https: v.startsWith("https://") } : null];
    })
  );
  let ping: string;
  try {
    ping = String(await redis().ping());
  } catch (e) {
    ping = "error: " + (e instanceof Error ? e.message : String(e)).slice(0, 300);
  }
  return NextResponse.json({ env, ping }, { headers: { "cache-control": "no-store" } });
}
