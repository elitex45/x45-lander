import { describe, expect, it } from "vitest";
import {
  defaultMonthRange,
  monthsBetween,
} from "@/app/projects/perps-replay/lib/kline";

describe("monthsBetween", () => {
  it("single month → just that month", () => {
    expect(monthsBetween("2024-03", "2024-03")).toEqual(["2024-03"]);
  });

  it("consecutive months", () => {
    expect(monthsBetween("2024-01", "2024-03")).toEqual([
      "2024-01",
      "2024-02",
      "2024-03",
    ]);
  });

  it("crosses year boundary", () => {
    expect(monthsBetween("2023-11", "2024-02")).toEqual([
      "2023-11",
      "2023-12",
      "2024-01",
      "2024-02",
    ]);
  });

  it("crosses multiple year boundaries", () => {
    const result = monthsBetween("2022-12", "2024-01");
    expect(result).toHaveLength(14);
    expect(result[0]).toBe("2022-12");
    expect(result[1]).toBe("2023-01");
    expect(result[12]).toBe("2023-12");
    expect(result[13]).toBe("2024-01");
  });

  it("zero-pads month numbers", () => {
    const result = monthsBetween("2024-09", "2024-12");
    expect(result).toEqual(["2024-09", "2024-10", "2024-11", "2024-12"]);
  });
});

describe("defaultMonthRange", () => {
  it("returns N closed months ending at last month", () => {
    const r = defaultMonthRange(3);
    // Both should be valid YYYY-MM strings
    expect(r.from).toMatch(/^\d{4}-\d{2}$/);
    expect(r.to).toMatch(/^\d{4}-\d{2}$/);
    // The range should span exactly 3 months
    expect(monthsBetween(r.from, r.to)).toHaveLength(3);
  });

  it("the `to` month is strictly before the current month (UTC)", () => {
    const r = defaultMonthRange(1);
    const now = new Date();
    const currentYM = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    expect(r.to).not.toBe(currentYM);
    // and `to` should be lexicographically less than current
    expect(r.to < currentYM).toBe(true);
  });

  it("monthsBack=1 returns a single-month range", () => {
    const r = defaultMonthRange(1);
    expect(r.from).toBe(r.to);
  });

  it("monthsBack=12 returns a year-long range", () => {
    const r = defaultMonthRange(12);
    expect(monthsBetween(r.from, r.to)).toHaveLength(12);
  });
});
