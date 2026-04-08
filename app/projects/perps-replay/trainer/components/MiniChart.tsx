// Pure inline SVG candlestick renderer for the history list and PDF
// export. No lightweight-charts, no canvas — SVG prints to PDF cleanly
// without any screenshot dance, and the bundle stays light.
//
// Renders the labeling window AND the future-reveal bars in one chart
// with a vertical dashed separator marking "this is where the user
// answered." That way each history thumbnail tells the full story:
// "here's what I saw, here's what happened next."

import type { Kline } from "../../lib/kline";

type Props = {
  windowBars: Kline[];
  futureBars: Kline[];
  width?: number;
  height?: number;
};

const CANDLE_UP = "#22c55e";
const CANDLE_DOWN = "#ef4444";

export function MiniChart({
  windowBars,
  futureBars,
  width = 760,
  height = 200,
}: Props) {
  const all = [...windowBars, ...futureBars];
  if (all.length === 0) return null;

  const padding = 6;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const b of all) {
    if (b.low < minPrice) minPrice = b.low;
    if (b.high > maxPrice) maxPrice = b.high;
  }
  const priceRange = maxPrice - minPrice || 1;

  const slot = drawW / all.length;
  const candleWidth = Math.max(1, slot * 0.7);

  const yScale = (price: number): number =>
    padding + drawH - ((price - minPrice) / priceRange) * drawH;

  // Vertical separator: between the last labeling bar and the first
  // reveal bar. Marks "user answered here."
  const splitX =
    futureBars.length > 0
      ? padding + windowBars.length * slot
      : null;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Mini candlestick chart"
    >
      {/* Background tint behind the future-reveal bars so the user can
          see at a glance which side they were predicting from. */}
      {splitX !== null && (
        <rect
          x={splitX}
          y={padding}
          width={width - padding - splitX}
          height={drawH}
          fill="rgba(127, 127, 127, 0.05)"
        />
      )}

      {/* Vertical separator line at "you answered here" */}
      {splitX !== null && (
        <line
          x1={splitX}
          y1={padding}
          x2={splitX}
          y2={height - padding}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.6}
        />
      )}

      {/* Candles */}
      {all.map((b, i) => {
        const x = padding + i * slot + slot / 2;
        const isBull = b.close >= b.open;
        const color = isBull ? CANDLE_UP : CANDLE_DOWN;
        const bodyTop = yScale(Math.max(b.open, b.close));
        const bodyBottom = yScale(Math.min(b.open, b.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={yScale(b.high)}
              x2={x}
              y2={yScale(b.low)}
              stroke={color}
              strokeWidth={1}
            />
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}
