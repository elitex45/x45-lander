import type { ReactNode } from "react";
import { ExpensePreview } from "../components/previews/ExpensePreview";
import { PomodoroPreview } from "../components/previews/PomodoroPreview";
import { ReadmePreview } from "../components/previews/ReadmePreview";
import { TweetExporterPreview } from "../components/previews/TweetExporterPreview";
import { CopyClipPreview } from "../components/previews/CopyClipPreview";

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
  },
];

export const isExternal = (href: string) => /^https?:\/\//.test(href);
