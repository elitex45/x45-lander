// Lightweight drawing primitives. Stored in time + price space (not pixels)
// so they survive zoom, pan, scrub, and timeframe re-projection.
//
// time = UTC seconds (matches lightweight-charts UTCTimestamp)
// price = base asset price

export type DrawingTool = "none" | "trendline" | "hline" | "rect";

export type DrawingPoint = { time: number; price: number };

export type Drawing =
  | { id: string; type: "trendline"; p1: DrawingPoint; p2: DrawingPoint }
  | { id: string; type: "hline"; price: number }
  | { id: string; type: "rect"; p1: DrawingPoint; p2: DrawingPoint };

export function newDrawingId(): string {
  return `dr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
