import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SNIPPET = `# Ship notes

Type on the left,
read on the right.

- [x] tables and task lists
- [x] code highlighting
- [ ] export as PDF`;

/** The real markdown pipeline the tool uses, rendering a real snippet. */
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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{SNIPPET}</ReactMarkdown>
      </div>
    </div>
  );
}
