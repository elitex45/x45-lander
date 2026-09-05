// A miniature of the extension popup and the zip it produces.
const USERS = ["naval", "paulg", "elonmusk"];

export function TweetExporterPreview() {
  return (
    <div className="grid h-full grid-cols-2 gap-3 px-4 py-4 text-[11px]">
      <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
        <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
          Usernames
        </p>
        <pre className="m-0 flex-1 font-mono leading-5 text-[var(--fg)]">
          {USERS.map((u) => `@${u}`).join("\n")}
        </pre>
        <div className="flex items-center justify-between">
          <span className="text-[var(--muted)]">Posts only</span>
          <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 font-medium text-[var(--accent-fg)]">
            Start
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-between">
        <pre className="m-0 font-mono leading-5 text-[var(--muted)]">
          <span className="text-[var(--fg)]">x_export_3.zip</span>
          {"\n"}
          {USERS.map((u) => `├─ ${u}.json`).join("\n")}
          {"\n└─ _summary.json"}
        </pre>
        <div className="mt-2 flex items-center gap-2 text-[10px]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <span className="text-[var(--muted)]">rate limit: waiting 04:12</span>
        </div>
      </div>
    </div>
  );
}
