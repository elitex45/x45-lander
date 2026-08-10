import { FormEvent, useState } from "react";
import type { Todo } from "../lib/types";
import styles from "../pomodoro.module.css";

type Props = {
  todos: Todo[];
  activeTaskId: string | null;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onSetActive: (id: string) => void;
  onDelete: (id: string) => void;
};

type TaskRowProps = Omit<Props, "todos" | "onAdd"> & { todo: Todo };

function TaskRow({
  todo,
  activeTaskId,
  onToggle,
  onSetActive,
  onDelete,
}: TaskRowProps) {
  const isActive = todo.id === activeTaskId;
  return (
    <li className={styles.taskRow} data-current={isActive || undefined}>
      <button
        type="button"
        className={styles.checkButton}
        onClick={() => onToggle(todo.id)}
        aria-label={todo.done ? `Reopen ${todo.text}` : `Complete ${todo.text}`}
        aria-pressed={todo.done}
      >
        <span aria-hidden="true">{todo.done ? "✓" : ""}</span>
      </button>
      <div className={styles.taskTextWrap}>
        <span className={styles.taskText} data-done={todo.done || undefined}>
          {todo.text}
        </span>
        {todo.pomodoros > 0 && (
          <span className={styles.taskCount}>
            {todo.pomodoros} {todo.pomodoros === 1 ? "focus" : "focuses"}
          </span>
        )}
      </div>
      {!todo.done && (
        <button
          type="button"
          className={styles.currentButton}
          aria-pressed={isActive}
          onClick={() => onSetActive(todo.id)}
        >
          {isActive ? "Current" : "Set current"}
        </button>
      )}
      <button
        type="button"
        className={styles.deleteButton}
        onClick={() => onDelete(todo.id)}
        aria-label={`Delete ${todo.text}`}
      >
        Delete
      </button>
    </li>
  );
}

export function TodoList(props: Props) {
  const { todos, activeTaskId, onAdd, onToggle, onSetActive, onDelete } = props;
  const [input, setInput] = useState("");
  const open = todos.filter((todo) => !todo.done);
  const completed = todos.filter((todo) => todo.done);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    onAdd(text);
    setInput("");
  };

  return (
    <section className={styles.taskPanel} aria-labelledby="tasks-heading">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="tasks-heading">Tasks</h2>
          <p>Choose one task for the next focus.</p>
        </div>
        <span>{open.length} open</span>
      </div>

      <form className={styles.taskForm} onSubmit={submit}>
        <label htmlFor="pomodoro-task">New task</label>
        <div>
          <input
            id="pomodoro-task"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What needs your attention?"
            maxLength={180}
          />
          <button type="submit">Add</button>
        </div>
      </form>

      <div className={styles.taskScroll}>
        {open.length === 0 ? (
          <p className={styles.emptyTasks}>Nothing waiting. Add a task when needed.</p>
        ) : (
          <ul className={styles.taskList}>
            {open.map((todo) => (
              <TaskRow
                key={todo.id}
                todo={todo}
                activeTaskId={activeTaskId}
                onToggle={onToggle}
                onSetActive={onSetActive}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}

        {completed.length > 0 && (
          <details className={styles.completedTasks}>
            <summary>Completed ({completed.length})</summary>
            <ul className={styles.taskList}>
              {completed.map((todo) => (
                <TaskRow
                  key={todo.id}
                  todo={todo}
                  activeTaskId={activeTaskId}
                  onToggle={onToggle}
                  onSetActive={onSetActive}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
