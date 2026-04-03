# Task: Single-page Next.js personal website for Guru, deployable to Vercel

## Goal
Build a personal portfolio site at `/Users/elite/x45/new-lander/` using Next.js 14 (App Router) and Tailwind CSS. The site is a single page inspired by gajesh.com's technical-minimalist aesthetic: dark/light toggle, monospace accents, text-forward layout. Content comes from the user's markdown profile (zerufinance co-founder, on-chain intelligence builder).

## Assumptions
- [ ] Node.js and npm are available in PATH → breaks step 1 if wrong
- [ ] No existing Next.js project exists in /Users/elite/x45/new-lander/ (only AGENTS.md present) → breaks step 1 if wrong

## Context
- Read: /Users/elite/x45/new-lander/AGENTS.md — executor instructions, do not modify
- Note: Do not modify AGENTS.md
- Note: Use Next.js 14 App Router (not Pages Router)
- Note: Use Tailwind CSS v3
- Note: Use next-themes for dark/light mode

## Steps

### Step 1: Verify scaffold and dependencies [ALREADY DONE — SKIP]
What to do: This step was completed externally. package.json exists with next, next-themes, and geist installed. node_modules/ exists. app/ directory exists. Skip to Step 2.
Expected output: Already done.
If blocked: N/A.

### Step 2: Verify next-themes and geist installed [ALREADY DONE — SKIP]
What to do: next-themes and geist were installed externally. Skip to Step 3.
Expected output: Already done.
If blocked: N/A.

### Step 3: Create ThemeProvider wrapper
What to do: Create file /Users/elite/x45/new-lander/app/providers.tsx with this exact content:
```tsx
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```
Expected output: File exists at app/providers.tsx.
If blocked: File already exists with conflicting content.

### Step 4: Update app/layout.tsx
What to do: Overwrite /Users/elite/x45/new-lander/app/layout.tsx with this exact content:
```tsx
import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Guru — On-chain intelligence builder",
  description:
    "Co-founder @zerufinance. Building at the intersection of crypto and AI — wallet reputation scoring, on-chain behavioral analysis, agent identity.",
  openGraph: {
    title: "Guru — On-chain intelligence builder",
    description:
      "Co-founder @zerufinance. Building at the intersection of crypto and AI.",
    url: "https://x45.in",
    siteName: "Guru",
  },
  twitter: {
    card: "summary",
    site: "@elitex45",
    creator: "@elitex45",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```
Expected output: File exists at app/layout.tsx with GeistSans, GeistMono, and Providers imported.
If blocked: geist package is not available.

### Step 5: Install geist fonts
What to do: Run from /Users/elite/x45/new-lander/:
```
npm install geist
```
Expected output: `geist` appears in package.json dependencies.
If blocked: npm install fails.

### Step 6: Update globals.css
What to do: Overwrite /Users/elite/x45/new-lander/app/globals.css with this exact content:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg: #ffffff;
    --fg: #111111;
    --muted: #666666;
    --border: #e5e5e5;
    --accent: #00ff41;
  }
  .dark {
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #8b949e;
    --border: #21262d;
    --accent: #00ff41;
  }
  body {
    background-color: var(--bg);
    color: var(--fg);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
}
```
Expected output: File exists at app/globals.css with CSS variable definitions for dark and light themes.
If blocked: File write fails.

### Step 7: Create ThemeToggle component
What to do: Create file /Users/elite/x45/new-lander/app/components/ThemeToggle.tsx with this exact content:
```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-xs font-mono px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "light" : "dark"}
    </button>
  );
}
```
Expected output: File exists at app/components/ThemeToggle.tsx.
If blocked: app/components/ directory creation fails.

### Step 8: Create main page app/page.tsx
What to do: Overwrite /Users/elite/x45/new-lander/app/page.tsx with this exact content:
```tsx
import { ThemeToggle } from "./components/ThemeToggle";

const techStack = [
  "Python",
  "TypeScript",
  "Rust",
  "Solidity",
  "ClickHouse",
  "GCP",
  "Claude",
];

const projects = [
  {
    name: "zerufinance",
    url: "https://github.com/zerufinance",
    desc: "zScore + Zaps. classifying wallet trustworthiness using on-chain history.",
    label: "crypto × AI",
  },
  {
    name: "agentscan.tech",
    url: "https://agentscan.tech",
    desc: "explorer + indexer for AI agents on ERC-8004 identity registry.",
    label: "agent infra",
  },
  {
    name: "dualcode",
    url: "https://github.com/elitex45/dualcode",
    desc: "sonnet plans. minimax executes. you ship 2.6x faster and spend 60% less credits.",
    label: "dev tooling",
  },
];

const socials = [
  { label: "twitter", handle: "@elitex45", url: "https://twitter.com/elitex45" },
  { label: "telegram", handle: "@elitex45", url: "https://t.me/elitex45" },
  { label: "website", handle: "x45.in", url: "https://x45.in" },
  { label: "linkedin", handle: "elitex25", url: "https://linkedin.com/in/elitex25" },
  { label: "github", handle: "elitex45", url: "https://github.com/elitex45" },
];

