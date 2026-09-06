import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";

// A miniature of the inbox: an address, a timer, two mails.
export function TempMailPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-5 py-4 text-[11px]">
      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
        <span className="font-mono text-[var(--fg)]">alex@x45.in</span>
        <span className="font-mono text-[var(--accent)]">7:42 left</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--accent-dim)]">
        <div className="h-full w-[74%] rounded-full bg-[var(--accent)]" />
      </div>
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--bg)]">
        {[
          ["GitHub", "Your verification code is 482913"],
          ["Figma", "Confirm your email"],
        ].map(([from, subject]) => (
          <li key={from} className="flex items-center gap-2 px-3 py-2">
            <EnvelopeSimpleIcon size={12} className="text-[var(--accent)]" aria-hidden="true" />
            <span className="w-14 truncate font-medium text-[var(--fg)]">{from}</span>
            <span className="truncate text-[var(--muted)]">{subject}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
