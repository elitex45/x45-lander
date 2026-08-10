"use client";

import { useState, type FormEvent, type RefObject } from "react";
import { CATEGORIES, PAYMENT_METHODS, isValidDate, localDate, paiseToDecimal, parseAmountToPaise, type Category, type Expense, type PaymentMethod } from "../lib/model";
import styles from "../expense-tracker.module.css";

export type ExpenseInput = Pick<Expense, "amountPaise" | "date" | "category" | "description" | "paymentMethod" | "note">;
type Props = { editing: Expense | null; headingRef: RefObject<HTMLHeadingElement | null>; onSubmit: (input: ExpenseInput) => boolean; onCancel: () => void };

export function ExpenseForm({ editing, headingRef, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(editing ? paiseToDecimal(editing.amountPaise) : "");
  const [date, setDate] = useState(editing?.date ?? localDate());
  const [category, setCategory] = useState<Category>(editing?.category ?? "food-dining");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "upi");
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amountPaise = parseAmountToPaise(amount);
    if (!amountPaise) { setError("Enter a positive amount with at most two decimal places."); return; }
    if (!isValidDate(date)) { setError("Choose a valid local date."); return; }
    if (date > localDate()) { setError("Future expense dates are not allowed."); return; }
    if (!description.trim()) { setError("Add a merchant or description."); return; }
    if (!onSubmit({ amountPaise, date, category, description: description.trim(), paymentMethod, note: note.trim() })) return;
    setAmount(""); setDescription(""); setNote(""); setError("");
  };
  const cancel = () => { setAmount(""); setDescription(""); setNote(""); setError(""); onCancel(); };

  return (
    <section className={styles.formPanel} aria-labelledby="expense-form-title">
      <div className={styles.panelTitle}><div><p>{editing ? "Update record" : "New record"}</p><h2 ref={headingRef} tabIndex={-1} id="expense-form-title">{editing ? "Edit expense" : "Add expense"}</h2></div>{editing && <button type="button" onClick={cancel}>Cancel</button>}</div>
      <form onSubmit={submit}>
        <label>Merchant or description<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} placeholder="Lunch, metro, rent…" autoFocus={!editing} required /></label>
        <label>Amount (₹)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required /></label>
        <label>Date<input type="date" max={localDate()} value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label>Category<select value={category} onChange={(e) => setCategory(e.target.value as Category)}>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.emoji} {item.label}</option>)}</select></label>
        <label>Payment method<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>Note <span>optional</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Anything useful later" /></label>
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <button className={styles.primaryButton} type="submit">{editing ? "Save changes" : "Add expense"}</button>
      </form>
    </section>
  );
}
