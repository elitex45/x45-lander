export type Category =
  | "food-dining" | "groceries" | "transport" | "housing-rent"
  | "bills-utilities" | "fuel" | "health" | "shopping"
  | "entertainment" | "education" | "travel" | "subscriptions" | "other";

export type PaymentMethod =
  | "upi" | "cash" | "debit-card" | "credit-card" | "bank-transfer" | "other";

export type Expense = {
  id: string;
  amountPaise: number;
  date: string;
  category: Category;
  description: string;
  paymentMethod: PaymentMethod;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export const CATEGORIES: readonly { id: Category; emoji: string; label: string; color: string }[] = [
  { id: "food-dining", emoji: "🍽️", label: "Food & dining", color: "#e76f51" },
  { id: "groceries", emoji: "🛒", label: "Groceries", color: "#2a9d8f" },
  { id: "transport", emoji: "🚕", label: "Transport", color: "#457b9d" },
  { id: "housing-rent", emoji: "🏠", label: "Housing / Rent", color: "#8d5a97" },
  { id: "bills-utilities", emoji: "💡", label: "Bills & utilities", color: "#e9c46a" },
  { id: "fuel", emoji: "⛽", label: "Fuel", color: "#f4a261" },
  { id: "health", emoji: "💊", label: "Health", color: "#ef476f" },
  { id: "shopping", emoji: "🛍️", label: "Shopping", color: "#bc6c25" },
  { id: "entertainment", emoji: "🎬", label: "Entertainment", color: "#6c63ff" },
  { id: "education", emoji: "📚", label: "Education", color: "#3a86ff" },
  { id: "travel", emoji: "✈️", label: "Travel", color: "#00b4d8" },
  { id: "subscriptions", emoji: "🔁", label: "Subscriptions", color: "#8338ec" },
  { id: "other", emoji: "📦", label: "Other / Misc", color: "#6b7280" },
];

export const PAYMENT_METHODS: readonly { id: PaymentMethod; label: string }[] = [
  { id: "upi", label: "UPI" }, { id: "cash", label: "Cash" },
  { id: "debit-card", label: "Debit card" }, { id: "credit-card", label: "Credit card" },
  { id: "bank-transfer", label: "Bank transfer" }, { id: "other", label: "Other" },
];

const categoryIds = new Set(CATEGORIES.map((item) => item.id));
const paymentIds = new Set(PAYMENT_METHODS.map((item) => item.id));
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export const formatINR = (paise: number) => inr.format(paise / 100);
export const paiseToDecimal = (paise: number) => `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
export const categoryMeta = (id: Category) => CATEGORIES.find((item) => item.id === id) ?? CATEGORIES.at(-1)!;
export const paymentLabel = (id: PaymentMethod) => PAYMENT_METHODS.find((item) => item.id === id)?.label ?? "Other";

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export const localMonth = (now = new Date()) => localDate(now).slice(0, 7);

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function isValidMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && isValidDate(`${value}-01`);
}
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return localMonth(new Date(y, m - 1 + delta, 1));
}
export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function parseAmountToPaise(value: string): number | null {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [rupees, fraction = ""] = normalized.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null;
}

function integer(value: unknown, positive = false): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && (positive ? value > 0 : value >= 0);
}

export function validateExpense(value: unknown, index?: number): { ok: true; expense: Expense } | { ok: false; error: string } {
  const prefix = index === undefined ? "Expense" : `Row ${index + 1}`;
  if (!value || typeof value !== "object") return { ok: false, error: `${prefix} is not an object.` };
  const item = value as Partial<Expense>;
  if (typeof item.id !== "string" || !item.id || item.id.length > 100) return { ok: false, error: `${prefix}: invalid id.` };
  if (!integer(item.amountPaise, true)) return { ok: false, error: `${prefix}: amountPaise must be a positive safe integer.` };
  if (!isValidDate(item.date)) return { ok: false, error: `${prefix}: invalid local date.` };
  if (item.date > localDate()) return { ok: false, error: `${prefix}: future expense dates are not allowed.` };
  if (!categoryIds.has(item.category as Category)) return { ok: false, error: `${prefix}: invalid category.` };
  if (typeof item.description !== "string" || !item.description.trim() || item.description.trim().length > 120) return { ok: false, error: `${prefix}: description must be 1–120 characters.` };
  if (!paymentIds.has(item.paymentMethod as PaymentMethod)) return { ok: false, error: `${prefix}: invalid payment method.` };
  if (typeof item.note !== "string" || item.note.length > 500) return { ok: false, error: `${prefix}: note must be at most 500 characters.` };
  if (!integer(item.createdAt) || !integer(item.updatedAt) || item.createdAt > item.updatedAt) return { ok: false, error: `${prefix}: invalid timestamps.` };
  return { ok: true, expense: { ...(item as Expense), description: item.description.trim(), note: item.note.trim() } };
}

export type Backup = { schema: "x45-expense-tracker"; version: 1; currency: "INR"; exportedAt: string; expenses: Expense[] };
export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; errors: string[] } {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { ok: false, errors: ["The file is not valid JSON."] }; }
  if (!value || typeof value !== "object") return { ok: false, errors: ["The backup must be an object."] };
  const doc = value as Partial<Backup>;
  if (doc.schema !== "x45-expense-tracker" || doc.version !== 1 || doc.currency !== "INR" || typeof doc.exportedAt !== "string" || !Number.isFinite(Date.parse(doc.exportedAt)) || !Array.isArray(doc.expenses)) return { ok: false, errors: ["Unsupported backup marker, version, currency, timestamp, or expenses list."] };
  if (doc.expenses.length > 10_000) return { ok: false, errors: ["Backups may contain at most 10,000 expenses."] };
  const expenses: Expense[] = []; const errors: string[] = []; const ids = new Set<string>(); let total = 0;
  doc.expenses.forEach((item, index) => {
    const result = validateExpense(item, index);
    if (!result.ok) { if (errors.length < 20) errors.push(result.error); return; }
    if (ids.has(result.expense.id)) { if (errors.length < 20) errors.push(`Row ${index + 1}: duplicate id.`); return; }
    ids.add(result.expense.id); total += result.expense.amountPaise;
    if (!Number.isSafeInteger(total) && errors.length < 20) errors.push("The imported total exceeds the safe integer limit.");
    expenses.push(result.expense);
  });
  return errors.length ? { ok: false, errors } : { ok: true, backup: { schema: "x45-expense-tracker", version: 1, currency: "INR", exportedAt: doc.exportedAt, expenses } };
}

export type MergeReport = { expenses: Expense[]; inserted: number; updated: number; unchanged: number; conflicts: number };
export function mergeExpenses(local: Expense[], incoming: Expense[]): MergeReport {
  const map = new Map(local.map((expense) => [expense.id, expense]));
  let inserted = 0, updated = 0, unchanged = 0, conflicts = 0;
  for (const expense of incoming) {
    const existing = map.get(expense.id);
    if (!existing) { map.set(expense.id, expense); inserted++; continue; }
    if (JSON.stringify(existing) === JSON.stringify(expense)) { unchanged++; continue; }
    if (expense.updatedAt > existing.updatedAt) { map.set(expense.id, expense); updated++; }
    else if (expense.updatedAt < existing.updatedAt) unchanged++;
    else conflicts++;
  }
  return { expenses: [...map.values()], inserted, updated, unchanged, conflicts };
}

export function safeTotal(expenses: Expense[]) {
  let total = 0;
  for (const expense of expenses) { total += expense.amountPaise; if (!Number.isSafeInteger(total)) return null; }
  return total;
}

export type MonthSummary = ReturnType<typeof summarizeMonth>;
export function summarizeMonth(expenses: Expense[], month: string, today = localDate()) {
  const rows = expenses.filter((expense) => expense.date.startsWith(month));
  const total = safeTotal(rows) ?? 0;
  const count = rows.length;
  const priorRows = expenses.filter((expense) => expense.date.startsWith(shiftMonth(month, -1)));
  const previousTotal = safeTotal(priorRows) ?? 0;
  const current = month === today.slice(0, 7);
  const elapsedDays = current ? Number(today.slice(8, 10)) : daysInMonth(month);
  const byCategory = CATEGORIES.map((category) => ({ ...category, amount: rows.filter((row) => row.category === category.id).reduce((sum, row) => sum + row.amountPaise, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const byPayment = PAYMENT_METHODS.map((method) => ({ ...method, amount: rows.filter((row) => row.paymentMethod === method.id).reduce((sum, row) => sum + row.amountPaise, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const dayCount = daysInMonth(month); const daily = Array.from({ length: dayCount }, (_, i) => ({ day: i + 1, amount: rows.filter((row) => Number(row.date.slice(8, 10)) === i + 1).reduce((sum, row) => sum + row.amountPaise, 0) }));
  const merchantMap = new Map<string, number>(); rows.forEach((row) => merchantMap.set(row.description, (merchantMap.get(row.description) ?? 0) + row.amountPaise));
  const topMerchants = [...merchantMap].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const consideredDays = current ? elapsedDays : dayCount;
  const highestDay = [...daily].sort((a, b) => b.amount - a.amount)[0];
  return { month, rows, total, count, averagePerDay: consideredDays ? Math.round(total / consideredDays) : 0, previousTotal, changePercent: previousTotal ? ((total - previousTotal) / previousTotal) * 100 : null, largest: rows.reduce<Expense | null>((max, row) => !max || row.amountPaise > max.amountPaise ? row : max, null), byCategory, byPayment, daily, topMerchants, highestDay: highestDay?.amount ? highestDay : null, noSpendDays: daily.slice(0, consideredDays).filter((day) => day.amount === 0).length };
}
