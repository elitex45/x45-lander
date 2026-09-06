import { NextResponse } from "next/server";
import { BOX_TTL, LIMITS, MAIL_DOMAIN, MAX_MAILS } from "../../lib/temp-mail";

/** Machine-readable usage. Agents can start here. */
export function GET() {
  const base = "https://www.x45.in/api/temp-mail";
  return NextResponse.json(
    {
      service: "x45 temp mail",
      domain: MAIL_DOMAIN,
      docs: "https://www.x45.in/projects/temp-mail/api",
      lifetime_seconds: BOX_TTL,
      max_mails_per_inbox: MAX_MAILS,
      limits: LIMITS,
      steps: [
        `POST ${base}/claim  body {"name":"alex"}  -> {name,address,token,expiresAt}`,
        `GET  ${base}/wait?name=alex&token=…&since=0&timeout=25  -> waits up to 25s for a new mail`,
        `GET  ${base}/inbox?name=alex&token=…  -> {expiresAt, mails[]} newest first`,
        `POST ${base}/release  body {"name":"alex","token":"…"}  -> delete early`,
      ],
      mail_shape: { id: "uuid", from: "address", fromName: "string", subject: "string", text: "string", html: "string", receivedAt: "ms epoch", attachments: [{ name: "string", size: "bytes" }] },
      notes: [
        "Names: 1-30 chars, a-z 0-9 . _ -, must start and end with a letter or digit. Sent lowercase.",
        "A name is yours for 10 minutes, then it and every mail are deleted and anyone may claim it again.",
        "The token is the only key to the inbox. Keep it.",
        "Attachments are not stored. Only their names and sizes.",
        "Be polite: one wait call at a time per inbox. Hammering gets a 429.",
      ],
    },
    { headers: { "cache-control": "public, max-age=300" } }
  );
}
