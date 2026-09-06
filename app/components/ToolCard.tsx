"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { motion } from "framer-motion";
import Link from "next/link";
import type { PointerEvent } from "react";
import { track as trackEvent } from "../lib/analytics";
import { isExternal, KIND_LABEL, type Tool } from "../lib/tools";

/** Move the card's spotlight to the pointer. Writes CSS vars, no re-render. */
function track(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

interface ToolCardProps {
  tool: Tool;
  className?: string;
  /** Show the kind badge (hidden when every card in the row is the same kind). */
  badge?: boolean;
}

export function ToolCard({ tool, className = "", badge = true }: ToolCardProps) {
  const external = isExternal(tool.href);
  // Web apps open directly; everything else gets its own page on this site.
  const target = external ? `/tools/${tool.slug}` : tool.href;
  const inner = (
    <>
      <div className="tool-preview" aria-hidden="true">
        {tool.preview ?? (
          <div className="flex h-full items-center justify-center px-6 text-center font-mono text-xs text-[var(--muted)]">
            {KIND_LABEL[tool.kind]}
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-[var(--fg)]">
            {tool.name}
          </h3>
          <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
            {tool.desc}
          </p>
          {badge && (
            <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
              {KIND_LABEL[tool.kind]}
            </p>
          )}
        </div>
        <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
          <ArrowUpRightIcon size={15} weight="bold" aria-hidden="true" />
        </span>
      </div>
    </>
  );

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 120, damping: 18 },
        },
      }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      className={className}
    >
      <Link
        href={target}
        className="tool-card group h-full"
        onPointerMove={track}
        onClick={() => trackEvent("tool_opened", { slug: tool.slug, kind: tool.kind, target })}
      >
        {inner}
      </Link>
    </motion.div>
  );
}
