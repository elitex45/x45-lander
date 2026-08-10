"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DataDialog } from "./components/DataDialog";
import { ExpenseForm, type ExpenseInput } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { Summary } from "./components/Summary";
import { CATEGORIES, PAYMENT_METHODS, formatINR, localMonth, mergeExpenses, safeTotal, shiftMonth, summarizeMonth, type Category, type Expense, type PaymentMethod } from "./lib/model";
import { loadStored, saveStored } from "./lib/storage";
import styles from "./expense-tracker.module.css";

const id = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `e-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function ExpenseTrackerApp() {
  const [expenses, setExpenses] = useState<Expense[]>([]); const [hydrated, setHydrated] = useState(false);
  const [month, setMonth] = useState(localMonth()); const [tab, setTab] = useState<"transactions" | "summary">("transactions");
  const [editing, setEditing] = useState<Expense | null>(null); const [message, setMessage] = useState("");
  const [query, setQuery] = useState(""); const [category, setCategory] = useState<Category | "all">("all");
  const [payment, setPayment] = useState<PaymentMethod | "all">("all"); const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const formHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const loaded = loadStored();
    // Hydrate browser-only persisted data after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpenses(loaded.expenses); setMessage(loaded.error ?? ""); setHydrated(true);
  }, []);

  const commit = (next: Expense[], success: string) => {
    if (safeTotal(next) === null) { setMessage("The expense total exceeds the safe storage limit."); return false; }
    const saved = saveStored(next); if (!saved.ok) { setMessage(saved.error); return false; }
    setExpenses(next); setMessage(success); return true;
  };
  const submit = (input: ExpenseInput) => {
    const now = Date.now();
    const revealSavedRow = () => { setMonth(input.date.slice(0, 7)); if (category !== "all" && category !== input.category) setCategory("all"); if (payment !== "all" && payment !== input.paymentMethod) setPayment("all"); if (query.trim() && !`${input.description} ${input.note}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) setQuery(""); };
    if (editing) { const next = expenses.map((expense) => expense.id === editing.id ? { ...expense, ...input, id: expense.id, createdAt: expense.createdAt, updatedAt: now } : expense); if (!commit(next, "Expense updated.")) return false; revealSavedRow(); setEditing(null); return true; }
    const added = commit([{ ...input, id: id(), createdAt: now, updatedAt: now }, ...expenses], "Expense added."); if (added) revealSavedRow(); return added;
  };
  const remove = (expense: Expense) => { if (!window.confirm(`Delete ${expense.description} for ${formatINR(expense.amountPaise)}?`)) return; if (commit(expenses.filter((item) => item.id !== expense.id), "Expense deleted.")) setEditing((current) => current?.id === expense.id ? null : current); };
  const importData = (incoming: Expense[], mode: "merge" | "replace") => {
    if (mode === "replace") { const ok = commit(incoming, `Replaced ${expenses.length} local expenses with ${incoming.length} imported expenses.`); if (ok) setEditing(null); return { ok, message: ok ? `Imported ${incoming.length} expenses.` : "Import could not be saved." }; }
    const report = mergeExpenses(expenses, incoming); const ok = commit(report.expenses, `Import complete: ${report.inserted} added, ${report.updated} updated, ${report.unchanged} unchanged, ${report.conflicts} conflicts kept local.`); if (ok) setEditing(null); return { ok, message: ok ? `Import complete: ${report.inserted} added, ${report.updated} updated, ${report.unchanged} unchanged, ${report.conflicts} conflicts kept local.` : "Import could not be saved." };
  };
  const editExpense = (expense: Expense) => { setEditing(expense); window.requestAnimationFrame(() => { formHeadingRef.current?.scrollIntoView({ behavior: "auto", block: "start" }); formHeadingRef.current?.focus(); }); };

  const filtered = useMemo(() => expenses.filter((expense) => expense.date.startsWith(month)).filter((expense) => category === "all" || expense.category === category).filter((expense) => payment === "all" || expense.paymentMethod === payment).filter((expense) => `${expense.description} ${expense.note}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => { const dateOrder = a.date.localeCompare(b.date) || a.createdAt - b.createdAt; return sort === "newest" ? -dateOrder : dateOrder; }), [expenses, month, category, payment, query, sort]);
  const filteredTotal = safeTotal(filtered) ?? 0; const summary = useMemo(() => summarizeMonth(expenses, month), [expenses, month]);
  const clearFilters = () => { setQuery(""); setCategory("all"); setPayment("all"); setSort("newest"); };
  const activeFilterCount = Number(Boolean(query.trim())) + Number(category !== "all") + Number(payment !== "all") + Number(sort !== "newest");
  const monthPicker = <div className={styles.monthControl}><button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>←</button><strong>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>→</button><button type="button" onClick={() => setMonth(localMonth())}>Current</button></div>;

  return <div className={styles.app} aria-busy={!hydrated}>
    <div className={styles.viewBar}>
      <div className={styles.tabList} role="group" aria-label="Expense view"><button type="button" aria-pressed={tab === "transactions"} onClick={() => setTab("transactions")}>Transactions</button><button type="button" aria-pressed={tab === "summary"} onClick={() => setTab("summary")}>Summary</button></div>
      <div className={styles.dataUtility}><DataDialog expenses={expenses} month={month} onImport={importData} /></div>
    </div>
    {message && <p className={styles.status} role="status">{message}</p>}
    {tab === "transactions" ? <div className={styles.transactionFlow}>
      <ExpenseForm key={editing ? `${editing.id}-${editing.updatedAt}` : "new"} editing={editing} headingRef={formHeadingRef} onSubmit={submit} onCancel={() => setEditing(null)} />
      <section className={styles.listPanel} aria-labelledby="transactions-title">
        <div className={styles.listHeader}><div><p>Selected month</p><h2 id="transactions-title">Recent transactions</h2></div><strong>{filtered.length} results · {formatINR(filteredTotal)}</strong></div>
        <div className={styles.transactionToolbar}>{monthPicker}<details className={styles.filterMenu}><summary>Filters{activeFilterCount ? ` · ${activeFilterCount} active` : ""}</summary><div className={styles.filters}><label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Merchant or note" /></label><label>Category<select value={category} onChange={(e) => setCategory(e.target.value as Category | "all")}><option value="all">All categories</option>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Payment<select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod | "all")}><option value="all">All methods</option>{PAYMENT_METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Sort<select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><button type="button" onClick={clearFilters}>Clear filters</button></div></details></div>
        <ExpenseList expenses={filtered} onEdit={editExpense} onDelete={remove} />
      </section>
    </div> : <div className={styles.summaryView}><div className={styles.summaryHeader}><div><p>Selected month</p><h2>Monthly summary</h2></div>{monthPicker}</div><Summary summary={summary} /></div>}
  </div>;
}
