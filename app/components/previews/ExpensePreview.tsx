// Sample month, not real spending. The bars are computed from these rows.
const SAMPLE = [
  { category: "Rent", amount: 12000 },
  { category: "Food", amount: 3840 },
  { category: "Transit", amount: 1120 },
  { category: "Coffee", amount: 610 },
  { category: "Books", amount: 899 },
];

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** A real breakdown chart computed from sample rows. */
export function ExpensePreview() {
  const total = SAMPLE.reduce((sum, r) => sum + r.amount, 0);
  const max = Math.max(...SAMPLE.map((r) => r.amount));

  return (
    <div className="flex h-full flex-col justify-between gap-4 px-5 py-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] text-[var(--muted)]">Sample month</p>
          <p className="font-mono text-xl font-semibold tabular-nums tracking-tight text-[var(--fg)]">
            {inr.format(total)}
          </p>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          {SAMPLE.length} categories
        </p>
      </div>

      <ul
        className="grid grid-cols-5 items-end gap-2"
        aria-label="Spending by category"
      >
        {SAMPLE.map((row) => {
          const pct = Math.max(8, Math.round((row.amount / max) * 100));
          return (
            <li key={row.category} className="flex flex-col items-center gap-1.5">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-[var(--accent)]"
                  style={{
                    height: `${pct}%`,
                    opacity: row.amount === max ? 1 : 0.55,
                  }}
                  title={`${row.category}: ${inr.format(row.amount)}`}
                />
              </div>
              <span className="text-[10px] text-[var(--muted)]">
                {row.category}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
