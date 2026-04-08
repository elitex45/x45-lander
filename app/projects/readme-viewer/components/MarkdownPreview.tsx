"use client";

import { Ref, UIEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type Props = {
  content: string;
  scrollRef?: Ref<HTMLDivElement>;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
};

// The preview lives inside .glass-card on screen but pops out as a clean
// document when printing. The print-only header + footer are rendered here
// so that everything that ends up in the PDF is owned by this component.
export function MarkdownPreview({
  content,
  scrollRef,
  onScroll,
  onMouseEnter,
}: Props) {
  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] print:hidden">
        <span className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase">
          &gt; preview
        </span>
        <span className="text-[10px] font-mono text-[var(--muted)]">
          rendered live
        </span>
      </div>
      <div
        id="readme-print-area"
        ref={scrollRef}
        onScroll={onScroll}
        onMouseEnter={onMouseEnter}
        className="flex-1 overflow-y-auto px-6 py-6 print:overflow-visible print:p-0"
      >
        <article className="readme-prose max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </article>

        {/* Print-only footer — only ever visible in the PDF export */}
        <footer className="hidden print:block readme-print-footer">
          <div className="readme-print-footer-line" />
          <p>
            Exported from <strong>x45.in</strong>
          </p>
        </footer>
      </div>
    </div>
  );
}
