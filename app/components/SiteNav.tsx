import Link from "next/link";
import {
  GithubLogoIcon,
  TelegramLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ThemeToggle } from "./ThemeToggle";

const iconLink =
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

/**
 * One nav for every page. On tool pages `current` adds a breadcrumb so the
 * way back home is always one click.
 */
export function SiteNav({ current }: { current?: string }) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border)] backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg) 82%, transparent)",
      }}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"
      >
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-sm font-semibold tracking-tight text-[var(--fg)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg)]"
          >
            elitex45
          </Link>
          {current ? (
            <>
              <span className="text-[var(--muted)]" aria-hidden="true">
                /
              </span>
              <span className="truncate font-mono text-xs text-[var(--muted)]">
                {current}
              </span>
            </>
          ) : (
            <span className="hidden font-mono text-xs text-[var(--muted)] sm:inline">
              / workshop
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="https://github.com/elitex45"
            target="_blank"
            rel="noopener noreferrer"
            className={iconLink}
            aria-label="GitHub"
          >
            <GithubLogoIcon size={18} aria-hidden="true" />
          </a>
          <a
            href="https://t.me/elitex45"
            target="_blank"
            rel="noopener noreferrer"
            className={iconLink}
            aria-label="Telegram"
          >
            <TelegramLogoIcon size={18} aria-hidden="true" />
          </a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
