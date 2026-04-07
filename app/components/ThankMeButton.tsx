"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ADDRESS = "0xD8D10a060FC972177702F649eAAb3BB2C3E08652";

export function ThankMeButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Wait for client mount before portalling — document.body isn't there
  // during SSR.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const modal =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setOpen(false)}
      >
        <div
          className="relative p-6 max-w-md w-full rounded-2xl border border-[var(--border)]"
          style={{
            backgroundColor: "var(--bg)",
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.6), 0 0 60px -10px var(--accent-glow)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 text-[var(--muted)] hover:text-[var(--fg)] text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>

          <div className="mb-4 pr-6">
            <h2 className="text-lg font-bold text-[var(--accent)] glow-text">
              send me all your crypto
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
              supports every evm chain — eth, base, arbitrum, optimism, bsc,
              polygon, you name it.
            </p>
          </div>

          <div
            className="border border-[var(--border)] rounded p-3 break-all text-[11px] font-mono text-[var(--fg)] mb-3 select-all"
            style={{ backgroundColor: "var(--accent-dim)" }}
          >
            {ADDRESS}
          </div>

          <button
            onClick={copy}
            className="w-full py-2 border border-[var(--accent)] text-[var(--accent)] rounded hover:bg-[var(--accent-dim)] transition uppercase tracking-wider text-xs font-mono"
          >
            {copied ? "copied ✓" : "copy address"}
          </button>

          <p className="text-[10px] text-[var(--muted)] mt-3 text-center italic">
            this tool is free forever. tips fund more free tools.
          </p>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-mono px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
      >
        thank me
      </button>
      {modal && createPortal(modal, document.body)}
    </>
  );
}
