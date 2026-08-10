"use client";

import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useTheme } from "../lib/theme";
import { PageCat } from "./PageCat";
import { ProjectCard } from "./ProjectCard";
import { ScrollReveal, StaggerContainer } from "./ScrollReveal";
import { SecretGame } from "./SecretGame";
import { StarField } from "./StarField";
import { ThemeToggle } from "./ThemeToggle";

const liveProjects = [
  {
    emoji: "📝",
    name: "README viewer",
    url: "/projects/readme-viewer",
    sourceUrl:
      "https://github.com/elitex45/x45-lander/tree/main/app/projects/readme-viewer",
    desc: "Turn a Markdown draft into a clean document and export it as a PDF, without leaving the browser or making an account.",
    label: "writing tool",
  },
  {
    emoji: "🍅",
    name: "Pomodoro timer",
    url: "/projects/pomodoro",
    sourceUrl:
      "https://github.com/elitex45/x45-lander/tree/main/app/projects/pomodoro",
    desc: "Give one task an honest 25 minutes. The timer, breaks, and a small task list stay together in your browser.",
    label: "focus tool",
  },
  {
    emoji: "₹",
    name: "Expense tracker",
    url: "/projects/expense-tracker",
    sourceUrl:
      "https://github.com/elitex45/x45-lander/tree/main/app/projects/expense-tracker",
    desc: "Record everyday spending, filter the month, and see useful patterns. Everything stays private in this browser.",
    label: "money tool",
  },
];

const workshopNotes = ["one clear job", "no account required", "source in the open"];

const navLinkClass =
  "text-xs font-mono text-[var(--muted)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)] rounded-sm";

export function HomePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const catPositionRef = useRef({ x: 200, y: 0 });
  const [fedTrigger, setFedTrigger] = useState(0);
  const [catFriendly, setCatFriendly] = useState(false);
  const handleFeedCat = useCallback(() => {
    setFedTrigger((prev) => prev + 1);
  }, []);
  const handlePhaseChange = useCallback((phase: string) => {
    if (phase === "authorized") setCatFriendly(true);
    if (phase === "idle") setCatFriendly(false);
  }, []);

  return (
    <>
      <StarField isDark={isDark} />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />
      <div className="orb orb-4" aria-hidden="true" />
      <div className="sunset-sky" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <div className="scan-line" aria-hidden="true" />
      <PageCat
        isDark={isDark}
        positionRef={catPositionRef}
        fedTrigger={fedTrigger}
        friendly={catFriendly}
      />
      <SecretGame
        catPosition={catPositionRef}
        onFeedCat={handleFeedCat}
        onPhaseChange={handlePhaseChange}
        isDark={isDark}
      />

      <main className="relative z-10 mx-auto max-w-2xl px-6">
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="sticky top-0 z-50 flex items-center justify-between py-8"
          aria-label="Primary navigation"
        >
          <div className="flex items-center gap-2">
            <div className="pulse-dot" />
            <span className="text-xs font-mono text-[var(--muted)]">
              elitex45
              <span className="hidden sm:inline"> / public workshop</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://github.com/elitex45"
              target="_blank"
              rel="noopener noreferrer"
              className={navLinkClass}
            >
              GitHub
            </a>
            <a
              href="https://t.me/elitex45"
              target="_blank"
              rel="noopener noreferrer"
              className={navLinkClass}
            >
              Telegram
            </a>
            <span>
              <ThemeToggle />
            </span>
          </div>
        </motion.nav>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="flex min-h-[68vh] flex-col justify-center pb-20 pt-16"
        >
          <p className="mb-5 text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent)]">
            open source for everyday friction
          </p>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight text-[var(--fg)] md:text-6xl">
            Small tools for a slightly easier day.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--muted)] md:text-lg">
            Focused, free browser tools for the bits of work that should be
            simpler: writing a README, staying with one task, and whatever small
            friction is worth removing next.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#tools"
              className="rounded-full border border-[var(--accent)] bg-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)]"
            >
              see the tools ↓
            </a>
            <a
              href="https://github.com/elitex45"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)]"
            >
              browse the source ↗
            </a>
          </div>
        </motion.section>

        <section
          className="mb-24"
          aria-label="Workshop principles"
        >
          <ScrollReveal>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
              {workshopNotes.map((note, index) => (
                <div
                  key={note}
                  className="bg-[var(--bg)] px-4 py-4 text-xs font-mono text-[var(--muted)]"
                >
                  <span className="mr-2 text-[var(--accent)]">
                    0{index + 1}
                  </span>
                  {note}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <section
          id="tools"
          className="mb-24 scroll-mt-24"
        >
          <ScrollReveal>
            <div className="mb-8 flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent)]">
                  on the workbench
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--fg)]">
                  Three useful things
                </h2>
              </div>
              <p className="hidden max-w-[15rem] text-right text-xs leading-relaxed text-[var(--muted)] sm:block">
                Open them, use them, inspect the code, or make them your own.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="space-y-4">
            {liveProjects.map((project, index) => (
              <ProjectCard key={project.name} {...project} index={index} />
            ))}
          </StaggerContainer>
        </section>

        <ScrollReveal>
          <footer className="pb-12">
            <div className="gradient-line mb-6" />
            <div className="flex flex-col gap-2 text-xs font-mono text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
              <span>built slowly, shared freely.</span>
              <span>elitex45 · {new Date().getFullYear()}</span>
            </div>
          </footer>
        </ScrollReveal>
      </main>
    </>
  );
}
