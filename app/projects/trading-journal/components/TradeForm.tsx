"use client";

import { useState, useCallback, useMemo } from "react";
import type { TradeFormData, ExitReason, Side, Trade } from "../lib/types";
import { PAIRS } from "../lib/pairs";
import { computeTrade, nowDatetimeLocal } from "../lib/compute";
import type { JournalSettings } from "../lib/types";

type Props = {
  settings: JournalSettings;
  onSave: (trade: Trade) => void;
  editingTrade?: Trade | null;
  onCancelEdit?: () => void;
};

const EXIT_REASONS: { value: ExitReason; label: string }[] = [
  { value: "tp-hit", label: "TP Hit" },
  { value: "sl-hit", label: "SL Hit" },
  { value: "manual", label: "Manual Close" },
  { value: "trailing-stop", label: "Trailing Stop" },
  { value: "liquidated", label: "Liquidated" },
  { value: "time-based", label: "Time-based" },
  { value: "other", label: "Other" },
];

function emptyForm(settings: JournalSettings): TradeFormData {
  return {
    pair: PAIRS[0].symbol,
    side: "long",
    leverage: settings.defaultLeverage,
    entryPx: "",
    exitPx: "",
    sl: "",
    tp: "",
    margin: "",
    accountBalance: settings.defaultBalance.toString(),
    exitReason: "manual",
    setup: "",
    notes: "",
    openedAt: nowDatetimeLocal(),
    closedAt: nowDatetimeLocal(),
  };
}

function tradeToForm(trade: Trade): TradeFormData {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const toLocal = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return {
    pair: trade.pair,
    side: trade.side,
    leverage: trade.leverage,
    entryPx: trade.entryPx.toString(),
    exitPx: trade.exitPx.toString(),
    sl: trade.sl?.toString() ?? "",
    tp: trade.tp?.toString() ?? "",
    margin: trade.margin.toString(),
    accountBalance: trade.accountBalance.toString(),
    exitReason: trade.exitReason,
    setup: trade.setup,
    notes: trade.notes,
    openedAt: toLocal(trade.openedAt),
    closedAt: toLocal(trade.closedAt),
  };
}

