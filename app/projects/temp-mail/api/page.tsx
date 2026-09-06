import type { Metadata } from "next";
import Link from "next/link";
import { AGENT_PROMPT, CopyAgentPrompt } from "../CopyAgentPrompt";

export const metadata: Metadata = {
  title: "Temp mail API — elitex45",
  description: "Three HTTP calls to give a script or an AI agent a 10 minute inbox at x45.in.",
};

const BASE = "https://www.x45.in/api/temp-mail";

const STEPS: { title: string; body: string; code: string }[] = [
  {
    title: "1. Claim a name",
    body: "Any name, 1 to 30 characters. You get a token. The token is the only key to the inbox, so keep it.",
    code: `curl -X POST ${BASE}/claim \\
  -H 'content-type: application/json' \\
  -d '{"name":"alex"}'

# {"name":"alex","address":"alex@x45.in","token":"…","expiresAt":1788677479133}`,
  },
  {
    title: "2. Wait for a mail",
    body: "One call holds up to 50 seconds and returns as soon as something arrives. Pass the receivedAt of the last mail you saw as since, so you only get new ones.",
    code: `curl "${BASE}/wait?name=alex&token=TOKEN&since=0&timeout=25"

# {"expiresAt":…,"timedOut":false,"mails":[{"id":"…","from":"noreply@github.com",
#   "fromName":"GitHub","subject":"Your code is 482913","text":"…","html":"…",
#   "receivedAt":1788677001234,"attachments":[]}]}`,
  },
  {
    title: "3. Read everything, or throw it away",
    body: "The inbox call lists all mails, newest first. Release deletes the address early and frees your slot.",
    code: `curl "${BASE}/inbox?name=alex&token=TOKEN"

curl -X POST ${BASE}/release \\
  -H 'content-type: application/json' \\
  -d '{"name":"alex","token":"TOKEN"}'`,
  },
];

const RULES = [
  "Names: a-z, 0-9, dots, dashes, underscores. Starts and ends with a letter or digit. Lowercased.",
  "An address lives 10 minutes. Then it and every mail are deleted, and anyone can claim it again.",
  "Per IP: 5 claims a minute, 30 an hour, 3 live addresses at once. Inbox checks: 90 a minute.",
  "Each inbox keeps the last 30 mails. Attachments are not stored, only their names and sizes.",
  "Limits answer with 429. A vanished address answers with 404. Both carry an error message.",
  `Machine-readable version of this page: ${BASE}`,
];

export default function TempMailApiPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8 lg:pt-14">
      <header className="mb-10">
        <p className="font-mono text-xs text-[var(--muted)]">
          <Link href="/projects/temp-mail" className="hover:text-[var(--accent)]">
            Temp mail
          </Link>{" "}
          / API
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-tighter sm:text-4xl">
          An inbox for your scripts and agents.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--muted)]">
          Three plain HTTP calls. No key, no signup. Good for sign-up flows, verification codes and
          anything an AI agent needs a throwaway email for.
        </p>
      </header>

      <ol className="space-y-8">
        {STEPS.map((s) => (
          <li key={s.title}>
            <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">{s.body}</p>
            <pre className="glass-card mt-3 overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed">
              {s.code}
            </pre>
          </li>
        ))}
      </ol>

      <section className="mt-12 border-t border-[var(--border)] pt-6">
        <h2 className="text-lg font-semibold tracking-tight">Rules</h2>
        <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-[var(--muted)]">
          {RULES.map((r) => (
            <li key={r} className="flex gap-3">
              <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-[var(--border)] pt-6">
        <h2 className="text-lg font-semibold tracking-tight">Tell your agent</h2>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] leading-relaxed text-[var(--muted)]">
            Paste this into a prompt and most agents will figure out the rest.
          </p>
          <CopyAgentPrompt from="api" />
        </div>
        <pre className="glass-card mt-3 overflow-x-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-relaxed">
          {AGENT_PROMPT}
        </pre>
      </section>
    </div>
  );
}
