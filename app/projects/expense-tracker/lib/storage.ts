import { localDate, paiseToDecimal, safeTotal, validateExpense, type Backup, type Expense } from "./model";

const KEY = "x45.expense-tracker.v1";
type Stored = { v: 1; currency: "INR"; expenses: Expense[]; updatedAt: number };

export function loadStored(): { expenses: Expense[]; error: string | null } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { expenses: [], error: null };
    const doc = JSON.parse(raw) as Stored;
    if (doc.v !== 1 || doc.currency !== "INR" || !Array.isArray(doc.expenses)) return { expenses: [], error: "Stored expense data has an unsupported format." };
    const expenses: Expense[] = []; const ids = new Set<string>();
    for (let index = 0; index < doc.expenses.length; index++) {
      const checked = validateExpense(doc.expenses[index], index);
      if (!checked.ok || ids.has(checked.expense.id)) return { expenses: [], error: "Stored expense data failed validation. Import a known-good backup to recover." };
      ids.add(checked.expense.id); expenses.push(checked.expense);
    }
    if (safeTotal(expenses) === null) return { expenses: [], error: "Stored expense totals exceed the safe integer limit." };
    return { expenses, error: null };
  } catch { return { expenses: [], error: "Could not read expenses from browser storage." }; }
}

export function saveStored(expenses: Expense[]): { ok: true } | { ok: false; error: string } {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, currency: "INR", expenses, updatedAt: Date.now() } satisfies Stored)); return { ok: true }; }
  catch { return { ok: false, error: "Could not save to browser storage. Export a backup and check storage permissions or quota." }; }
}

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export function exportJSON(expenses: Expense[]) {
  const backup: Backup = { schema: "x45-expense-tracker", version: 1, currency: "INR", exportedAt: new Date().toISOString(), expenses };
  download(JSON.stringify(backup, null, 2), "application/json", `expense-tracker-${localDate()}.json`);
}

const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
export function exportCSV(expenses: Expense[], month: string) {
  const header = ["id","date","amountPaise","amountINR","category","description","paymentMethod","note","createdAt","updatedAt"];
  const rows = expenses.filter((expense) => expense.date.startsWith(month)).map((expense) => [expense.id, expense.date, expense.amountPaise, paiseToDecimal(expense.amountPaise), expense.category, expense.description, expense.paymentMethod, expense.note, expense.createdAt, expense.updatedAt]);
  download([header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n"), "text/csv;charset=utf-8", `expenses-${month}.csv`);
}
