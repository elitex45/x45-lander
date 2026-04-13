import type { Trade, TradeFormData, Side } from "./types";

export function computeTrade(
  form: TradeFormData,
  makerFee: number,
  takerFee: number
): Trade | { error: string } {
  const entryPx = parseFloat(form.entryPx);
  const exitPx = parseFloat(form.exitPx);
  const margin = parseFloat(form.margin);
  const accountBalance = parseFloat(form.accountBalance);
  const sl = form.sl ? parseFloat(form.sl) : null;
  const tp = form.tp ? parseFloat(form.tp) : null;

  if (!entryPx || entryPx <= 0) return { error: "Invalid entry price" };
  if (!exitPx || exitPx <= 0) return { error: "Invalid exit price" };
  if (!margin || margin <= 0) return { error: "Invalid margin" };
  if (!accountBalance || accountBalance <= 0) return { error: "Invalid account balance" };
  if (!form.openedAt) return { error: "Missing open time" };
  if (!form.closedAt) return { error: "Missing close time" };

  const sizeUsd = margin * form.leverage;
  const qty = sizeUsd / entryPx; // base asset units

  // Fees: entry is taker (market), exit depends on exit reason
  const entryFee = sizeUsd * takerFee;
  const exitFee = sizeUsd * (form.exitReason === "tp-hit" ? makerFee : takerFee);
  const fees = entryFee + exitFee;

  // Raw PnL before fees
  const direction = form.side === "long" ? 1 : -1;
  const rawPnl = qty * (exitPx - entryPx) * direction;
  const pnl = rawPnl - fees;
  const pnlPct = (pnl / margin) * 100;

  // Risk (SL-based)
  let riskUsd = margin; // worst case = full margin if no SL
  if (sl !== null) {
    const slDist = Math.abs(entryPx - sl);
    riskUsd = qty * slDist;
  }
  const riskPct = (riskUsd / accountBalance) * 100;

  // R:R
  let rr: number | null = null;
  if (sl !== null && riskUsd > 0) {
    rr = Math.abs(pnl) / riskUsd;
    if (pnl < 0) rr = -rr;
  }

  // Result
  let result: Trade["result"] = "breakeven";
  if (pnl > 0.01) result = "win";
  else if (pnl < -0.01) result = "loss";

  return {
    id: crypto.randomUUID(),
    pair: form.pair,
    side: form.side,
    leverage: form.leverage,
    entryPx,
    exitPx,
    sl,
    tp,
    sizeUsd,
    margin,
    accountBalance,
    riskUsd,
    riskPct,
    rr,
    pnl,
    pnlPct,
    fees,
    result,
    exitReason: form.exitReason,
    setup: form.setup,
    notes: form.notes,
    openedAt: new Date(form.openedAt).getTime(),
    closedAt: new Date(form.closedAt).getTime(),
  };
}

export function formatUsd(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatPx(n: number, precision: number = 2): string {
  return n.toFixed(precision);
}

export function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowDatetimeLocal(): string {
  return toDatetimeLocal(Date.now());
}
