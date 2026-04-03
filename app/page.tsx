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