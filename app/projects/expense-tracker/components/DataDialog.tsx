"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { exportCSV, exportJSON } from "../lib/storage";
import { formatINR, parseBackup, safeTotal, type Expense } from "../lib/model";
import styles from "../expense-tracker.module.css";

type Mode = "merge" | "replace";
type Props = { expenses: Expense[]; month: string; onImport: (incoming: Expense[], mode: Mode) => { ok: boolean; message: string } };

export function DataDialog({ expenses, month, onImport }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null); const inputRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Expense[] | null>(null); const [mode, setMode] = useState<Mode>("merge");
  const [message, setMessage] = useState("");
  const close = () => dialogRef.current?.close();
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; setIncoming(null); setMessage(""); if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMessage("The JSON backup must be 5 MB or smaller."); return; }
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) { setMessage(parsed.errors.join(" ")); return; }
    setIncoming(parsed.backup.expenses);
  };
  const apply = () => {
    if (!incoming) return;
    if (mode === "replace" && !window.confirm(`Replace ${expenses.length} local expenses with ${incoming.length} imported expenses?`)) return;
    const result = onImport(incoming, mode); setMessage(result.message);
    if (result.ok) { setIncoming(null); if (inputRef.current) inputRef.current.value = ""; }
  };
  const range = incoming?.length ? [...incoming].sort((a, b) => a.date.localeCompare(b.date)) : [];
  return <>
    <button className={styles.dataTrigger} type="button" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>Import / Export</button>
    <dialog ref={dialogRef} className={styles.dataDialog} aria-labelledby="data-dialog-title" onCancel={close}>
      <div className={styles.dialogHeader}><div><p>Local data</p><h2 id="data-dialog-title">Import / Export</h2></div><button className={styles.dialogClose} type="button" onClick={close}>Close</button></div>
      <section className={styles.exportSection}><div className={styles.sectionLead}><span aria-hidden="true">↗</span><div><p>Backup</p><h3>Export your records</h3></div></div><p>Download a lossless JSON backup, or a CSV of the selected month.</p><div className={styles.dialogActions}><button className={styles.exportButton} type="button" onClick={() => exportJSON(expenses)}>Export JSON</button><button className={styles.exportButton} type="button" onClick={() => exportCSV(expenses, month)}>Export {month} CSV</button></div></section>
      <section className={styles.importSection}><div className={styles.sectionLead}><span aria-hidden="true">↙</span><div><p>Restore</p><h3>Import JSON backup</h3></div></div><p>Files are fully validated before any local data changes.</p><label className={`${styles.fileLabel} ${styles.importFile}`}>Choose JSON file<input ref={inputRef} type="file" accept="application/json,.json" onChange={readFile} /></label>
        {incoming && <div className={styles.importPreview}><strong>{incoming.length} accepted expenses</strong><span>{formatINR(safeTotal(incoming) ?? 0)}</span><span>{range[0]?.date} to {range.at(-1)?.date}</span><fieldset><legend>Import mode</legend><label><input type="radio" name="import-mode" checked={mode === "merge"} onChange={() => setMode("merge")} /> Merge by ID</label><label><input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace all local data</label></fieldset><button className={styles.importButton} type="button" onClick={apply}>{mode === "merge" ? "Merge import" : "Replace data"}</button></div>}
        {message && <p className={styles.dialogMessage} role="status">{message}</p>}
      </section>
      <p className={styles.privacyWarning}><strong>Stored only in this browser.</strong> Browser data can be cleared by you, the browser, or the device. Export regular JSON backups.</p>
    </dialog>
  </>;
}
