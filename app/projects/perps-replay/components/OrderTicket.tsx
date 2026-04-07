"use client";

import { useMemo, useState } from "react";
import type { ReplayHook } from "../hooks/useReplayEngine";
import type { OrderType, Side } from "../lib/engine";
import { selectAccountStats } from "../lib/engine";
import { getSymbolMeta } from "../lib/symbols";

export function OrderTicket({ engine }: { engine: ReplayHook }) {
  const { state, place } = engine;
  const meta = getSymbolMeta(state.symbol);
  const stats = useMemo(() => selectAccountStats(state), [state]);

  const [side, setSide] = useState<Side>("long");
  const [type, setType] = useState<OrderType>("market");
  const [notional, setNotional] = useState<string>("100");
  const [leverage, setLeverage] = useState<number>(10);
  const [triggerPx, setTriggerPx] = useState<string>("");
  const [tp, setTp] = useState<string>("");
  const [sl, setSl] = useState<string>("");

  if (!meta) return null;
  const mark = stats.mark;

  const notionalNum = Number(notional);
  const triggerNum = Number(triggerPx);
  const fillPx = type === "market" ? mark : triggerNum;
  const sizeBase =
    fillPx > 0 && notionalNum > 0 ? notionalNum / fillPx : 0;
  const marginNeeded = leverage > 0 ? notionalNum / leverage : Infinity;
  const enoughMargin = marginNeeded <= stats.freeMargin && notionalNum > 0;
  const validTrigger =
    type === "market" || (triggerNum > 0 && Number.isFinite(triggerNum));

  const canSubmit =
    state.bars.length > 0 &&
    notionalNum > 0 &&
    sizeBase > 0 &&
    enoughMargin &&
    validTrigger;

  const submit = () => {
    if (!canSubmit) return;
    place({
      side,
      type,
      size: sizeBase,
      triggerPx: type === "market" ? undefined : triggerNum,
      leverage,
    });
    // Then attach TP/SL as reduceOnly orders against the (now-likely-open) position.
    // Note: for limit/stop, the parent doesn't exist yet — TP/SL still placed,
    // they'll fire only after the parent fills. Simple model.
    if (tp) {
      const tpNum = Number(tp);
      if (Number.isFinite(tpNum) && tpNum > 0) {
        place({
          side: side === "long" ? "short" : "long",
          type: "tp",
          size: sizeBase,
          triggerPx: tpNum,
          leverage,
          reduceOnly: true,
        });
      }
    }
    if (sl) {
      const slNum = Number(sl);
      if (Number.isFinite(slNum) && slNum > 0) {
        place({
          side: side === "long" ? "short" : "long",
          type: "sl",
          size: sizeBase,
          triggerPx: slNum,
          leverage,
          reduceOnly: true,
        });
      }
    }
  };

  return (
    <div className="glass-card p-4 space-y-3 text-xs font-mono">
      <div className="text-[var(--muted)] uppercase tracking-wider">order ticket</div>

      {/* side */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("long")}
          className={`py-2 rounded border transition ${
            side === "long"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          LONG
        </button>
        <button
          onClick={() => setSide("short")}
          className={`py-2 rounded border transition ${
            side === "short"
              ? "border-[var(--purple)] text-[var(--purple)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
          style={
            side === "short"
              ? { backgroundColor: "rgba(168,85,247,0.1)" }
              : undefined
          }
        >
          SHORT
        </button>
      </div>

      {/* type */}
      <div className="flex gap-1">
        {(["market", "limit", "stop"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-1 rounded border transition uppercase ${
              type === t
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {type !== "market" && (
        <label className="block">
          <span className="text-[var(--muted)] uppercase tracking-wider text-[10px]">
            trigger px
          </span>
          <input
            value={triggerPx}
            onChange={(e) => setTriggerPx(e.target.value)}
            placeholder={mark ? mark.toFixed(meta.pricePrecision) : ""}
            inputMode="decimal"
            className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1.5 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          />
        </label>
      )}

      <label className="block">
        <span className="text-[var(--muted)] uppercase tracking-wider text-[10px]">
          notional (USDT)
        </span>
        <input
          value={notional}
          onChange={(e) => setNotional(e.target.value)}
          inputMode="decimal"
          className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1.5 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="block">
        <div className="flex justify-between">
          <span className="text-[var(--muted)] uppercase tracking-wider text-[10px]">
            leverage
          </span>
          <span className="text-[var(--accent)]">{leverage}×</span>
        </div>
        <input
          type="range"
          min={1}
          max={meta.maxLeverage}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[var(--muted)] uppercase tracking-wider text-[10px]">
            tp
          </span>
          <input
            value={tp}
            onChange={(e) => setTp(e.target.value)}
            inputMode="decimal"
            className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-[var(--muted)] uppercase tracking-wider text-[10px]">
            sl
          </span>
          <input
            value={sl}
            onChange={(e) => setSl(e.target.value)}
            inputMode="decimal"
            className="w-full bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--muted)]">
        <div>
          size: <span className="text-[var(--fg)]">{sizeBase.toFixed(meta.qtyPrecision)}</span>
        </div>
        <div>
          margin: <span className="text-[var(--fg)]">{marginNeeded.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full py-2 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] transition disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
      >
        place {type} {side}
      </button>

      {!enoughMargin && notionalNum > 0 && (
        <div className="text-[10px] text-[#ef4444]">insufficient free margin</div>
      )}
    </div>
  );
}
