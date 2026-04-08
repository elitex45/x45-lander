"use client";

import { ChangeEvent, Ref, UIEvent, useMemo } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onScroll?: (e: UIEvent<HTMLTextAreaElement>) => void;
  onMouseEnter?: () => void;
};

export function MarkdownEditor({
  value,
  onChange,
  textareaRef,
  onScroll,
  onMouseEnter,
}: Props) {
  const stats = useMemo(() => {
    const chars = value.length;
    const words = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
    const lines = value === "" ? 0 : value.split("\n").length;
    return { chars, words, lines };
  }, [value]);

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase">
            &gt; markdown
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--muted)] tabular-nums">
          <span>{stats.lines} lines</span>
          <span className="text-[var(--border)]">·</span>
          <span>{stats.words} words</span>
          <span className="text-[var(--border)]">·</span>
          <span>{stats.chars} chars</span>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onScroll={onScroll}
        onMouseEnter={onMouseEnter}
        spellCheck={false}
        placeholder="# Start typing your markdown here..."
        className="flex-1 w-full resize-none bg-transparent px-4 py-4 text-sm leading-relaxed text-[var(--fg)] placeholder:text-[var(--muted)] outline-none font-mono"
      />
    </div>
  );
}
