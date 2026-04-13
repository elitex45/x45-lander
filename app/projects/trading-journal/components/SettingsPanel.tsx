"use client";

import { useState, useCallback } from "react";
import type { JournalSettings } from "../lib/types";
import { DEFAULT_SETUPS } from "../lib/pairs";

type Props = {
  settings: JournalSettings;
  onChange: (settings: JournalSettings) => void;
};

export function SettingsPanel({ settings, onChange }: Props) {
  const [newSetup, setNewSetup] = useState("");

  const set = useCallback(
    <K extends keyof JournalSettings>(key: K, value: JournalSettings[K]) => {
      onChange({ ...settings, [key]: value });
    },
    [settings, onChange]
  );

  const addSetup = useCallback(() => {
    const trimmed = newSetup.trim();
    if (!trimmed || settings.setups.includes(trimmed)) return;
    onChange({ ...settings, setups: [...settings.setups, trimmed] });
    setNewSetup("");
  }, [newSetup, settings, onChange]);

  const removeSetup = useCallback(
    (setup: string) => {
      onChange({ ...settings, setups: settings.setups.filter((s) => s !== setup) });
    },
    [settings, onChange]
  );

  const resetSetups = useCallback(() => {
    onChange({ ...settings, setups: [...DEFAULT_SETUPS] });
  }, [settings, onChange]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-4">
          &gt; defaults
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1.5">
              Default Balance (USDT)
            </label>
            <input
              type="number"
              value={settings.defaultBalance}
              onChange={(e) => set("defaultBalance", parseFloat(e.target.value) || 1000)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1.5">
              Default Leverage
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.defaultLeverage}
              onChange={(e) => set("defaultLeverage", parseInt(e.target.value) || 10)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1.5">
              Maker Fee
            </label>
            <input
              type="text"
              value={`${(settings.makerFee * 100).toFixed(3)}%`}
              disabled
              className="input-field opacity-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1.5">
              Taker Fee
            </label>
            <input
              type="text"
              value={`${(settings.takerFee * 100).toFixed(3)}%`}
              disabled
              className="input-field opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-4">
          &gt; setup tags
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {settings.setups.map((s) => (
            <span
              key={s}
              className="text-[10px] font-mono px-2 py-1 rounded-md border border-[var(--border)] text-[var(--fg)] flex items-center gap-1.5 group"
            >
              {s}
              <button
                onClick={() => removeSetup(s)}
                className="text-[var(--muted)] hover:text-red-400 transition-colors"
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSetup}
            onChange={(e) => setNewSetup(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSetup()}
            placeholder="Add custom setup..."
            className="input-field flex-1"
          />
          <button
            onClick={addSetup}
            disabled={!newSetup.trim()}
            className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-50 transition-colors"
          >
            add
          </button>
        </div>
        <button
          onClick={resetSetups}
          className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--fg)] mt-2 transition-colors"
        >
          reset to defaults
        </button>
      </div>

      <div className="glass-card p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-red-400/70 mb-3">
          &gt; danger zone
        </p>
        <button
          onClick={() => {
            if (window.confirm("Delete ALL trades? This cannot be undone.")) {
              localStorage.removeItem("x45.trading-journal.v1.trades");
              window.location.reload();
            }
          }}
          className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-red-500/30 text-red-400/70 hover:text-red-400 hover:border-red-500 transition-colors"
        >
          clear all trades
        </button>
      </div>
    </div>
  );
}
