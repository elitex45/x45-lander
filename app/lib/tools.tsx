import type { ReactNode } from "react";
import { ExpensePreview } from "../components/previews/ExpensePreview";
import { PomodoroPreview } from "../components/previews/PomodoroPreview";
import { ReadmePreview } from "../components/previews/ReadmePreview";
import { TweetExporterPreview } from "../components/previews/TweetExporterPreview";
import { CopyClipPreview } from "../components/previews/CopyClipPreview";
import { TempMailPreview } from "../components/previews/TempMailPreview";

export type ToolKind = "web" | "extension" | "mac" | "cli";

export interface Tool {
  /** Stable id, also used as the React key. */
  slug: string;
  name: string;
  desc: string;
  /** Internal route or full external URL. */
  href: string;
  kind: ToolKind;
  /** Where the code lives. */
  repo: string;
  /** ISO date the tool was added. Newest goes first. */
  added: string;
  /** Optional live miniature shown in the card. */
  preview?: ReactNode;
  /** Short facts for the tool's own page. */
  details: string[];
  /** Label for the main button on the tool page. */
  cta: string;
  /** Search and answer-engine text. Title 50-60 chars, description 120-160. */
  seo: {
    title: string;
    description: string;
    keywords: string[];
    faq: { q: string; a: string }[];
  };
}

export const KIND_LABEL: Record<ToolKind, string> = {
  web: "Web app",
  extension: "Browser extension",
  mac: "macOS app",
  cli: "Command line",
};

/**
 * The one list every page reads. To add a tool, add an entry here.
 * A preview is optional; cards without one still look fine.
 */
