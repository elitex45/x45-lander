import type { Metadata } from "next";
import { ExpenseTrackerApp } from "./ExpenseTrackerApp";
import styles from "./expense-tracker.module.css";

export const metadata: Metadata = { title: "Expense Tracker — elitex45", description: "A private, local-first INR expense tracker with useful monthly summaries." };
export default function ExpenseTrackerPage() { return <div className={styles.root}><header className={styles.pageHeader}><div><p>Local money tool</p><h1>Know where the month went.</h1></div><p>Track expenses and understand the patterns. Your records are stored only in this browser—no account, server, or sync.</p></header><ExpenseTrackerApp /></div>; }