export default function Home() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-16 font-mono">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-16">
        <span className="text-xs text-[var(--muted)]">guru / x45.in</span>
        <ThemeToggle />
      </div>

      {/* Hero */}
      <section className="mb-12">
        <h1 className="text-2xl font-bold mb-1 font-sans tracking-tight text-[var(--fg)]">
          Hi, I&apos;m Guru{" "}
          <span className="wave inline-block" aria-label="wave">
            👋
          </span>
        </h1>
        <p className="text-sm text-[var(--muted)] mb-4">
          📍 Bengaluru, India &nbsp;·&nbsp; 24
        </p>
        <p className="text-sm text-[var(--fg)] leading-relaxed mb-4">
          Co-founder{" "}
          <a
            href="https://github.com/zerufinance"
            className="text-[var(--accent)] hover:underline"
          >
            @zerufinance
          </a>
          . On-chain intelligence builder. Building at the intersection of
          crypto and AI — wallet reputation scoring, on-chain behavioral
          analysis, agent identity.
        </p>
        <p className="text-xs text-[var(--muted)] italic border-l-2 border-[var(--border)] pl-3">
          &ldquo;The only thing more terrifying than the cage is not trying to
          escape it.&rdquo;
        </p>
      </section>

      {/* Tech stack */}
      <section className="mb-12">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-3">
          stack
        </p>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)]"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section className="mb-12">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-4">
          current projects
        </p>
        <div className="space-y-5">
          {projects.map((p) => (
            <div key={p.name} className="group">
              <div className="flex items-baseline gap-3 mb-1">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
                >
                  {p.name}
                </a>
                <span className="text-xs text-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                  {p.label}
                </span>
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed pl-0">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What I'm doing */}
      <section className="mb-12">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-4">
          what i&apos;m doing
        </p>
        <ul className="space-y-2 text-sm text-[var(--fg)]">
          <li className="flex gap-2">
            <span className="text-[var(--muted)] select-none">├──</span>
            <span>
              Building wallet reputation scoring and on-chain behavioral
              analysis at{" "}
              <a
                href="https://zeruai.org"
                className="text-[var(--accent)] hover:underline"
              >
                zeruai.org
              </a>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--muted)] select-none">├──</span>
            <span>
              Shipping{" "}
              <a
                href="https://github.com/elitex45/dualcode"
                className="text-[var(--accent)] hover:underline"
              >
                dualcode
              </a>{" "}
              — minimal two-model system: Sonnet plans, MiniMax executes
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--muted)] select-none">└──</span>
            <span>
              Writing about AI workflows, agent systems, and DeFi
              infrastructure
            </span>
          </li>
        </ul>
      </section>

      {/* Philosophy */}
      <section className="mb-12">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-4">
          philosophy
        </p>
        <div className="space-y-3 text-sm text-[var(--muted)]">
          <p>
            I build tools that solve real problems, use AI as leverage not a
            crutch, and ship before I&apos;m ready.
          </p>
          <p>
            Currently running Sonnet for thinking and MiniMax for everything
            else. Game theory lens on everything.
          </p>
          <p className="text-[var(--accent)] font-semibold">
            &ldquo;the universe always delivers 🌌&rdquo;
          </p>
        </div>
      </section>

      {/* Connect */}
      <section className="mb-16">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-4">
          connect
        </p>
        <div className="space-y-2">
          {socials.map((s) => (
            <div key={s.label} className="flex gap-4 items-center text-sm">
              <span className="text-[var(--muted)] w-16 text-xs">{s.label}</span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
              >
                {s.handle}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] flex justify-between">
        <span>guru · bengaluru</span>
        <span>built with next.js</span>
      </footer>
    </main>
  );
}
```
Expected output: File exists at app/page.tsx and `npm run build` exits with code 0.
If blocked: Build fails due to missing imports or type errors.

### Step 9: Run build to verify
What to do: Run from /Users/elite/x45/new-lander/:
```
npm run build
```
Expected output: Command exits with code 0. Output contains "Compiled successfully" or "Route (app)" table.
If blocked: Build fails with errors that cannot be resolved within scope (e.g. missing env vars, incompatible package versions).

## Definition of done
- [ ] `npm run build` exits with code 0 from /Users/elite/x45/new-lander/
- [ ] `npm run dev` starts without error and page renders at localhost:3000
- [ ] app/page.tsx exists and contains "zerufinance", "agentscan", "dualcode"
- [ ] app/components/ThemeToggle.tsx exists
- [ ] app/providers.tsx exists

## Escalate to me if
- Architecture change needed (new table, service, external dependency beyond next-themes and geist)
- Existing code directly contradicts the plan
- create-next-app fails or requires interactive prompts
- Same blocker loops 3+ times
