// Runs on every mail sent to *@x45.in (Cloudflare Email Routing catch-all).
// If the name was claimed on x45.in/projects/temp-mail, the mail is stored
// in Upstash Redis until the address expires. Otherwise the mail is rejected
// at the door, so nobody can fill the store with junk for unclaimed names.
import PostalMime from "postal-mime";
import { Redis } from "@upstash/redis/cloudflare";

// Keep in sync with app/lib/temp-mail.ts
const NAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;
const MAX_MAILS = 30;
const MAX_TEXT = 60_000;
const MAX_HTML = 250_000;
// Abuse caps. A box takes at most this many mails in its life,
// the whole service at most this many an hour, and huge mails bounce.
const MAX_MAILS_PER_BOX = 60;
const MAX_MAILS_PER_HOUR = 3000;
const MAX_RAW_BYTES = 2_000_000;

const cut = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

export default {
  async email(message, env) {
    const to = String(message.to || "").toLowerCase();
    const name = to.split("@")[0];
    if (!NAME_RE.test(name) || name.includes("..")) {
      message.setReject("No such mailbox");
      return;
    }

    if (message.rawSize > MAX_RAW_BYTES) {
      message.setReject("Message too large");
      return;
    }

    const redis = new Redis({ url: env.UPSTASH_URL, token: env.UPSTASH_TOKEN });
    const ttl = await redis.ttl(`box:${name}`);
    if (ttl <= 0) {
      message.setReject("No such mailbox");
      return;
    }

    const hour = Math.floor(Date.now() / 3_600_000);
    const all = await redis.incr(`rl:mail:all:${hour}`);
    if (all === 1) await redis.expire(`rl:mail:all:${hour}`, 3600);
    if (all > MAX_MAILS_PER_HOUR) {
      message.setReject("Service busy, try again later");
      return;
    }
    const count = await redis.incr(`mails:${name}`);
    if (count === 1) await redis.expire(`mails:${name}`, ttl);
    if (count > MAX_MAILS_PER_BOX) {
      message.setReject("Mailbox full");
      return;
    }

    const parsed = await PostalMime.parse(message.raw);
    const mail = {
      id: crypto.randomUUID(),
      from: parsed.from?.address || message.from || "",
      fromName: parsed.from?.name || "",
      subject: cut(parsed.subject, 300) || "(no subject)",
      text: cut(parsed.text, MAX_TEXT),
      html: cut(parsed.html, MAX_HTML),
      receivedAt: Date.now(),
      attachments: (parsed.attachments || []).slice(0, 10).map((a) => ({
        name: a.filename || "file",
        size: a.content?.byteLength ?? 0,
      })),
    };

    // Count arrivals in PostHog. Same public key as the site. Never blocks.
    try {
      await fetch("https://us.i.posthog.com/i/v0/e/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: "phc_zLbeDYeAvWxpKwHAG9J7mBxrDkV7Kr8HvKDS7B3RorQF",
          event: "temp_mail_delivered",
          distinct_id: "worker",
          properties: { has_html: !!mail.html, attachments: mail.attachments.length, $process_person_profile: false },
        }),
      });
    } catch {}

    const key = `inbox:${name}`;
    await redis.lpush(key, JSON.stringify(mail));
    await redis.ltrim(key, 0, MAX_MAILS - 1);
    await redis.expire(key, ttl);
  },
};
