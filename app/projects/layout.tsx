import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "../components/ThemeToggle";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />
      <div className="orb orb-4" aria-hidden="true" />
      <div className="sunset-sky" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <div className="scan-line" aria-hidden="true" />

      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>guru / x45.in</span>
          <span className="text-[var(--border)]">/</span>
          <span className="text-[var(--accent)]">projects</span>
        </Link>
        <ThemeToggle />
      </nav>

      <main className="relative z-10">{children}</main>
    </div>
  );
}
