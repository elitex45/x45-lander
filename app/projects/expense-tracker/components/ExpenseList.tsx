import { categoryMeta, formatINR, paymentLabel, type Expense } from "../lib/model";
import styles from "../expense-tracker.module.css";

type Props = { expenses: Expense[]; onEdit: (expense: Expense) => void; onDelete: (expense: Expense) => void };
export function ExpenseList({ expenses, onEdit, onDelete }: Props) {
  const groups = new Map<string, Expense[]>();
  expenses.forEach((expense) => groups.set(expense.date, [...(groups.get(expense.date) ?? []), expense]));
  if (!expenses.length) return <div className={styles.emptyState}><strong>No matching expenses</strong><p>Add one or adjust the filters.</p></div>;
  return <div className={styles.expenseGroups}>{[...groups].map(([date, rows]) => <section key={date} className={styles.dateGroup} aria-labelledby={`date-${date}`}><header><h3 id={`date-${date}`}>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</h3><span>{formatINR(rows.reduce((sum, row) => sum + row.amountPaise, 0))}</span></header><ul>{rows.map((expense) => { const category = categoryMeta(expense.category); return <li key={expense.id}><span className={styles.categoryEmoji} aria-hidden="true">{category.emoji}</span><div className={styles.expenseMain}><strong>{expense.description}</strong><span>{category.label} · {paymentLabel(expense.paymentMethod)}{expense.note ? ` · ${expense.note}` : ""}</span></div><strong className={styles.rowAmount}>{formatINR(expense.amountPaise)}</strong><div className={styles.rowActions}><button type="button" onClick={() => onEdit(expense)}>Edit</button><button type="button" onClick={() => onDelete(expense)}>Delete</button></div></li>; })}</ul></section>)}</div>;
}
