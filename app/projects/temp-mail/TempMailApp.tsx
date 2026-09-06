"use client";

import {
  ArrowClockwiseIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeSimpleIcon,
  PaperclipIcon,
  ShuffleIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "../../lib/analytics";
import { MAIL_DOMAIN, nameProblem, normalizeName, type Mail } from "../../lib/temp-mail";

interface Session {
  name: string;
  address: string;
  token: string;
  expiresAt: number;
}

const STORE = "temp-mail-session";
const POLL_MS = 3000;

const WORDS = [
  "maple", "otter", "pixel", "comet", "lumen", "fable", "quill", "delta",
  "ember", "birch", "nova", "sable", "tango", "vapor", "wren", "zinc",
];
function randomName() {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${w}${Math.floor(100 + Math.random() * 900)}`;
}

function loadSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as Session | null;
    return s && s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}
function saveSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(STORE, JSON.stringify(s));
    else sessionStorage.removeItem(STORE);
  } catch {
    /* private mode */
  }
}

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtSize(b: number) {
  return b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
}

/** Locked-down frame for HTML mail: no scripts, no network, no clicks out. */
function HtmlMail({ html }: { html: string }) {
  const doc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none';">` +
      `<base target="_blank"><style>body{margin:16px;font:14px/1.5 system-ui,sans-serif;color:#111;background:#fff}img{max-width:100%}</style></head><body>${html}</body></html>`,
    [html]
  );
  return (
    <iframe
      title="Mail body"
      sandbox=""
      srcDoc={doc}
      className="h-[420px] w-full rounded-xl border border-[var(--border)] bg-white"
    />
  );
}

