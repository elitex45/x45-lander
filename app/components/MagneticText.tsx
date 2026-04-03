"use client";

import { useRef, useCallback, useState, useEffect } from "react";

interface MagneticTextProps {
  text: string;
  className?: string;
  strength?: number;
  radius?: number;
}

interface CharOffset {
  x: number;
  y: number;
}

export function MagneticText({
  text,
  className = "",
  strength = 12,
  radius = 120,
}: MagneticTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [offsets, setOffsets] = useState<CharOffset[]>(() =>
    text.split("").map(() => ({ x: 0, y: 0 }))
  );
  const rafRef = useRef(0);
  const targetOffsets = useRef<CharOffset[]>(
    text.split("").map(() => ({ x: 0, y: 0 }))
  );
  const currentOffsets = useRef<CharOffset[]>(
    text.split("").map(() => ({ x: 0, y: 0 }))
  );
  const isHovering = useRef(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const chars = charsRef.current;
      const newTargets = text.split("").map((_, i) => {
        const el = chars[i];
        if (!el) return { x: 0, y: 0 };

        const rect = el.getBoundingClientRect();
        const charCenterX = rect.left + rect.width / 2;
        const charCenterY = rect.top + rect.height / 2;

        const dx = e.clientX - charCenterX;
        const dy = e.clientY - charCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius) return { x: 0, y: 0 };

        // Pull toward cursor, stronger when closer
        const force = (1 - dist / radius) ** 2;
        return {
          x: (dx / dist) * force * strength,
          y: (dy / dist) * force * strength,
        };
      });
      targetOffsets.current = newTargets;
    },
    [text, strength, radius]
  );

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    targetOffsets.current = text.split("").map(() => ({ x: 0, y: 0 }));
  }, [text]);

  const handleMouseEnter = useCallback(() => {
    isHovering.current = true;
  }, []);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      const current = currentOffsets.current;
      const targets = targetOffsets.current;
      let needsUpdate = false;

      const lerp = 0.12;
      const newOffsets = current.map((c, i) => {
        const t = targets[i] || { x: 0, y: 0 };
        const nx = c.x + (t.x - c.x) * lerp;
        const ny = c.y + (t.y - c.y) * lerp;

        if (Math.abs(nx - c.x) > 0.01 || Math.abs(ny - c.y) > 0.01) {
          needsUpdate = true;
        }

        return { x: nx, y: ny };
      });

      if (needsUpdate) {
        currentOffsets.current = newOffsets;
        setOffsets([...newOffsets]);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const chars = text.split("");

  return (
    <span
      ref={containerRef}
      className={`inline-block ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {chars.map((char, i) => (
        <span
          key={`${i}-${char}`}
          ref={(el) => { charsRef.current[i] = el; }}
          className="inline-block transition-colors duration-200"
          style={{
            transform: `translate(${offsets[i]?.x || 0}px, ${offsets[i]?.y || 0}px)`,
            whiteSpace: char === " " ? "pre" : undefined,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
