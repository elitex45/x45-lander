import { FingerprintIcon, PaperclipIcon } from "@phosphor-icons/react/dist/ssr";

// A miniature of the menu bar dropdown: recent clips, locked behind Touch ID.
const CLIPS = [
  "npm run build",
  "https://x45.in/projects/pomodoro",
  "Meeting moved to 4pm, same room",
  "sk-…redacted",
];

export function CopyClipPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-4 text-[11px]">
      <div className="w-full max-w-[260px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <PaperclipIcon size={12} aria-hidden="true" />
            CopyClip
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--accent)]">
            <FingerprintIcon size={12} aria-hidden="true" />
            unlocked 0:42
          </span>
        </div>
        <ul className="divide-y divide-[var(--border)] font-mono">
          {CLIPS.map((c, i) => (
            <li
              key={c}
              className={`truncate px-3 py-1.5 ${
                i === 0
                  ? "bg-[var(--accent-dim)] text-[var(--fg)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {c}
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--border)] px-3 py-1.5 text-[10px] text-[var(--muted)]">
          AES-256, encrypted at rest
        </div>
      </div>
    </div>
  );
}
