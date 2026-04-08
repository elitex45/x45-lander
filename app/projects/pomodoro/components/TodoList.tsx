"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import type { Todo } from "../lib/types";

type Props = {
  todos: Todo[];
  activeTaskId: string | null;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onSetActive: (id: string) => void;
  onDelete: (id: string) => void;
};

export function TodoList({
  todos,
  activeTaskId,
  onAdd,
  onToggle,
  onSetActive,
  onDelete,
}: Props) {
  const [input, setInput] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    onAdd(t);
    setInput("");
  };

  const openCount = todos.filter((t) => !t.done).length;

  return (
    <div className="glass-card flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase">
          &gt; tasks
        </span>
        <span className="text-[10px] font-mono text-[var(--muted)] tabular-nums">
          {openCount} open · {todos.length} total
        </span>
      </div>

      <form
        onSubmit={submit}
        className="px-4 py-3 border-b border-[var(--border)]"
      >
        <input
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          placeholder="What do you need to focus on?"
          className="w-full bg-transparent text-sm text-[var(--fg)] placeholder:text-[var(--muted)] outline-none"
        />
      </form>

      <div className="flex flex-col">
        {todos.length === 0 ? (
          <p className="px-4 py-8 text-xs text-[var(--muted)] text-center font-mono">
            No tasks yet. Add one above to get started.
          </p>
        ) : (
          todos.map((todo) => {
            const isActive = todo.id === activeTaskId;
            return (
              <div
                key={todo.id}
                className="group flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0 transition-colors"
                style={{
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--accent) 6%, transparent)"
                    : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggle(todo.id)}
                  aria-label={todo.done ? "Mark as not done" : "Mark as done"}
                  className="w-4 h-4 rounded-full border flex-shrink-0 transition-colors flex items-center justify-center"
                  style={{
                    backgroundColor: todo.done
                      ? "var(--accent)"
                      : "transparent",
                    borderColor: todo.done
                      ? "var(--accent)"
                      : "var(--muted)",
                  }}
                >
                  {todo.done && (
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="var(--bg)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="2,5 4,7 8,3" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => !todo.done && onSetActive(todo.id)}
                  className={`flex-1 text-left text-sm transition-colors ${
                    todo.done
                      ? "line-through text-[var(--muted)] cursor-default"
                      : isActive
                        ? "text-[var(--accent)] font-medium"
                        : "text-[var(--fg)] hover:text-[var(--accent)]"
                  }`}
                >
                  {todo.text}
                </button>
                {todo.pomodoros > 0 && (
                  <span
                    className="text-[10px] font-mono text-[var(--accent)] tabular-nums tracking-tighter"
                    title={`${todo.pomodoros} pomodoros completed on this task`}
                  >
                    {"●".repeat(Math.min(todo.pomodoros, 5))}
                    {todo.pomodoros > 5 && (
                      <span className="ml-0.5 text-[var(--muted)]">
                        +{todo.pomodoros - 5}
                      </span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(todo.id)}
                  aria-label="Delete task"
                  className="text-[var(--muted)] hover:text-red-400 transition-colors px-1 opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-[var(--border)]">
        <p className="text-[10px] font-mono text-[var(--muted)] tracking-widest uppercase">
          click a task to make it active
        </p>
      </div>
    </div>
  );
}
