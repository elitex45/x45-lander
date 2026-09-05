"use client";

import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useTheme } from "../lib/theme";
import { PageCat } from "./PageCat";
import { SecretGame } from "./SecretGame";
import { SiteNav } from "./SiteNav";
import { ThankMe } from "./ThankMe";
import { ToolCard } from "./ToolCard";
import { TOOLS } from "../lib/tools";

const REPO = "https://github.com/elitex45/x45-lander";

const principles = [
  {
    title: "One job each.",
    body: "A timer times. A ledger adds. Nothing grows a settings page it does not need.",
  },
  {
    title: "No account, ever.",
    body: "Your data stays on your machine. There is no server to leak it from.",
  },
  {
    title: "Code in the open.",
    body: "Every tool has a public repo. Read it, fork it, fix it.",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function HomePage() {
  const newest = [...TOOLS].sort((a, b) => b.added.localeCompare(a.added))[0];
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const catPositionRef = useRef({ x: 200, y: 0 });
  const [fedTrigger, setFedTrigger] = useState(0);
  const [catFriendly, setCatFriendly] = useState(false);
  const handleFeedCat = useCallback(() => setFedTrigger((n) => n + 1), []);
  const handlePhaseChange = useCallback((phase: string) => {
    if (phase === "authorized") setCatFriendly(true);
    if (phase === "idle") setCatFriendly(false);
  }, []);

  return (
    <>
      <div className="lamp" aria-hidden="true" />
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

      <SiteNav />

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        {/* Hero: copy on the left, the tools themselves on the right. */}
        <section
          className="grid gap-10 pb-20 pt-10 lg:grid-cols-12 lg:gap-8 lg:pt-16"
          aria-labelledby="hero-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="flex flex-col justify-center lg:col-span-5 lg:pr-6"
          >
            <h1
              id="hero-title"
              className="text-4xl font-semibold leading-[1.02] tracking-tighter text-[var(--fg)] sm:text-5xl lg:text-[3.4rem]"
            >
              Small tools for a{" "}
              <span className="text-shine">slightly easier</span> day.
            </h1>
            <p className="mt-6 max-w-[38ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Free tools that do one job well. No accounts, no servers, and the
              source is right there.
            </p>
            <div className="mt-8">
              <a
                href={REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                <GithubLogoIcon size={16} weight="bold" aria-hidden="true" />
                Read the source
              </a>
            </div>
          </motion.div>

          {/* Newest tool gets the big slot. It changes as the list grows. */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { delayChildren: 0.15 } },
            }}
            className="relative grid lg:col-span-7"
          >
            <div className="halo" aria-hidden="true" />
            <p className="mb-3 font-mono text-xs text-[var(--muted)]">
              newest
            </p>
            <ToolCard tool={newest} className="min-h-[380px]" />
          </motion.div>
        </section>

        <hr className="rule" />

        {/* Everything except the newest. The grid just gets longer as more are added. */}
        <section
          id="tools"
          className="scroll-mt-20 py-16 lg:py-20"
          aria-labelledby="tools-title"
        >
          <div className="mb-8 flex items-end justify-between gap-6">
            <h2
              id="tools-title"
              className="text-2xl font-semibold tracking-tight text-[var(--fg)] sm:text-3xl"
            >
              More tools
            </h2>
            <p className="font-mono text-xs text-[var(--muted)]">
              {TOOLS.length} and counting
            </p>
          </div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.07 } },
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {TOOLS.filter((t) => t.slug !== newest.slug).map((tool) => (
              <ToolCard key={tool.slug} tool={tool} className="min-h-[320px]" />
            ))}
          </motion.div>
        </section>

        {/* How they are built: three statements, no boxes. */}
        <hr className="rule" />
        <section className="py-16 lg:py-20" aria-labelledby="how-title">
          <h2 id="how-title" className="sr-only">
            How these tools are built
          </h2>
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            {principles.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                className={i === 1 ? "lg:mt-10" : i === 2 ? "lg:mt-20" : ""}
              >
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--fg)] sm:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-[var(--muted)]">
                  {p.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--border)] py-10 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Built slowly, shared freely. The cat is not for sale.</p>
          <div className="flex gap-5">
            <ThankMe variant="link" />
            <a
              href="https://github.com/elitex45"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--accent)]"
            >
              GitHub
            </a>
            <a
              href="https://t.me/elitex45"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--accent)]"
            >
              Telegram
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
