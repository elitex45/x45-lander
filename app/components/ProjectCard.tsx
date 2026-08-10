"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface ProjectCardProps {
  emoji: string;
  name: string;
  url: string;
  sourceUrl?: string;
  desc: string;
  label: string;
  index: number;
}

export function ProjectCard({
  emoji,
  name,
  url,
  sourceUrl,
  desc,
  label,
  index,
}: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouse = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setTilt({ x: y * -8, y: x * 8 });
  };

  const resetTilt = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovering(false);
  };

  const labelColors: Record<string, string> = {
    "writing tool": "text-[var(--cyan)]",
    "focus tool": "text-[var(--accent)]",
    "money tool": "text-[var(--purple)]",
  };

  const labelBorders: Record<string, string> = {
    "writing tool": "border-[var(--cyan)]",
    "focus tool": "border-[var(--accent)]",
    "money tool": "border-[var(--purple)]",
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={(e) => {
        handleMouse(e);
        setIsHovering(true);
      }}
      onMouseLeave={resetTilt}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: isHovering
          ? "transform 0.1s ease-out"
          : "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            delay: index * 0.1,
            ease: [0.23, 1, 0.32, 1],
          },
        },
      }}
      className="glass-card p-6 group"
    >
      <div className="flex items-center justify-between mb-3">
        {url.startsWith("/") ? (
          <Link
            href={url}
            className="flex items-center gap-2 rounded-sm text-base font-semibold text-[var(--fg)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)]"
          >
            <span className="text-sm">{emoji}</span>
            {name}
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
          </Link>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-sm text-base font-semibold text-[var(--fg)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)]"
          >
            <span className="text-sm">{emoji}</span>
            {name}
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
          </a>
        )}
        <span
          className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            labelColors[label] || "text-[var(--muted)]"
          } ${labelBorders[label] || "border-[var(--border)]"} opacity-60`}
        >
          {label}
        </span>
      </div>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
      <div className="mt-5 flex items-center gap-4 border-t border-[var(--border)] pt-4 text-xs font-mono">
        {url.startsWith("/") ? (
          <Link
            href={url}
            className="text-[var(--accent)] transition-colors hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)] rounded-sm"
          >
            open tool →
          </Link>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] transition-colors hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)] rounded-sm"
          >
            open tool ↗
          </a>
        )}
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)] rounded-sm"
          >
            source ↗
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}