export function TempMailApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mails, setMails] = useState<Mail[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    // Restore an address from this tab, if it is still alive.
    setSession(loadSession());
    setHydrated(true);
  }, []);

  // Clock for the countdown.
  useEffect(() => {
    if (!session) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [session]);

  const expire = useCallback(() => {
    setSession((s) => {
      // Tell the server so the slot is free right away. Fire and forget.
      if (s && s.expiresAt > Date.now()) {
        fetch("/api/temp-mail/release", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: s.name, token: s.token }),
          keepalive: true,
        }).catch(() => {});
      }
      return null;
    });
    saveSession(null);
    setMails([]);
    setOpenId(null);
  }, []);

  const poll = useCallback(async () => {
    if (!session) return;
    setChecking(true);
    try {
      const res = await fetch(
        `/api/temp-mail/inbox?name=${encodeURIComponent(session.name)}&token=${session.token}`,
        { cache: "no-store" }
      );
      if (res.status === 404) {
        expire();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { expiresAt: number; mails: Mail[] };
      setMails((prev) => {
        if (data.mails.length > prev.length && prev.length >= 0) {
          track("temp_mail_received", { count: data.mails.length - prev.length });
        }
        return data.mails;
      });
    } catch {
      /* offline; try again next tick */
    } finally {
      setChecking(false);
    }
  }, [session, expire]);

  // Poll while the tab is visible.
  useEffect(() => {
    if (!session) return;
    const start = () => {
      if (pollRef.current !== null) return;
      poll();
      pollRef.current = window.setInterval(poll, POLL_MS);
    };
    const stop = () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [session, poll]);

  // Local expiry, in case the server is slow to say so.
  useEffect(() => {
    if (session && now >= session.expiresAt) expire();
  }, [now, session, expire]);

  const claim = async (raw: string) => {
    const name = normalizeName(raw);
    const problem = nameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/temp-mail/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as Partial<Session> & { error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      const s = data as Session;
      setSession(s);
      saveSession(s);
      setMails([]);
      setOpenId(null);
      setInput("");
      track("temp_mail_created", { random: raw !== input });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.address);
      setCopied(true);
      track("temp_mail_copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* selectable anyway */
    }
  };

  const open = mails.find((m) => m.id === openId) ?? null;
  const left = session ? session.expiresAt - now : 0;
  const pct = session ? Math.max(0, Math.min(1, left / (10 * 60 * 1000))) : 0;

  if (!hydrated) return <div className="min-h-[320px]" />;

  if (!session) {
    return (
      <section className="glass-card mx-auto max-w-xl p-6 sm:p-8">
        <label htmlFor="tm-name" className="text-sm font-medium">
          Pick a name
        </label>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            claim(input);
          }}
        >
          <div className="flex h-12 flex-1 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] pl-4 pr-3 focus-within:border-[var(--accent)]">
            <input
              id="tm-name"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              placeholder="alex"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={30}
              className="min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-[var(--muted)]"
            />
            <span className="font-mono text-sm text-[var(--muted)]">@{MAIL_DOMAIN}</span>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="btn-glow inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium disabled:opacity-60"
          >
            <EnvelopeSimpleIcon size={16} weight="bold" aria-hidden="true" />
            {busy ? "Creating…" : "Create inbox"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <button
            type="button"
            onClick={() => claim(randomName())}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--accent)]"
          >
            <ShuffleIcon size={14} aria-hidden="true" />
            Surprise me
          </button>
          <span>Letters, numbers, dots, dashes. Lives 10 minutes.</span>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--accent)]">
            {error}
          </p>
        )}
        <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
          Honest note: mail has to pass through a server to reach you. It sits
          there, encrypted in transit, for at most 10 minutes, then it is deleted.
          Do not use this for anything you would mind losing.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-12">
      {/* Address card */}
      <div className="glass-card p-5 lg:col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wide text-[var(--muted)]">
              Your address
            </p>
            <p className="mt-1 truncate font-mono text-lg sm:text-2xl" data-ph-mask>
              {session.address}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="btn-glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm"
            >
              {copied ? <CheckIcon size={15} weight="bold" /> : <CopyIcon size={15} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => {
                track("temp_mail_discarded");
                expire();
              }}
              className="btn-glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm"
            >
              <TrashIcon size={15} />
              New address
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--accent-dim)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <span className="font-mono text-sm tabular-nums text-[var(--muted)]">
            {fmtLeft(left)} left
          </span>
        </div>
      </div>

      {/* Mail list */}
      <div className="glass-card overflow-hidden lg:col-span-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <p className="text-sm font-medium">
            Inbox <span className="text-[var(--muted)]">({mails.length})</span>
          </p>
          <button
            type="button"
            onClick={poll}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowClockwiseIcon size={14} className={checking ? "animate-spin" : ""} />
            Check now
          </button>
        </div>
        {mails.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent)]" />
            </span>
            <p className="text-sm text-[var(--muted)]">
              Waiting for mail. This page checks every few seconds.
            </p>
          </div>
        ) : (
          <ul className="max-h-[520px] divide-y divide-[var(--border)] overflow-y-auto">
            {mails.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(m.id);
                    setShowHtml(false);
                    track("temp_mail_opened");
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--accent-dim)] ${
                    openId === m.id ? "bg-[var(--accent-dim)]" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium" data-ph-mask>
                      {m.fromName || m.from || "Unknown sender"}
                    </p>
                    <span className="flex-none font-mono text-[11px] text-[var(--muted)]">
                      {fmtTime(m.receivedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]" data-ph-mask>
                    {m.subject}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reader */}
      <div className="glass-card min-h-[320px] p-5 lg:col-span-7" data-ph-mask>
        {!open ? (
          <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-[var(--muted)]">
            Pick a mail to read it.
          </div>
        ) : (
          <article>
            <h2 className="text-lg font-semibold leading-snug tracking-tight">{open.subject}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              From{" "}
              <span className="text-[var(--fg)]">
                {open.fromName ? `${open.fromName} <${open.from}>` : open.from}
              </span>{" "}
              at {fmtTime(open.receivedAt)}
            </p>
            {open.attachments.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {open.attachments.map((a, i) => (
                  <li
                    key={`${a.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] text-[var(--muted)]"
                    title="Attachments are not stored."
                  >
                    <PaperclipIcon size={12} />
                    {a.name} · {fmtSize(a.size)}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center gap-2 border-b border-[var(--border)] pb-3 text-xs">
              <button
                type="button"
                onClick={() => setShowHtml(false)}
                className={`rounded-full px-3 py-1 ${!showHtml ? "bg-[var(--accent-dim)] text-[var(--fg)]" : "text-[var(--muted)]"}`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setShowHtml(true)}
                disabled={!open.html}
                className={`rounded-full px-3 py-1 disabled:opacity-40 ${showHtml ? "bg-[var(--accent-dim)] text-[var(--fg)]" : "text-[var(--muted)]"}`}
              >
                HTML
              </button>
            </div>
            <div className="mt-4">
              {showHtml && open.html ? (
                <HtmlMail html={open.html} />
              ) : (
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed">
                  {open.text || "(This mail has no plain text. Try the HTML view.)"}
                </pre>
              )}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
