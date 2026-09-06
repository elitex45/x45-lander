import type { Metadata } from "next";
import { toolBySlug, toolMetadata } from "../../lib/seo";
import { ToolSeo } from "../../components/ToolSeo";
import { ExpenseTrackerApp } from "./ExpenseTrackerApp";
import styles from "./expense-tracker.module.css";

export const metadata: Metadata = toolMetadata(toolBySlug("expense-tracker")!, "/projects/expense-tracker");
export default function ExpenseTrackerPage() { return <div className={styles.root}><header className={styles.pageHeader}><div><p>Local money tool</p><h1>Know where the month went.</h1></div><p>Track expenses and understand the patterns. Your records are stored only in this browser—no account, server, or sync.</p></header><ExpenseTrackerApp /><ToolSeo slug="expense-tracker" path="/projects/expense-tracker" /></div>; }
