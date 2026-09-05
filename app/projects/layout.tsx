import type { ReactNode } from "react";
import { SiteNav } from "../components/SiteNav";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="lamp" aria-hidden="true" />
      <SiteNav current="tools" />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
