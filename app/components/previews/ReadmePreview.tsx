const SNIPPET = `# Ship notes

Type on the left,
read on the right.

- [x] tables and task lists
- [x] code highlighting
- [ ] export as PDF`;

/**
 * Hand-rendered miniature of the same snippet. The real tool uses
 * react-markdown; the card does not, so the home page skips 138 KB of it.
 */
export function ReadmePreview() {
  return (
    <div
      className="grid h-full grid-cols-2 divide-x divide-[var(--border)] text-[11px] leading-relaxed"
      aria-label="Markdown on the left, rendered document on the right"
    >
      <pre className="m-0 overflow-hidden whitespace-pre-wrap px-4 py-4 font-mono text-[var(--muted)]">
        {SNIPPET}
      </pre>
      <div className="readme-prose readme-prose-mini overflow-hidden px-4 py-4">
        <h1>Ship notes</h1>
        <p>Type on the left, read on the right.</p>
        <ul className="contains-task-list">
          <li className="task-list-item">
            <input type="checkbox" checked disabled readOnly /> tables and task lists
          </li>
          <li className="task-list-item">
            <input type="checkbox" checked disabled readOnly /> code highlighting
          </li>
          <li className="task-list-item">
            <input type="checkbox" disabled readOnly /> export as PDF
          </li>
        </ul>
      </div>
    </div>
  );
}
