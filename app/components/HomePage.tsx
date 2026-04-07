"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useTheme } from "../lib/theme";
import Link from "next/link";
import { StarField } from "./StarField";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";
import { PageCat } from "./PageCat";
import { ProjectCard } from "./ProjectCard";
import { Typewriter } from "./Typewriter";
import { ThemeToggle } from "./ThemeToggle";
import { CharacterStagger } from "./CharacterStagger";
import { MagneticText } from "./MagneticText";
import { ScrambleText } from "./ScrambleText";
import { SecretGame } from "./SecretGame";

const techStack = [
  { name: "Python", color: "#3b82f6" },
  { name: "TypeScript", color: "#06b6d4" },
  { name: "Rust", color: "#f97316" },
  { name: "Solidity", color: "#a855f7" },
  { name: "ClickHouse", color: "#facc15" },
  { name: "GCP", color: "#22c55e" },
  { name: "Claude", color: "#00ff41" },
];

// In-repo, hosted projects. Each one is a live tool you can open in the
// browser — no GitHub-readme parsing, no shitty dead links, just things
// that actually run.
const liveProjects = [
  {
    emoji: "📈",
    name: "perps-replay",
    url: "/projects/perps-replay",
    desc: "bar-by-bar replay of any binance perp with full paper trading — limit/stop/tp/sl, leverage, liquidations. free, in-browser, no signup. built because every replay tool is paywalled.",
    label: "trading",
  },
];

const socials = [
  {
    label: "twitter",
    handle: "@elitex45",
    url: "https://twitter.com/elitex45",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "telegram",
    handle: "@elitex45",
    url: "https://t.me/elitex45",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    label: "website",
    handle: "x45.in",
    url: "https://x45.in",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a14.25 14.25 0 014 9 14.25 14.25 0 01-4 9 14.25 14.25 0 01-4-9 14.25 14.25 0 014-9z" />
      </svg>
    ),
  },
  {
    label: "linkedin",
    handle: "elitex25",
    url: "https://linkedin.com/in/elitex25",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "github",
    handle: "elitex45",
    url: "https://github.com/elitex45",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
];

export function HomePage() {
  const projects = liveProjects;
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Secret game state
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

  // Parallax values for hero content
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <>
      {/* Background layers */}
      <StarField isDark={isDark} />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />
      <div className="orb orb-4" aria-hidden="true" />
      <div className="sunset-sky" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <div className="scan-line" aria-hidden="true" />
      <PageCat isDark={isDark} positionRef={catPositionRef} fedTrigger={fedTrigger} friendly={catFriendly} />
      <SecretGame catPosition={catPositionRef} onFeedCat={handleFeedCat} onPhaseChange={handlePhaseChange} isDark={isDark} />

      {/* Content */}
      <main className="relative z-10 max-w-2xl mx-auto px-6">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="flex justify-between items-center py-8 sticky top-0 z-50"
        >
          <div className="flex items-center gap-2">
            <div className="pulse-dot" />
            <span className="text-xs font-mono text-[var(--muted)]">
              guru / x45.in
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="text-xs font-mono text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              projects →
            </Link>
            <ThemeToggle />
          </div>
        </motion.nav>

        {/* ════════════ Hero ════════════ */}
        <motion.section
          ref={heroRef}
          style={{ y: heroY, opacity: heroOpacity }}
          className="pt-16 pb-20 min-h-[70vh] flex flex-col justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-xs font-mono text-[var(--accent)] mb-4 tracking-widest uppercase"
            >
              &gt; initializing...
            </motion.p>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-sans tracking-tight text-[var(--fg)]">
              <CharacterStagger text="Hi, I'm " delay={0.3} stagger={0.04} />
              <span className="glitch glow-text text-[var(--accent)]" data-text="Guru">
                <CharacterStagger text="Guru" delay={0.6} stagger={0.06} className="text-[var(--accent)]" />
              </span>{" "}
              <motion.span
                className="inline-block"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, delay: 1.2, ease: "easeInOut" }}
              >
                👋
              </motion.span>
            </h1>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-[var(--muted)] font-mono">
                📍 Bengaluru, India
              </span>
              <span className="text-[var(--border)]">·</span>
              <span className="text-sm text-[var(--muted)] font-mono">24</span>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-base text-[var(--fg)] leading-relaxed mb-6 max-w-lg"
            >
              <MagneticText
                text="Co-founder @zerufinance. On-chain intelligence builder. Building at the intersection of crypto and AI — wallet reputation scoring, on-chain behavioral analysis, agent identity."
                strength={8}
                radius={100}
              />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="neon-border pl-4 py-2"
            >
              <p className="text-sm text-[var(--muted)] italic font-mono">
                <Typewriter
                  text='"The only thing more terrifying than the cage is not trying to escape it."'
                  delay={1500}
                  speed={30}
                />
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ════════════ Tech Stack ════════════ */}
        <section className="mb-24">
          <ScrollReveal>
            <div className="section-label">
              <p className="text-xs text-[var(--muted)] uppercase tracking-[0.2em] font-mono">
                <ScrambleText text="stack" speed={35} />
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="flex flex-wrap gap-3">
            {techStack.map((tech) => (
              <StaggerItem key={tech.name}>
                <span
                  className="tech-pill text-xs font-mono px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted)] cursor-default inline-block"
                  style={{
                    ["--pill-color" as string]: tech.color,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = tech.color;
                    el.style.color = tech.color;
                    el.style.boxShadow = `0 0 15px -3px ${tech.color}40`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = "";
                    el.style.color = "";
                    el.style.boxShadow = "";
                  }}
                >
                  {tech.name}
                </span>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ════════════ Projects ════════════ */}
        <section className="mb-24">
          <ScrollReveal>
            <div className="section-label">
              <p className="text-xs text-[var(--muted)] uppercase tracking-[0.2em] font-mono">
                <ScrambleText text="projects" speed={35} />
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="space-y-4">
            {projects.map((p, i) => (
              <ProjectCard key={p.name} {...p} index={i} />
            ))}
          </StaggerContainer>
        </section>

        {/* ════════════ Philosophy ════════════ */}
        <section className="mb-24">
          <ScrollReveal>
            <div className="section-label">
              <p className="text-xs text-[var(--muted)] uppercase tracking-[0.2em] font-mono">
                <ScrambleText text="philosophy" speed={35} />
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="glass-card p-6 space-y-4">
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                I build tools that solve real problems, use AI as leverage not a
                crutch, and ship before I&apos;m ready.
              </p>
              <p className="text-sm font-semibold text-[var(--accent)] glow-text">
                &ldquo;the universe always delivers 🌌&rdquo;
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* ════════════ Connect ════════════ */}
        <section className="mb-24">
          <ScrollReveal>
            <div className="section-label">
              <p className="text-xs text-[var(--muted)] uppercase tracking-[0.2em] font-mono">
                <ScrambleText text="connect" speed={35} />
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {socials.map((s) => (
              <StaggerItem key={s.label}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link glass-card p-4 flex items-center gap-3 group"
                >
                  <span className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                    {s.icon}
                  </span>
                  <div>
                    <p className="text-sm text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                      {s.handle}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
                      {s.label}
                    </p>
                  </div>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ════════════ Footer ════════════ */}
        <ScrollReveal>
          <footer className="pb-12">
            <div className="gradient-line mb-6" />
            <div className="flex justify-between items-center text-xs text-[var(--muted)] font-mono">
              <span>guru · bengaluru · {new Date().getFullYear()}</span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                systems operational
              </span>
            </div>
          </footer>
        </ScrollReveal>
      </main>
    </>
  );
}
