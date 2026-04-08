import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects — Guru",
  description: "Live tools built into this site. Free, open, in-browser.",
};

type ProjectEntry = {
  slug: string;
  emoji: string;
  title: string;
  blurb: string;
  status: "live" | "wip" | "planned";
  href: string;
  label: string;
  accent: string;
};

const projects: ProjectEntry[] = [
  {
    slug: "perps-replay",
    emoji: "📈",
    title: "Perps Replay",
    blurb:
      "Bar-by-bar replay of any Binance perp, with full paper trading — limit/stop/TP/SL, leverage up to 125×, isolated margin, liquidations. Free, in-browser, no signup. Built because every existing replay tool is paywalled.",
    status: "live",
    href: "/projects/perps-replay",
    label: "trading",
    accent: "var(--accent)",
  },
  {
    slug: "readme-viewer",
    emoji: "📝",
    title: "Readme Viewer",
    blurb:
      "Type markdown on the left, see it rendered on the right, export to a clean PDF when you're done. GFM tables, task lists, syntax-highlighted code. Drafts persist locally. No signup.",
    status: "live",
    href: "/projects/readme-viewer",
    label: "writing",
    accent: "var(--accent)",
  },
  {
    slug: "pomodoro",
    emoji: "🍅",
    title: "Pomodoro",
    blurb:
      "25 minutes of focus, 5 minute break, repeat. Big circular timer that changes color per mode, a chime when time's up, and a todo list that tracks how many pomodoros each task ate. Stays accurate even with the tab in the background.",
    status: "live",
    href: "/projects/pomodoro",
    label: "productivity",
    accent: "var(--accent)",
  },
];

const statusStyle: Record<ProjectEntry["status"], string> = {
  live: "text-[var(--accent)] border-[var(--accent)]",
  wip: "text-[var(--cyan)] border-[var(--cyan)]",
  planned: "text-[var(--muted)] border-[var(--border)]",
};

export default function ProjectsIndexPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-12 pb-24">
      <header className="mb-12">
        <p className="text-xs font-mono text-[var(--accent)] tracking-widest uppercase mb-3">
          &gt; ./projects
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--fg)] mb-3">
          Things I built and put on the internet for free.
        </h1>
        <p className="text-sm text-[var(--muted)] leading-relaxed max-w-xl">
          Live, in-browser tools that live in this repo. No signups, no
          paywalls, no telemetry. If something here is useful, take it.
        </p>
      </header>

      <div className="space-y-4">
        {projects.map((p) => (
          <Link
            key={p.slug}
            href={p.href}
            className="glass-card p-6 group block"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div>
                  <h2 className="text-base font-semibold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors flex items-center gap-2">
                    {p.title}
                    <svg
                      className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 17L17 7M17 7H7M17 7v10"
                      />
                    </svg>
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] mt-0.5">
                    {p.label}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusStyle[p.status]} opacity-80`}
              >
                {p.status}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {p.blurb}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
