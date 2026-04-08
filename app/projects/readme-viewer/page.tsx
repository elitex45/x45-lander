"use client";

import { UIEvent, useCallback, useEffect, useRef, useState } from "react";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { load, save, clear } from "./lib/storage";
import { SAMPLE_README } from "./lib/sample";
import { randomDocumentName } from "./lib/randomName";

export default function ReadmeViewerPage() {
  // Start empty on the server, hydrate from localStorage on the client.
  // This avoids a hydration mismatch between server-rendered HTML and
  // whatever the user's last draft was.
  const [content, setContent] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [editorHidden, setEditorHidden] = useState(false);

  useEffect(() => {
    const stored = load();
    setContent(stored ?? SAMPLE_README);
    setHydrated(true);
  }, []);

  // Debounced persist — same pattern as perps-replay so a fast typist
  // doesn't hammer localStorage on every keystroke.
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      save(content);
    }, 250);
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, [content, hydrated]);

  // ───── Synchronized scroll ─────
  // Whichever side the cursor is hovering becomes the "leader" and drives
  // the other. This avoids the classic feedback-loop problem where each
  // side fires the other's onScroll forever. Mouse-enter swaps leadership.
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<"editor" | "preview">("editor");

  const setEditorLeader = useCallback(() => {
    leaderRef.current = "editor";
  }, []);
  const setPreviewLeader = useCallback(() => {
    leaderRef.current = "preview";
  }, []);

  const ratio = (el: HTMLElement): number => {
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return 0;
    return el.scrollTop / max;
  };

  const handleEditorScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    if (leaderRef.current !== "editor") return;
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const r = ratio(e.currentTarget);
    const max = previewEl.scrollHeight - previewEl.clientHeight;
    previewEl.scrollTop = r * max;
  }, []);

  const handlePreviewScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (leaderRef.current !== "preview") return;
    const editorEl = editorRef.current;
    if (!editorEl) return;
    const r = ratio(e.currentTarget);
    const max = editorEl.scrollHeight - editorEl.clientHeight;
    editorEl.scrollTop = r * max;
  }, []);

  // ───── PDF export with random filename ─────
  // Browsers use document.title to pre-fill the "Save as PDF" filename in
  // the print dialog. We swap the title in for the duration of the print
  // and restore it afterwards via the `afterprint` event.
  const handleExport = useCallback(() => {
    const docName = randomDocumentName();
    const originalTitle = document.title;
    document.title = docName;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }, []);

  const handleReset = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Reset to the sample readme? Your draft will be lost.")
    ) {
      return;
    }
    clear();
    setContent(SAMPLE_README);
  }, []);

  const handleClear = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Clear the editor? Your draft will be lost.")
    ) {
      return;
    }
    clear();
    setContent("");
  }, []);

  const toggleEditor = useCallback(() => {
    setEditorHidden((h) => !h);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 print:max-w-none print:px-0 print:pb-0">
      <header className="mb-6 mt-2 print:hidden">
        <p className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase mb-2">
          &gt; ./projects/readme-viewer
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fg)]">
              Readme Viewer
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
              Type markdown on the left, see it rendered on the right, export
              to PDF when you&apos;re done. Drafts persist in your browser.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleEditor}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors"
              title={editorHidden ? "Show the editor" : "Hide the editor and view preview full-width"}
            >
              {editorHidden ? "show editor ◧" : "hide editor ▭"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors"
            >
              clear
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors"
            >
              load sample
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
            >
              export pdf ↓
            </button>
          </div>
        </div>
      </header>

      <div
        className={`grid grid-cols-1 gap-4 h-[calc(100vh-200px)] min-h-[600px] print:block print:h-auto print:min-h-0 ${
          editorHidden ? "" : "lg:grid-cols-2"
        }`}
      >
        {!editorHidden && (
          <div className="min-h-0 print:hidden">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              textareaRef={editorRef}
              onScroll={handleEditorScroll}
              onMouseEnter={setEditorLeader}
            />
          </div>
        )}
        <div className="min-h-0 print:min-h-0">
          <MarkdownPreview
            content={content}
            scrollRef={previewRef}
            onScroll={handlePreviewScroll}
            onMouseEnter={setPreviewLeader}
          />
        </div>
      </div>
    </div>
  );
}
