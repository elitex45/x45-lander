"use client";

import { CheckIcon, CopyIcon, HeartIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "../lib/analytics";

/** One address, every EVM chain. */
export const TIP_ADDRESS = "0xD8D10a060FC972177702F649eAAb3BB2C3E08652";
const CHAINS = ["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BSC"];

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function ThankMe({ variant = "pill" }: { variant?: "pill" | "link" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portals need document.body, which only exists after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TIP_ADDRESS);
      track("tip_address_copied");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; the address is still selectable */
    }
  };

  const trigger =
    variant === "pill" ? (
      <button
        type="button"
        onClick={() => {
          track("thank_me_opened", { from: "nav" });
          setOpen(true);
        }}
        className="btn-glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      >
        <HeartIcon size={14} weight="fill" className="text-[var(--accent)]" aria-hidden="true" />
        <span className="font-mono">thank me</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => {
          track("thank_me_opened", { from: "footer" });
          setOpen(true);
        }}
        className="transition-colors hover:text-[var(--accent)]"
      >
        Send crypto
      </button>
    );

  const modal = (
    <AnimatePresence>
      {open && (
        <m.div
          key="tip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: "color-mix(in srgb, var(--bg) 70%, transparent)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tip-title"
        >
          <m.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="glass relative w-full max-w-md rounded-3xl p-6 sm:p-7"
            style={{ background: "var(--glass-strong)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--accent-dim)] hover:text-[var(--fg)]"
              aria-label="Close"
            >
              <XIcon size={16} aria-hidden="true" />
            </button>

            <p className="font-mono text-xs text-[var(--muted)]">tip jar</p>
            <h2
              id="tip-title"
              className="glow-text mt-2 text-2xl font-semibold tracking-tight text-[var(--accent)]"
            >
              Send me all your crypto.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Or a little. Every tool here is free forever. Tips buy the coffee
              that makes the next one.
            </p>

            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <p className="font-mono text-[11px] text-[var(--muted)]">
                any EVM chain
              </p>
              <p className="mt-1.5 select-all break-all font-mono text-[13px] leading-relaxed text-[var(--fg)]">
                {TIP_ADDRESS}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {CHAINS.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={copy}
              className="btn-glow mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              {copied ? (
                <>
                  <CheckIcon size={16} weight="bold" aria-hidden="true" />
                  Copied {short(TIP_ADDRESS)}
                </>
              ) : (
                <>
                  <CopyIcon size={16} weight="bold" aria-hidden="true" />
                  Copy address
                </>
              )}
            </button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {trigger}
      {mounted && createPortal(modal, document.body)}
    </>
  );
}
