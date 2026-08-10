import { formatINR, type MonthSummary } from "../lib/model";
import styles from "../expense-tracker.module.css";

export function Summary({ summary }: { summary: MonthSummary }) {
  if (!summary.count) return <div className={styles.emptyState}><strong>No spending this month</strong><p>Add an expense to build the summary.</p></div>;
  const maxDay = Math.max(...summary.daily.map((day) => day.amount), 1);
  const gradient = summary.byCategory.reduce<{ cursor: number; stops: string[] }>((result, item) => { const end = result.cursor + item.amount / summary.total * 100; return { cursor: end, stops: [...result.stops, `${item.color} ${result.cursor}% ${end}%`] }; }, { cursor: 0, stops: [] }).stops.join(",");
  return <div className={styles.summary}>
    <div className={styles.kpis}>
      <article><span>Total</span><strong>{formatINR(summary.total)}</strong></article>
      <article><span>Expenses</span><strong>{summary.count}</strong></article>
      <article><span>Average / day</span><strong>{formatINR(summary.averagePerDay)}</strong></article>
      <article><span>Month over month</span><strong>{summary.changePercent === null ? "No baseline" : `${summary.changePercent >= 0 ? "+" : ""}${summary.changePercent.toFixed(1)}%`}</strong></article>
      <article><span>Largest expense</span><strong>{summary.largest ? formatINR(summary.largest.amountPaise) : "—"}</strong></article>
    </div>
    <div className={styles.summaryGrid}>
      <section className={styles.summaryCard}><h3>By category</h3><div className={styles.donutWrap}><div className={styles.donut} style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label="Category spending share" /><strong>{formatINR(summary.total)}</strong></div><ul className={styles.legend}>{summary.byCategory.map((item) => <li key={item.id}><i style={{ background: item.color }} /><span>{item.emoji} {item.label}</span><strong>{formatINR(item.amount)} · {(item.amount / summary.total * 100).toFixed(1)}%</strong></li>)}</ul></section>
      <section className={styles.summaryCard}><h3>Daily spending</h3><div className={styles.barChart} aria-hidden="true">{summary.daily.map((day) => <div key={day.day}><i style={{ height: `${Math.max(day.amount ? 4 : 0, day.amount / maxDay * 100)}%` }} /><span>{day.day % 5 === 1 ? day.day : ""}</span></div>)}</div><details className={styles.dailyTotals}><summary>Daily totals ({summary.daily.filter((day) => day.amount > 0).length})</summary><ul>{summary.daily.filter((day) => day.amount > 0).map((day) => { const date = `${summary.month}-${String(day.day).padStart(2, "0")}`; return <li key={day.day}><span>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</span><strong>{formatINR(day.amount)}</strong></li>; })}</ul></details></section>
      <section className={styles.summaryCard}><h3>Useful signals</h3><dl className={styles.signals}><div><dt>Highest-spend day</dt><dd>{summary.highestDay ? `${summary.highestDay.day} · ${formatINR(summary.highestDay.amount)}` : "—"}</dd></div><div><dt>No-spend days</dt><dd>{summary.noSpendDays}</dd></div><div><dt>Top categories</dt><dd>{summary.byCategory.slice(0, 3).map((item) => item.label).join(", ")}</dd></div></dl></section>
      <section className={styles.summaryCard}><h3>Payment methods</h3><ul className={styles.breakdown}>{summary.byPayment.map((item) => <li key={item.id}><span>{item.label}</span><strong>{formatINR(item.amount)}</strong></li>)}</ul><h3 className={styles.subheading}>Top merchants</h3><ul className={styles.breakdown}>{summary.topMerchants.map((item) => <li key={item.label}><span>{item.label}</span><strong>{formatINR(item.amount)}</strong></li>)}</ul></section>
    </div>
  </div>;
}