export function TradeForm({ settings, onSave, editingTrade, onCancelEdit }: Props) {
  const [form, setForm] = useState<TradeFormData>(
    editingTrade ? tradeToForm(editingTrade) : emptyForm(settings)
  );
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof TradeFormData>(key: K, value: TradeFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  // Live preview of PnL and risk
  const preview = useMemo(() => {
    const entry = parseFloat(form.entryPx);
    const exit = parseFloat(form.exitPx);
    const margin = parseFloat(form.margin);
    const sl = form.sl ? parseFloat(form.sl) : null;
    const tp = form.tp ? parseFloat(form.tp) : null;
    const bal = parseFloat(form.accountBalance);

    if (!entry || !margin) return null;

    const sizeUsd = margin * form.leverage;
    const qty = sizeUsd / entry;
    const dir = form.side === "long" ? 1 : -1;

    let pnl: number | null = null;
    if (exit) {
      const rawPnl = qty * (exit - entry) * dir;
      const fees = sizeUsd * settings.takerFee * 2;
      pnl = rawPnl - fees;
    }

    let riskUsd: number | null = null;
    let riskPct: number | null = null;
    if (sl) {
      riskUsd = qty * Math.abs(entry - sl);
      if (bal) riskPct = (riskUsd / bal) * 100;
    }

    let rr: number | null = null;
    if (sl && tp && riskUsd && riskUsd > 0) {
      const reward = qty * Math.abs(tp - entry);
      rr = reward / riskUsd;
    }

    return { sizeUsd, pnl, riskUsd, riskPct, rr };
  }, [form, settings]);

  const handleSubmit = useCallback(() => {
    const result = computeTrade(form, settings.makerFee, settings.takerFee);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // If editing, preserve the original ID
    if (editingTrade) {
      result.id = editingTrade.id;
    }
    onSave(result);
    setForm(emptyForm(settings));
    setError(null);
  }, [form, settings, onSave, editingTrade]);

  return (
    <div className="space-y-4">
      {/* Side Toggle */}
      <div className="flex gap-2">
        {(["long", "short"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => set("side", s)}
            className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-widest rounded-md border transition-all ${
              form.side === s
                ? s === "long"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                  : "bg-red-500/20 border-red-500 text-red-400"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Pair + Setup row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pair">
          <select
            value={form.pair}
            onChange={(e) => set("pair", e.target.value)}
            className="input-field"
          >
            {PAIRS.map((p) => (
              <option key={p.symbol} value={p.symbol}>
                {p.symbol}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Setup">
          <select
            value={form.setup}
            onChange={(e) => set("setup", e.target.value)}
            className="input-field"
          >
            <option value="">-- none --</option>
            {settings.setups.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Leverage slider */}
      <Field label={`Leverage: ${form.leverage}x`}>
        <input
          type="range"
          min={1}
          max={100}
          value={form.leverage}
          onChange={(e) => set("leverage", parseInt(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[9px] font-mono text-[var(--muted)] mt-1">
          <span>1x</span>
          <span>25x</span>
          <span>50x</span>
          <span>100x</span>
        </div>
      </Field>

      {/* Entry / Exit / SL / TP */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Entry Price">
          <input
            type="number"
            step="any"
            value={form.entryPx}
            onChange={(e) => set("entryPx", e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </Field>
        <Field label="Exit Price">
          <input
            type="number"
            step="any"
            value={form.exitPx}
            onChange={(e) => set("exitPx", e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </Field>
        <Field label="Stop Loss">
          <input
            type="number"
            step="any"
            value={form.sl}
            onChange={(e) => set("sl", e.target.value)}
            placeholder="optional"
            className="input-field"
          />
        </Field>
        <Field label="Take Profit">
          <input
            type="number"
            step="any"
            value={form.tp}
            onChange={(e) => set("tp", e.target.value)}
            placeholder="optional"
            className="input-field"
          />
        </Field>
      </div>

      {/* Margin + Balance */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Margin (USDT)">
          <input
            type="number"
            step="any"
            value={form.margin}
            onChange={(e) => set("margin", e.target.value)}
            placeholder="100"
            className="input-field"
          />
        </Field>
        <Field label="Account Balance">
          <input
            type="number"
            step="any"
            value={form.accountBalance}
            onChange={(e) => set("accountBalance", e.target.value)}
            placeholder="1000"
            className="input-field"
          />
        </Field>
      </div>

      {/* Live preview strip */}
      {preview && (
        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
          <PreviewStat label="size" value={`$${preview.sizeUsd.toFixed(0)}`} />
          {preview.pnl !== null && (
            <PreviewStat
              label="est. pnl"
              value={`${preview.pnl >= 0 ? "+" : ""}$${preview.pnl.toFixed(2)}`}
              color={preview.pnl >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          )}
          {preview.riskPct !== null && (
            <PreviewStat label="risk" value={`${preview.riskPct.toFixed(1)}%`} />
          )}
          {preview.rr !== null && (
            <PreviewStat label="r:r" value={`1:${preview.rr.toFixed(1)}`} />
          )}
        </div>
      )}

      {/* Exit reason */}
      <Field label="Exit Reason">
        <div className="flex flex-wrap gap-1.5">
          {EXIT_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => set("exitReason", r.value)}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md border transition-all ${
                form.exitReason === r.value
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Opened At">
          <input
            type="datetime-local"
            value={form.openedAt}
            onChange={(e) => set("openedAt", e.target.value)}
            className="input-field"
          />
        </Field>
        <Field label="Closed At">
          <input
            type="datetime-local"
            value={form.closedAt}
            onChange={(e) => set("closedAt", e.target.value)}
            className="input-field"
          />
        </Field>
      </div>

      {/* Notes */}
      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="What did I learn? What did I do right/wrong?"
          rows={3}
          className="input-field resize-none"
        />
      </Field>

      {error && (
        <p className="text-[10px] font-mono text-red-400">{error}</p>
      )}

      {/* Submit */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 py-2.5 text-xs font-mono uppercase tracking-widest rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
        >
          {editingTrade ? "update trade" : "log trade"}
        </button>
        {editingTrade && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="px-4 py-2.5 text-xs font-mono uppercase tracking-widest rounded-md border border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)] transition-colors"
          >
            cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function PreviewStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="glass-card px-2 py-1.5 text-center">
      <p className="text-[var(--muted)] uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className={`text-sm font-medium tabular-nums ${color ?? "text-[var(--fg)]"}`}>
        {value}
      </p>
    </div>
  );
}