export const TOOLS: Tool[] = [
  {
    slug: "temp-mail",
    name: "Temp mail",
    desc: "Pick any name at x45.in and get a 10 minute inbox. Then it is gone.",
    href: "/projects/temp-mail",
    kind: "web",
    repo: "https://github.com/elitex45/x45-lander/tree/main/app/projects/temp-mail",
    added: "2026-09-06",
    preview: <TempMailPreview />,
    details: [
      "Type a name like alex, get alex@x45.in. Or let it pick one for you.",
      "Mail shows up on the page within seconds. Read it as text or safe HTML.",
      "After 10 minutes the address and every mail in it are deleted.",
      "Plain HTTP API too, so scripts and AI agents can get an inbox in three calls.",
      "Honest note: this one needs a server. Mail sits there for 10 minutes, then it is gone.",
    ],
    cta: "Open the inbox",
    seo: {
          title: "Temp Mail: Free Disposable Email at x45.in, Gone in 10 Min",
          description: "Free temporary email with a name you choose, like alex@x45.in. Mail lands in seconds, everything is deleted after 10 minutes. No signup. HTTP API for agents.",
          keywords: [
                "temp mail",
                "temporary email",
                "disposable email",
                "10 minute mail",
                "throwaway email",
                "fake email for signup",
                "temp email api",
                "email for ai agents"
          ],
          faq: [
                {
                      q: "How long does a temp mail address last?",
                      a: "Ten minutes from the moment you claim it. After that the address and every mail in it are deleted, and anyone can claim the name again."
                },
                {
                      q: "Can I choose my own address?",
                      a: "Yes. Type any name with letters, numbers, dots or dashes and you get name@x45.in. If someone holds it right now, pick another or let the page choose one for you."
                },
                {
                      q: "Can a script or AI agent use temp mail?",
                      a: "Yes. There is a plain HTTP API with no key: claim a name, wait for mail, read the inbox. The docs live at x45.in/projects/temp-mail/api and as JSON at x45.in/api/temp-mail."
                },
                {
                      q: "Is temp mail private?",
                      a: "Mail passes through one server and is stored for at most 10 minutes, then deleted. Attachments are never stored. Do not use it for anything you would mind losing."
                }
          ]
    },
  },
  {
    slug: "copyclip-oss",
    name: "CopyClip OSS",
    desc: "Menu bar clipboard history for macOS. Encrypted at rest and locked behind Touch ID.",
    href: "https://github.com/elitex45/copyclip-oss",
    kind: "mac",
    repo: "https://github.com/elitex45/copyclip-oss",
    added: "2026-09-05",
    preview: <CopyClipPreview />,
    details: [
      "Lives in the menu bar. Click the paperclip, see your last copies, click one to copy it back.",
      "Every open asks for Touch ID, with a PIN as fallback. It relocks after 60 seconds.",
      "History is AES-256 encrypted on disk. No other process on the Mac can read it.",
      "Needs macOS 14 or newer. Free, open source, one minute to build yourself.",
    ],
    cta: "Get it on GitHub",
    seo: {
          title: "CopyClip OSS: Free Encrypted Clipboard Manager for macOS",
          description: "Open source clipboard history for the Mac menu bar. Touch ID to open, AES-256 encrypted on disk, nothing leaves your machine. Free, macOS 14 and newer.",
          keywords: [
                "clipboard manager mac",
                "clipboard history macos",
                "open source clipboard manager",
                "encrypted clipboard",
                "touch id clipboard",
                "copyclip alternative"
          ],
          faq: [
                {
                      q: "Is CopyClip OSS free?",
                      a: "Yes. It is open source on GitHub. Build it yourself in about a minute or download a release."
                },
                {
                      q: "How is my clipboard history protected?",
                      a: "The history is AES-256 encrypted on disk and the app relocks after 60 seconds. Opening it asks for Touch ID, with a PIN as fallback."
                },
                {
                      q: "Which macOS versions work?",
                      a: "macOS 14 Sonoma and newer."
                }
          ]
    },
  },
  {
    slug: "tweet-exporter",
    name: "Tweet exporter",
    desc: "Paste X usernames, get a zip of JSON with exact counts. Waits out rate limits on its own.",
    href: "https://github.com/elitex45/tweet-exporter",
    kind: "extension",
    repo: "https://github.com/elitex45/tweet-exporter",
    added: "2026-08-29",
    preview: <TweetExporterPreview />,
    details: [
      "Paste X usernames, one per line. Get one JSON file per account, zipped.",
      "Exact likes, retweets, replies, bookmarks and impressions, not the rounded numbers on the page.",
      "Reads the real rate limit and waits it out. Checkpoints and resumes on its own.",
      "Manifest V3. Works in Chrome, Brave and Edge. Nothing leaves your browser.",
    ],
    cta: "Get it on GitHub",
    seo: {
          title: "Tweet Exporter: Free Chrome Extension to Export X Posts",
          description: "Paste X usernames, get one JSON file per account with exact likes, retweets, replies and impressions. Waits out rate limits. Chrome, Brave and Edge.",
          keywords: [
                "export tweets",
                "tweet exporter",
                "download x posts json",
                "twitter data export extension",
                "scrape tweets chrome extension",
                "x archive tool"
          ],
          faq: [
                {
                      q: "What does Tweet Exporter export?",
                      a: "For each username you get a JSON file with every post it can reach, including exact likes, retweets, replies, bookmarks and impressions, zipped together."
                },
                {
                      q: "Does it handle rate limits?",
                      a: "Yes. It reads the real rate limit from X, waits it out, checkpoints progress and resumes on its own."
                },
                {
                      q: "Does my data leave the browser?",
                      a: "No. It is a Manifest V3 extension that runs entirely in your browser. Nothing is sent to any server."
                }
          ]
    },
  },
  {
    slug: "pomodoro",
    name: "Pomodoro timer",
    desc: "Twenty-five honest minutes, real breaks, and a short task list.",
    href: "/projects/pomodoro",
    kind: "web",
    repo: "https://github.com/elitex45/x45-lander/tree/main/app/projects/pomodoro",
    added: "2026-08-10",
    preview: <PomodoroPreview />,
    details: [
      "Twenty-five minute focus blocks, short and long breaks, four rounds to a long break.",
      "A small task list so the next thing is always in view.",
      "Keyboard first: space to start, R to reset, S to skip.",
      "Everything is saved in your browser. Nothing is sent anywhere.",
    ],
    cta: "Open the timer",
    seo: {
          title: "Pomodoro Timer Online: Free Focus Timer with Tasks, No Login",
          description: "A calm online Pomodoro timer: 25 minute focus blocks, short and long breaks, a small task list and keyboard shortcuts. No account, saved in your browser.",
          keywords: [
                "pomodoro timer",
                "online pomodoro",
                "focus timer",
                "25 minute timer",
                "study timer with tasks",
                "free pomodoro app"
          ],
          faq: [
                {
                      q: "How does the Pomodoro technique work?",
                      a: "Work for 25 minutes, rest for 5, and after four rounds take a longer break. The timer runs the cycle for you."
                },
                {
                      q: "Do I need an account?",
                      a: "No. Tasks and settings are saved in your browser and never leave it."
                },
                {
                      q: "Are there keyboard shortcuts?",
                      a: "Yes. Space starts or pauses, R resets, S skips to the next block."
                }
          ]
    },
  },
  {
    slug: "readme-viewer",
    name: "README viewer",
    desc: "Write Markdown, see the document, export a clean PDF.",
    href: "/projects/readme-viewer",
    kind: "web",
    repo: "https://github.com/elitex45/x45-lander/tree/main/app/projects/readme-viewer",
    added: "2026-08-10",
    preview: <ReadmePreview />,
    details: [
      "Type Markdown on the left, see the rendered document on the right.",
      "GitHub flavoured: tables, task lists, code blocks, footnotes.",
      "Export a clean PDF with one click.",
      "Drafts persist in your browser between visits.",
    ],
    cta: "Open the viewer",
    seo: {
          title: "README Viewer: Free Online Markdown Editor with PDF Export",
          description: "Write Markdown on the left, see the rendered document on the right. GitHub flavoured tables, task lists and code. Export a clean PDF in one click.",
          keywords: [
                "markdown editor online",
                "markdown to pdf",
                "readme preview",
                "github markdown viewer",
                "markdown previewer",
                "free markdown editor"
          ],
          faq: [
                {
                      q: "Can I turn Markdown into a PDF?",
                      a: "Yes. Click Export and the rendered document is saved as a clean PDF through your browser's print dialog."
                },
                {
                      q: "Which Markdown flavour is supported?",
                      a: "GitHub flavoured Markdown: tables, task lists, fenced code blocks, footnotes and the usual headings and links."
                },
                {
                      q: "Where are my drafts stored?",
                      a: "In your browser only. Nothing is uploaded."
                }
          ]
    },
  },
  {
    slug: "expense-tracker",
    name: "Expense tracker",
    desc: "Log spending in rupees and see where the month went.",
    href: "/projects/expense-tracker",
    kind: "web",
    repo: "https://github.com/elitex45/x45-lander/tree/main/app/projects/expense-tracker",
    added: "2026-08-10",
    preview: <ExpensePreview />,
    details: [
      "Log spending in rupees with a merchant, category and payment method.",
      "Monthly summary shows where the money went.",
      "Import and export your records as a file whenever you like.",
      "Stored only in your browser. No account, no server, no sync.",
    ],
    cta: "Open the tracker",
    seo: {
          title: "Expense Tracker: Free Private INR Budget App, No Account",
          description: "Log spending in rupees with merchant, category and payment method, then see where the month went. Stored only in your browser. No account, no server.",
          keywords: [
                "expense tracker",
                "inr expense tracker",
                "budget app no account",
                "private expense tracker",
                "monthly spending tracker",
                "offline expense tracker"
          ],
          faq: [
                {
                      q: "Is my spending data private?",
                      a: "Yes. Every record lives only in your browser. There is no account, no server and no sync."
                },
                {
                      q: "Can I back up or move my data?",
                      a: "Yes. Export your records to a file any time and import them on another device."
                },
                {
                      q: "Which currency does it use?",
                      a: "Indian rupees."
                }
          ]
    },
  },
];

export const isExternal = (href: string) => /^https?:\/\//.test(href);
