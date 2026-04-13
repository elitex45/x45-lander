"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { TradingEngine } from "../lib/engineTypes";
import type { PlacementMode } from "./LiveChart";
import {
  type Side,
  type OrderType,
  computeOrderSize,
  calcLiquidationPx,
  getSymbolMeta,
} from "../lib/liveEngine";

type Props = {
  engine: TradingEngine;
  tpPrice: number | null;
  slPrice: number | null;
  placementMode: PlacementMode;
  onSetPlacementMode: (mode: PlacementMode) => void;
  onSetTp: (price: number | null) => void;
  onSetSl: (price: number | null) => void;
  defaultLeverage: number;
};

export function LiveOrderTicket({
  engine,
  tpPrice,
  slPrice,
  placementMode,
  onSetPlacementMode,
  onSetTp,
  onSetSl,
  defaultLeverage,
}: Props) {
  const { state, place } = engine;
  const stats = engine.selectAccountStats();
  const meta = getSymbolMeta(state.symbol);
  const mark = stats.mark;
  const prec = meta?.pricePrecision ?? 2;

  const [side, setSide] = useState<Side>("long");
  const [type, setType] = useState<OrderType>("market");
  const [margin, setMargin] = useState("100");
  const [leverage, setLeverage] = useState(defaultLeverage);
  const prevDefaultLev = useRef(defaultLeverage);
  useEffect(() => {
    if (prevDefaultLev.current !== defaultLeverage) {
      setLeverage(defaultLeverage);
      prevDefaultLev.current = defaultLeverage;
    }
  }, [defaultLeverage]);
  const [triggerPx, setTriggerPx] = useState("");

  const fillPx = type === "market" ? mark : parseFloat(triggerPx) || 0;
  const marginNum = parseFloat(margin) || 0;
  const maxLev = meta?.maxLeverage ?? 100;

  const preview = useMemo(() => {
    if (!fillPx || !marginNum) return null;
    const { exposure, size } = computeOrderSize(marginNum, leverage, fillPx);
    const liqPx = meta ? calcLiquidationPx(side, fillPx, leverage, meta.mmr) : 0;

    // Compute R:R if both TP and SL are set
    let rr: number | null = null;
    if (tpPrice && slPrice) {
      const reward = Math.abs(tpPrice - fillPx);
      const risk = Math.abs(fillPx - slPrice);
      if (risk > 0) rr = reward / risk;
    }

    // Compute estimated PnL at TP
    let estPnl: number | null = null;
    if (tpPrice) {
      const dir = side === "long" ? 1 : -1;
      estPnl = size * (tpPrice - fillPx) * dir;
    }

    // Compute risk amount at SL
    let riskUsd: number | null = null;
    if (slPrice) {
      riskUsd = size * Math.abs(fillPx - slPrice);
    }

    return { exposure, size, liqPx, rr, estPnl, riskUsd };
  }, [fillPx, marginNum, leverage, side, meta, tpPrice, slPrice]);

  const canSubmit = useMemo(() => {
    if (!marginNum || marginNum <= 0) return false;
    if (marginNum > stats.freeMargin) return false;
    if (type !== "market" && (!fillPx || fillPx <= 0)) return false;
    return true;
  }, [marginNum, stats.freeMargin, type, fillPx]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !preview) return;
    place({
      side,
      type,
      size: preview.size,
      triggerPx: type !== "market" ? fillPx : undefined,
      leverage,
      tp: tpPrice ?? undefined,
      sl: slPrice ?? undefined,
    });
    setTriggerPx("");
    onSetTp(null);
    onSetSl(null);
    onSetPlacementMode("none");
  }, [canSubmit, preview, place, side, type, fillPx, leverage, tpPrice, slPrice, onSetTp, onSetSl, onSetPlacementMode]);

  return (
    <div className="glass-card p-4 space-y-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-1">
        &gt; order
      </p>

      {/* Side */}
      <div className="flex gap-2">
        {(["long", "short"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-md border transition-all ${
              side === s
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

      {/* Type */}
      <div className="flex gap-1">
        {(["market", "limit", "stop"] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest rounded-md border transition-all ${
              type === t
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Trigger price */}
      {type !== "market" && (
        <div>
          <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
            {type} price
          </label>
          <input
            type="number"
            step="any"
            value={triggerPx}
            onChange={(e) => setTriggerPx(e.target.value)}
            placeholder={mark.toFixed(prec)}
            className="input-field text-xs"
          />
        </div>
      )}

      {/* Margin */}
      <div>
        <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
          margin (usdt)
        </label>
        <input
          type="number"
          step="any"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          placeholder="100"
          className="input-field text-xs"
        />
      </div>

      {/* Leverage */}
      <div>
        <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
          leverage: {leverage}x
        </label>
        <input
          type="range"
          min={1}
          max={maxLev}
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      {/* TP/SL — chart placement buttons */}
      <div>
        <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1.5">
          tp / sl (click chart to place)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {/* TP button */}
          <button
            onClick={() =>
              onSetPlacementMode(placementMode === "tp" ? "none" : "tp")
            }
            className={`py-2 text-[9px] font-mono uppercase tracking-widest rounded-md border transition-all ${
              placementMode === "tp"
                ? "border-cyan-500 text-cyan-400 bg-cyan-500/15 animate-pulse"
                : tpPrice
                  ? "border-cyan-500/50 text-cyan-400"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-cyan-500 hover:text-cyan-400"
            }`}
          >
            {tpPrice ? `TP $${tpPrice.toFixed(prec)}` : "set tp"}
          </button>

          {/* SL button */}
          <button
            onClick={() =>
              onSetPlacementMode(placementMode === "sl" ? "none" : "sl")
            }
            className={`py-2 text-[9px] font-mono uppercase tracking-widest rounded-md border transition-all ${
              placementMode === "sl"
                ? "border-red-500 text-red-400 bg-red-500/15 animate-pulse"
                : slPrice
                  ? "border-red-500/50 text-red-400"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-red-500 hover:text-red-400"
            }`}
          >
            {slPrice ? `SL $${slPrice.toFixed(prec)}` : "set sl"}
          </button>
        </div>

        {/* Clear buttons */}
        {(tpPrice || slPrice) && (
          <div className="flex gap-2 mt-1">
            {tpPrice && (
              <button
                onClick={() => onSetTp(null)}
                className="text-[8px] font-mono text-[var(--muted)] hover:text-cyan-400 transition-colors"
              >
                clear tp
              </button>
            )}
            {slPrice && (
              <button
                onClick={() => onSetSl(null)}
                className="text-[8px] font-mono text-[var(--muted)] hover:text-red-400 transition-colors"
              >
                clear sl
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
          <div className="text-[var(--muted)]">
            size <span className="text-[var(--fg)]">{preview.size.toFixed(4)}</span>
          </div>
          <div className="text-[var(--muted)]">
            exposure <span className="text-[var(--fg)]">${preview.exposure.toFixed(0)}</span>
          </div>
          <div className="text-[var(--muted)]">
            fill <span className="text-[var(--fg)]">${fillPx.toFixed(prec)}</span>
          </div>
          <div className="text-[var(--muted)]">
            liq <span className="text-red-400">${preview.liqPx.toFixed(prec)}</span>
          </div>
          {preview.rr !== null && (
            <div className="text-[var(--muted)]">
              r:r <span className="text-[var(--fg)]">1:{preview.rr.toFixed(1)}</span>
            </div>
          )}
          {preview.estPnl !== null && (
            <div className="text-[var(--muted)]">
              est pnl{" "}
              <span className={preview.estPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                {preview.estPnl >= 0 ? "+" : ""}${preview.estPnl.toFixed(2)}
              </span>
            </div>
          )}
          {preview.riskUsd !== null && (
            <div className="text-[var(--muted)] col-span-2">
              risk <span className="text-red-400">${preview.riskUsd.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-2.5 text-[10px] font-mono uppercase tracking-widest rounded-md border transition-all ${
          side === "long"
            ? "border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
            : "border-red-500 text-red-400 hover:bg-red-500/20"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {side === "long" ? "buy / long" : "sell / short"}
      </button>
      {marginNum > stats.freeMargin && marginNum > 0 && (
        <p className="text-[9px] font-mono text-red-400">insufficient free margin</p>
      )}
    </div>
  );
}
