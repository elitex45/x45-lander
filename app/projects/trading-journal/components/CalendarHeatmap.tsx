"use client";

import type { CalendarDay } from "../lib/types";
import { formatUsd } from "../lib/compute";

type Props = {
  days: CalendarDay[];
};

export function CalendarHeatmap({ days }: Props) {
  if (days.length === 0) return null;

  const maxAbsPnl = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));

  // Fill in the full range of days
  const first = new Date(days[0].date);
  const last = new Date(days[days.length - 1].date);
  const dayMap = new Map(days.map((d) => [d.date, d]));

  const allDays: (CalendarDay | null)[] = [];
  const cursor = new Date(first);
  // Start from the Sunday of the first week
  cursor.setDate(cursor.getDate() - cursor.getDay());

  while (cursor <= last || allDays.length % 7 !== 0) {
    const key = cursor.toISOString().slice(0, 10);
    allDays.push(dayMap.get(key) ?? null);
    cursor.setDate(cursor.getDate() + 1);
    if (allDays.length > 400) break; // safety
  }

  // Group into weeks
  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]" style={{ minWidth: weeks.length * 14 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              if (!day) {
                return (
                  <div
                    key={di}
                    className="w-3 h-3 rounded-[2px]"
                    style={{ backgroundColor: "var(--border)", opacity: 0.2 }}
                  />
                );
              }
              const intensity = Math.min(1, Math.abs(day.pnl) / maxAbsPnl);
              const alpha = 0.2 + intensity * 0.8;
              const color = day.pnl >= 0 ? `rgba(34,197,94,${alpha})` : `rgba(239,68,68,${alpha})`;
              return (
                <div
                  key={di}
                  className="w-3 h-3 rounded-[2px] cursor-default"
                  style={{ backgroundColor: color }}
                  title={`${day.date}: ${day.trades} trades, ${formatUsd(day.pnl)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[8px] font-mono text-[var(--muted)] mt-2">
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
    </div>
  );
}
